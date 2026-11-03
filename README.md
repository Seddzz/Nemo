<p align="center">
  <img src="docs/assets/github.jpg" alt="Nemo" width="600" />
</p>

<p align="center">
  <em>API-first PII anonymization for French and English documents. Runs locally, one-way redaction, CLI + REST API + local web app.</em>
</p>

---

## What you get

- **CLI** — pipe text in, get rewritten text out: `python -m anonymizer.cli "..."` (fake entities by default, `--strategy placeholder` for numbered tokens).
- **Web app** — a local, Cursor-style UI at `http://localhost:3000`: drop a document to anonymize it, chat with Nemo about redaction, and read the docs, all in one shell.
- **REST API** — FastAPI service with `/detect`, `/anonymize`, `/health` and an interactive Swagger UI at `http://localhost:8000/docs`.
- **File workflow** — redact a document to a clean copy, then use it anywhere: paste it into a chat, load it in any agent, share it onward. PII never reaches a model.
- **Stable redaction** — PII becomes numbered placeholders (`[PERSON_1]`, `[IBAN_1]`) or realistic fakes. Redaction is one-way: redacted text is the only artifact, no mapping is kept or written.
- **Local-first privacy** — detection runs on your machine; no request ever leaves your infrastructure.

## Requirements

- **Python 3.11+** and **Node.js 20+** (native install) or **Docker Desktop** (containerized engine)
- ~600 MB disk for dependencies, plus ~2.8 GB for the OpenMed NER model (downloaded on first use into `.hf-cache/`)
- No GPU required — everything runs on CPU; the model is public, so no Hugging Face token is needed

---

## 1. Install

### Option A — Docker (no Python needed)

```bash
git clone https://github.com/Seddzz/Nemo.git
cd Nemo
docker compose up --build
```

This starts the FastAPI engine on `:8000` (the docs site in `web/` runs separately — see below).

### Option B — pip (into a virtualenv)

```bash
git clone https://github.com/Seddzz/Nemo.git
cd Nemo
python -m venv .venv
.venv\Scripts\activate              # Windows (use `source .venv/bin/activate` on Linux/macOS)
pip install -e ".[dev]" \
  --index-url https://download.pytorch.org/whl/cpu \
  --extra-index-url https://pypi.org/simple
```

The `--index-url` pins the **CPU-only PyTorch wheel** (~200 MB instead of a multi-GB CUDA build). Drop the flags if you have a GPU and want CUDA.

### Option C — uv

```bash
git clone https://github.com/Seddzz/Nemo.git
cd Nemo
uv pip install -e ".[dev]"
```

---

## 2. Start the engine

```bash
.venv\Scripts\uvicorn anonymizer.api:app --reload --port 8000
```

Verify it is alive:

- Swagger UI: **http://localhost:8000/docs**
- Health check: `curl http://localhost:8000/health` → `{"status":"ok"}`

### 2b. Start the web app

```bash
cd web
npm install
npm run dev
```

Open **http://localhost:3000**. The UI talks to the engine on `:8000`; set `ANONYMIZER_URL` in `web/.env.local` if the engine runs elsewhere. Chat needs a Groq key — add it in **Settings** or set `GROQ_API_KEY` in `web/.env.local`.

---

## 3. Use it

### Web app

- **`/` — Anonymize** (default): drop a `.pdf` or `.txt`, pick `placeholder` or `fake`, then copy or download the redacted text.
- **`/chat` — Chat**: ask Nemo about redaction. A dynamic status card above the prompt bar shows the latest redaction with a preview, copy and download.
- **`/docs` — Docs**: the full documentation, served inside the app.
- **Settings**: display name, engine URL, Groq API key and model, stored in `localStorage`.

### CLI

Text in, rewritten text out. Fake entities are the default; use `--strategy placeholder`
for numbered tokens. Omit the text argument to read stdin.

```bash
# Fake names, addresses, IDs and IBANs (FR/EN, auto locale)
.venv\Scripts\python -m anonymizer.cli "Karim El Amrani habite 12 rue Hassan II, oujda. CIN AB123456."

# Numbered placeholders, regex/checksum only (no model download)
.venv\Scripts\python -m anonymizer.cli --strategy placeholder --no-ner \
  "IBAN MA64 0077 8000 0123 4567 8901 2345, ICE 001234567000089"

# JSON output with entity spans, or pipe from stdin
cat document.txt | .venv\Scripts\python -m anonymizer.cli --json
```

Useful flags: `--seed` (reproducible fakes), `--locale auto|en_US|fr_FR`, `--min-score`,
`--include-labels`, `--exclude-labels`, `--no-second-pass`, `--quiet`.

### REST API

Detect entities (regex, checksum and context; no model):

```bash
curl -X POST http://localhost:8000/detect \
  -H "Content-Type: application/json" \
  -d '{"text": "Sarah Kellermann transferred EUR 4200 to IBAN DE89 3704 0044 0532 0130 00", "ner": false}'
```

Anonymize — get redacted text plus the detected entities:

```bash
curl -X POST http://localhost:8000/anonymize \
  -H "Content-Type: application/json" \
  -d '{"text": "Sarah Kellermann transferred €4,200 to DE89 3704 0044 0532 0130 00", "strategy": "placeholder", "ner": true}'
```

```json
{
  "redacted": "[PERSON_1] transferred €4,200 to [IBAN_1]",
  "entities": [...]
}
```

