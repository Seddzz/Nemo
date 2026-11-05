# NER Detector — Limitations & Analysis

Notes on the transformer-based detector in `src/anonymizer/detectors/ner.py`.
This documents what the model does well, where it breaks, and the trade-offs we
accepted for the first multilingual (FR/EN) version — plus what we deliberately defer.

---

## 1. What we use

| Item | Value |
| --- | --- |
| Model | `OpenMed/privacy-filter-multilingual-v2` |
| Parameters | ~1.4B |
| Output labels | 217 BIOES labels (`B-`, `I-`, `E-`, `S-`) |
| Mapped to | `PERSON`, `ADDRESS`, `ZIP`, `CARD`, `IBAN`, `EMAIL`, `PHONE`, `DATE`, `ORGANIZATION`, … |
| Aggregation | Custom BIOES decoder + snap + merge (not `pipeline(..., aggregation_strategy=...)`) |
| Chunking | 512-token windows with 64-token overlap |
| Second pass | Title-cased text pass to recover lowercase names |
| Confidence filter | `min_score = 0.5` (default) |
| Source tag | `"ner"` on every `Entity` |
| Cache | `.hf-cache/` (project-local; ignored by git) |

The model is public (Apache-2.0), so no Hugging Face token is required. The first
run downloads ~2.8 GB. It is wrapped behind the project-wide `Detector` protocol
(`detect(text) -> list[Entity]`) alongside the regex, checksum and context
detectors.

`openmed.extract_pii` is not used: its span offsets are broken. The decoder here
works directly on token offsets and was validated against the reference notebook.

---

## 2. Why the custom decoder

The tokenizer splits names into sub-words (`Sal` / `ma`, `ĠBen` / `j` / `ell` /
`oun`) and the model emits BIOES tags per sub-word. A naive `aggregation_strategy`
misses or truncates spans. The decoder:

1. decodes BIOES transitions and rejects invalid transitions,
2. snaps partial spans to word boundaries,
3. merges adjacent same-label spans,
4. title-cases the second-pass text while preserving character length,
5. drops titles (`Mme`, `Dr`, `M.`, …) instead of replacing them,
6. canonicalizes labels (`FIRSTNAME`/`LASTNAME`/`MIDDLENAME`/`PREFIX` → `PERSON`,
   `STREET`/`BUILDINGNUMBER`/`SECONDARYADDRESS`/`COUNTY` → `ADDRESS`,
   `ZIPCODE` → `ZIP`, `CREDITCARD` → `CARD`, `MASKEDNUMBER` → `ID`, …).

Merged spans track the maximum sub-span score. This matters: a `PERSON` built
from `FIRSTNAME` + `LASTNAME` previously ended up with score `0.0` and was
silently dropped by the threshold.

---

## 3. Primary limitations

1. **Lowercase names.** The model is case-sensitive enough that lowercase names
   are weak. The second pass title-cases the text and merges recovered spans; it
   improves recall (`karim el amrani` → `PERSON`, score ~0.82) but is not a
   guarantee.
2. **Model quirks on Moroccan/French text.** Known misses or splits:
   - `Atlas Conseil SARL` is not detected by NER (the context/organization regex
     covers labelled organizations).
   - `quartier Al Qods` is split into low-score fragments (`Al`, `Q`, `ods`); the
     neighbourhood context regex covers `quartier …`.
   - `12 rue Hassan II` is only partially detected (`Hassan II`); the street
     context regex covers `12 rue …`.
   - `SSN '780'` can be hallucinated inside a RIB; the RIB context span wins.
   - A Luhn-valid card fragment can appear inside an IBAN (`0077 8000 0123 4567`).
     Checksum detectors now reject numbers embedded in longer alphanumeric
     identifiers, and the full IBAN/RIB context span wins.
3. **Context window.** Documents are windowed at 512 tokens with 64-token overlap;
   entities exactly on a window seam can still split. Raise `--max-tokens` on a
   machine with enough memory.
4. **No deterministic guarantee.** Scores are probabilistic; borderline spans can
   flip between runs/models. Regex, checksum and context detectors stay at
   `score = 1.0`.
5. **Threshold trade-off.** `0.5` balances precision/recall. Raising it cuts false
   positives but drops recall; lowering it does the reverse. Exposed as
   `--min-score` and the constructor arg.
6. **Label policy.** Low-value labels are skipped by default (age, amount,
   currency, eye color, gender, height, job department/title, occupation, ordinal
   direction, sex, time). Pass `--include-labels` to keep specific ones, or
   `--exclude-labels` to override the skip list.
7. **Arabic is deferred.** The model is multilingual, but the current product
   scope is French/English; RTL offset handling has not been validated.
8. **Cold start / cost.** ~2.8 GB download and CPU inference is not free (~15–25 s
   including load on a typical laptop). Regex-only requests use `--no-ner` and do
   not pay for it.

---

## 4. Strengths

- Catches free-text names, organizations, locations, addresses, dates, emails and
  phones that regex cannot express.
- Character offsets align with the rest of the pipeline, so spans compose with
  regex/checksum/context results.
- The model is multilingual and already covers FR/EN document text, including
  Moroccan identifiers when paired with the context regexes.
- Loaded lazily behind `Detector`, so regex-only requests do not load the model.

---

## 5. Why this is fine for the MVP

Nemo is a **layered** system, not a single model:

| Layer | Catches | Nature |
| --- | --- | --- |
| Context | ICE, CIN, RIB, IBAN, street, neighbourhood, labelled org | deterministic |
| Checksum | IBAN, card, SIREN/SIRET/NIR | deterministic |
| Regex | email, phone, ZIP, date | deterministic |
| NER | person, organization, location, address, date, email, phone | probabilistic |

Merge priority is `context > checksum > regex > ner`; within a source, longer
spans win, then higher score. The deterministic layers carry structured PII, and
the context layer pins down labelled identifiers before NER can fragment them.

---

## 6. Mitigations & roadmap

- [x] Sliding-window chunking + offset correction for documents > 512 tokens.
- [x] Lowercase-name second pass.
- [x] Checksum embedded-number guard (no card fragments inside IBAN/RIB).
- [ ] Quantize or export to ONNX Runtime for CPU speed and memory.
- [ ] Arabic/RTL validation.
- [ ] Per-label precision/recall with the eval harness.
- [ ] Optional gazetteer/fuzzy match for customer-specific names.

---

## 7. Reproduce

```python
from anonymizer.detectors.ner import NerDetector

detector = NerDetector()
for span in detector.detect(
    "Karim El Amrani habite 12 rue Hassan II, quartier Al Qods, oujda."
):
    print(span)
```

The first call downloads the model into `.hf-cache/`. To skip NER in the CLI:

```bash
python -m anonymizer.cli --no-ner "CIN AB123456, ICE 001234567000089"
```

---

## 8. References

- `OpenMed/privacy-filter-multilingual-v2` model card (Hugging Face).
- Original BIOES reference notebook used to validate the decoder (not shipped).