Nothing is stored or kept server-side — redaction is one-way.

### Anonymize a PDF

The engine extracts the PDF text layer server-side (PyMuPDF) — upload the file directly:

```bash
curl -X POST http://localhost:8000/anonymize-file \
  -F "file=@invoice.pdf" \
  -F "strategy=placeholder"
```

```json
{
  "redacted": "[PERSON_1] transferred €4,200 to [IBAN_1] ...",
  "entities": [...]
}
```

- `/detect-file` works identically for detection only. Plain `.txt` uploads are accepted too, up to **10 MB**.
- Scanned PDFs without a text layer return `422` — run OCR before sending them.

**Get a redacted PDF back** (PII boxed out in place, layout preserved) with `-F "output=pdf"`:

```bash
curl -X POST http://localhost:8000/anonymize-file \
  -F "file=@invoice.pdf" \
  -F "strategy=placeholder" \
  -F "output=pdf" \
  -o invoice_redacted.pdf
```

Every detected value is replaced by a drawn token (`[EMAIL_1]`, `[IBAN_1]`, …) over the exact spot the original occupied — the PII is removed from the content stream, so copy/paste cannot recover it. The response carries `X-Redacted-Entities` and `X-Missed-Entities` (a rare entity split across a page break or in a decorative font may be skipped — check this header before trusting an anonymized document).

## Using redacted files with agents

Redact first, hand out the clean file only. The agent never sees the original document — its context only ever contains the redacted text.

---

## How detection works

Four detector layers run in parallel on the original text and are merged by trust:
`context > checksum > regex > ner`. Within the same source, longer spans win, then higher score.

1. **Context detectors** — labelled identifiers and structured phrases: ICE, CIN, RIB, IBAN, street addresses, neighbourhoods, organizations.
2. **Checksum-validated detectors** — Luhn (credit cards), IBAN mod-97, SIREN/SIRET, NIR: deterministic, near-zero false positives.
3. **Regex detectors** — emails, French/Moroccan and US phone numbers, ZIPs, dates.
4. **NER** — [`OpenMed/privacy-filter-multilingual-v2`](https://huggingface.co/OpenMed/privacy-filter-multilingual-v2), a 1.4B-parameter multilingual token-classification model. It emits 217 BIOES labels; a custom decoder, span snap and merge pass reconstruct full names, addresses, dates, emails and phones. A second pass on title-cased text recovers lowercase names. Long documents are windowed (512 tokens, 64 overlap).

NER is off by default in the API (set `ner: true` to enable) and on by default in the CLI (skip it with `--no-ner`). The model defaults to skipping low-value labels (age, amount, gender, job title, time, …) and drops titles such as `Mme`/`Dr` rather than faking them. Arabic is deferred; French and English are the supported languages.

Redaction strategies: `placeholder` (stable `[LABEL_N]` tokens — consistent per value) or `fake` (realistic Faker surrogates for documents you want to stay readable, shape-preserving for IDs and cards).

## Tests & evaluation

```bash
ruff check .
pytest

# Optional: load the real 2.8 GB model in the NER test
$env:ANONYMIZER_TEST_MODEL=1; pytest tests/test_ner.py   # PowerShell
ANONYMIZER_TEST_MODEL=1 pytest tests/test_ner.py          # bash

python -m eval.run -n 200 --seed 0   # synthetic benchmark: precision / recall / F1
```

On the 200-document synthetic benchmark the pipeline scores **F1 = 1.000** for regex + checksum detectors.
The default suite skips the real-model test; it uses the pure decoder/postprocess tests so CI stays fast.

---

## Roadmap — decisions to make to scale this

**Model layer**

- Quantize or export the OpenMed model to **ONNX Runtime** (~2–5× CPU inference speedup, smaller memory footprint).
- Add **Arabic** support once the tokenizer/decoder is validated on RTL text (the model is multilingual; the current product scope is FR/EN).
- Add a **gazetteer / fuzzy-match pass** for customer-specific names (LLM-agnostic, instant to update).
- Evaluate a smaller distilled model for latency-sensitive deployments, and measure per-label precision/recall with the eval harness.

**Service architecture**

- Add **auth** (API keys / JWT) + rate limiting per client before any shared deployment, plus TLS at the ingress.
- Split the NER pass into a **separate worker/pod**: it holds a large resident model; regex-only requests should not pay for it.
- Long documents: define **chunking + overlap policy** so NER doesn't miss entities split across chunk boundaries.

**Ops & packaging**

- Publish to **PyPI** and ship the container image to **GHCR** so users get `pip install` / `docker pull` instead of cloning.
- Reuse container layers: keep the base image slim (CPU wheels only) to keep pull times low.
- Add observability (request metrics, detection latency, entity-type counts) — Prometheus/Grafana friendly.
- CI is already running ruff + pytest on push; add a release workflow that bumps the version, builds the image and regenerates the eval report per release.

## Credits

The NER layer uses [`OpenMed/privacy-filter-multilingual-v2`](https://huggingface.co/OpenMed/privacy-filter-multilingual-v2)
(Apache-2.0). The web interface is built with [shadcn/ui](https://ui.shadcn.com) and Tailwind CSS.
The animated fluid orb and the animated counter / AI status components come from
[Rare UI](https://rareui.com) by [@swamimalode](https://x.com/swamimalode) — thanks for making them
free and open source.
