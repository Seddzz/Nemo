"""OpenMed privacy-filter detector with a BIOES span decoder."""
import os
import re
import threading
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

import torch
from transformers import AutoModelForTokenClassification, AutoTokenizer
from transformers.utils import logging

from anonymizer.detect import Entity

MODEL_NAME = "OpenMed/privacy-filter-multilingual-v2"
PROJECT_ROOT = Path(__file__).resolve().parents[3]
MODEL_CACHE_DIR = Path(os.getenv("ANONYMIZER_MODEL_DIR", PROJECT_ROOT / ".hf-cache"))

LABEL_MAP = {
    "FIRSTNAME": "PERSON",
    "LASTNAME": "PERSON",
    "MIDDLENAME": "PERSON",
    "PREFIX": "PERSON",
    "STREET": "ADDRESS",
    "BUILDINGNUMBER": "ADDRESS",
    "SECONDARYADDRESS": "ADDRESS",
    "COUNTY": "ADDRESS",
    "ZIPCODE": "ZIP",
    "CREDITCARD": "CARD",
    "CREDITCARDISSUER": "ORGANIZATION",
    "MASKEDNUMBER": "ID",
}

DEFAULT_SKIP_LABELS = {
    "AGE",
    "AMOUNT",
    "CURRENCY",
    "CURRENCYCODE",
    "CURRENCYNAME",
    "CURRENCYSYMBOL",
    "EYECOLOR",
    "GENDER",
    "HEIGHT",
    "JOBDEPARTMENT",
    "JOBTITLE",
    "OCCUPATION",
    "ORDINALDIRECTION",
    "SEX",
    "TIME",
}

SECOND_PASS_LABELS = {"PERSON", "CITY", "ADDRESS"}

TITLES = {
    "dr",
    "m.",
    "me",
    "mlle",
    "mlle.",
    "mme",
    "mme.",
    "mr",
    "mtre",
    "pr",
    "prof",
}

_TITLE_RE = re.compile(r"(?<!\w)(\w)")


@dataclass(frozen=True, slots=True)
class RawSpan:
    label: str
    start: int
    end: int
    score: float
    uncertain: bool = False


@dataclass(frozen=True, slots=True)
class DetectedSpan:
    label: str
    start: int
    end: int
    score: float
    uncertain: bool = False


def allowed(prev: str, cur: str) -> bool:
    pp, _, pl = prev.partition("-")
    cp, _, cl = cur.partition("-")
    if pp in ("B", "I"):
        return cp in ("I", "E") and cl == pl
    return cp in ("O", "B", "S")


def viterbi_decode(logp: torch.Tensor | object, id2label: dict[int, str]) -> list[str]:
    import numpy as np
    if hasattr(logp, "cpu"):
        logp = logp.cpu().numpy()
    T, C = logp.shape
    tags = [id2label[i] for i in range(C)]
    ok = np.array([[allowed(p, c) for c in tags] for p in tags])
    start_ok = np.array([t == "O" or t[0] in "BS" for t in tags])
    end_ok = np.array([t == "O" or t[0] in "ES" for t in tags])
    NEG = -1e9
    score = np.where(start_ok, logp[0], NEG)
    back = np.zeros((T, C), dtype=int)
    trans = np.where(ok, 0.0, NEG)
    for t in range(1, T):
        cand = score[:, None] + trans
        back[t] = cand.argmax(0)
        score = cand.max(0) + logp[t]
    score = np.where(end_ok, score, NEG)
    path = [int(score.argmax())]
    for t in range(T - 1, 0, -1):
        path.append(int(back[t][path[-1]]))
    return [tags[i] for i in reversed(path)]


def canonical_label(label: str) -> str:
    return LABEL_MAP.get(label, label)


def decode_bioes(
    offsets: list[tuple[int, int]],
    ids: list[int],
    id2label: dict[int, str],
    scores: list[float] | None = None,
) -> list[RawSpan]:
    """Rebuild full spans from BIOES token tags.

    The tokenizer splits names and other values into subword pieces, so token
    offsets must be aggregated back into a single character span.
    """
    raw: list[dict[str, object]] = []
    current: dict[str, object] | None = None

    for index, ((start, end), token_id) in enumerate(zip(offsets, ids, strict=False)):
        if start == end:
            continue
        label = id2label.get(token_id, "O")
        if label == "O":
            current = None
            continue
        prefix, separator, category = label.partition("-")
        if not separator:
            current = None
            continue
        token_score = scores[index] if scores is not None else 1.0
        if prefix in ("B", "S") or current is None or current["label"] != category:
            current = {
                "label": category,
                "start": start,
                "end": end,
                "scores": [token_score],
            }
            raw.append(current)
        else:
            current["end"] = end
            scores_list = current["scores"]
            if isinstance(scores_list, list):
                scores_list.append(token_score)
        if prefix in ("E", "S"):
            current = None

    spans: list[RawSpan] = []
    for span in raw:
        span_scores = span["scores"]
        score = sum(span_scores) / len(span_scores) if isinstance(span_scores, list) else 0.0
        spans.append(
            RawSpan(
                label=str(span["label"]),
                start=int(span["start"]),
                end=int(span["end"]),
                score=score,
            )
        )
    return spans


def snap(text: str, start: int, end: int) -> tuple[int, int]:
    """Expand a span to the surrounding alphanumeric word boundaries."""
    while start > 0 and text[start - 1].isalnum():
        start -= 1
    while end < len(text) and text[end].isalnum():
        end += 1
    return start, end


def titlecase_keep_len(text: str) -> str:
    """Uppercase word starts without changing the string length."""

    def replace(match: re.Match[str]) -> str:
        upper = match.group(1).upper()
        return upper if len(upper) == 1 else match.group(1)

    return _TITLE_RE.sub(replace, text)


def postprocess(text: str, spans: list[RawSpan], max_gap: int = 2) -> list[DetectedSpan]:
    """Snap, vote, drop titles, and merge adjacent spans of the same label."""
    votes: dict[tuple[int, int], dict[str, int]] = defaultdict(lambda: defaultdict(int))
    scores: dict[tuple[int, int], float] = {}
    uncertain_map: dict[tuple[int, int], bool] = {}

    for span in spans:
        start, end = span.start, span.end
        while start < end and text[start].isspace():
            start += 1
        while end > start and text[end - 1].isspace():
            end -= 1
        if start == end:
            continue
        snapped_start, snapped_end = snap(text, start, end)
        if span.label == "CURRENCYCODE" and (snapped_start, snapped_end) != (start, end):
            continue
        key = (snapped_start, snapped_end)
        votes[key][canonical_label(span.label)] += end - start
        scores[key] = max(scores.get(key, 0.0), span.score)
        if span.uncertain:
            uncertain_map[key] = True

    items = sorted(
        (start, end, max(labels, key=labels.get))
        for (start, end), labels in votes.items()
        if text[start:end].strip().lower() not in TITLES
    )

    merged: list[list[object]] = []
    for start, end, label in items:
        span_score = scores.get((start, end), 0.0)
        span_uncertain = uncertain_map.get((start, end), False)
        if merged and merged[-1][2] == label and start - int(merged[-1][1]) <= max_gap:
            merged[-1][1] = max(int(merged[-1][1]), end)
            merged[-1][3] = max(float(merged[-1][3]), span_score)
            if span_uncertain:
                merged[-1][4] = True
        else:
            merged.append([start, end, label, span_score, span_uncertain])

    return [
        DetectedSpan(
            label=str(label),
            start=int(start),
            end=int(end),
            score=float(score),
            uncertain=bool(uncertain),
        )
        for start, end, label, score, uncertain in merged
    ]


def _overlaps(span: DetectedSpan, spans: list[DetectedSpan]) -> bool:
    return any(span.start < other.end and span.end > other.start for other in spans)


class NerDetector:
    """Detect PII with the OpenMed multilingual privacy-filter model."""

    def __init__(
        self,
        model_name: str | None = None,
        confidence_threshold: float = 0.5,
        max_tokens: int = 512,
        stride: int = 64,
        max_gap: int = 2,
        second_pass: bool = True,
        viterbi: bool = False,
        include_labels: set[str] | None = None,
        exclude_labels: set[str] | None = None,
        cache_dir: str | Path | None = None,
        device: str | None = None,
    ) -> None:
        logging.set_verbosity_error()
        logging.disable_progress_bar()

        self.model_name = model_name or os.getenv("ANONYMIZER_NER_MODEL", MODEL_NAME)
        self.confidence_threshold = confidence_threshold
        self.max_tokens = max_tokens
        self.stride = stride
        self.max_gap = max_gap
        self.second_pass = second_pass
        self.viterbi = viterbi
        self.include_labels = include_labels
        self.exclude_labels = DEFAULT_SKIP_LABELS if exclude_labels is None else exclude_labels
        self._lock = threading.Lock()

        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        dtype = torch.bfloat16 if self.device == "cuda" else torch.float32
        cache = str(cache_dir or MODEL_CACHE_DIR)

        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name, cache_dir=cache)
        self.model = AutoModelForTokenClassification.from_pretrained(
            self.model_name,
            cache_dir=cache,
            dtype=dtype,
        )
        self.model.to(self.device)
        self.model.eval()
        self.id2label: dict[int, str] = dict(self.model.config.id2label)

    def detect(self, text: str) -> list[Entity]:
        if not text or not text.strip():
            return []

        raw_base = self._detect_raw(text)
        spans = postprocess(text, raw_base, max_gap=self.max_gap)

        if self.second_pass:
            titlecased = titlecase_keep_len(text)
            if titlecased != text:
                raw_extra = self._detect_raw(titlecased)
                extra_marked = [
                    RawSpan(label=s.label, start=s.start, end=s.end, score=s.score, uncertain=True)
                    for s in raw_extra
                ]
                extra = postprocess(titlecased, extra_marked, max_gap=self.max_gap)
                for span in extra:
                    if span.label in SECOND_PASS_LABELS and not _overlaps(span, spans):
                        spans.append(span)
                spans.sort(key=lambda span: span.start)

        entities: list[Entity] = []
        for span in spans:
            if span.score < self.confidence_threshold:
                continue
            if self.include_labels is not None and span.label not in self.include_labels:
                continue
            if span.label in self.exclude_labels:
                continue
            confidence = "medium" if span.uncertain else "high"
            entities.append(
                Entity(
                    label=span.label,
                    start=span.start,
                    end=span.end,
                    text=text[span.start : span.end],
                    score=span.score,
                    source="ner",
                    uncertain=span.uncertain,
                    confidence=confidence,
                )
            )
        return entities

    def _detect_raw(self, text: str) -> list[RawSpan]:
        spans: list[RawSpan] = []
        for chunk, offset in self._windows(text):
            if not chunk.strip():
                continue
            spans.extend(self._detect_window(chunk, offset))
        return spans

    def _windows(self, text: str) -> list[tuple[str, int]]:
        encoding = self.tokenizer(
            text,
            add_special_tokens=False,
            return_offsets_mapping=True,
            truncation=False,
        )
        offsets = encoding["offset_mapping"]
        if len(offsets) <= self.max_tokens:
            return [(text, 0)]

        windows: list[tuple[str, int]] = []
        step = max(1, self.max_tokens - self.stride)
        for first in range(0, len(offsets), step):
            last = min(first + self.max_tokens, len(offsets))
            start = offsets[first][0]
            end = offsets[last - 1][1]
            if end > start:
                windows.append((text[start:end], start))
            if last == len(offsets):
                break
        return windows

    def _detect_window(self, text: str, offset: int) -> list[RawSpan]:
        encoding = self.tokenizer(
            text,
            return_offsets_mapping=True,
            return_tensors="pt",
            truncation=True,
            max_length=self.max_tokens,
        )
        offsets = encoding.pop("offset_mapping")[0].tolist()
        encoding = {key: value.to(self.device) for key, value in encoding.items()}

        with self._lock, torch.inference_mode():
            logits = self.model(**encoding).logits[0].float()

        probabilities = logits.softmax(-1)
        if getattr(self, "viterbi", False):
            log_probs = logits.log_softmax(-1)
            tags_list = viterbi_decode(log_probs, self.id2label)
            tag2id = {v: k for k, v in self.id2label.items()}
            ids = [tag2id.get(t, 0) for t in tags_list]
        else:
            ids = probabilities.argmax(-1).tolist()
        scores = probabilities.gather(1, torch.tensor(ids, device=logits.device).unsqueeze(1))
        scores = scores.squeeze(1).tolist()

        spans = decode_bioes(offsets, ids, self.id2label, scores)
        return [
            RawSpan(
                label=span.label,
                start=span.start + offset,
                end=span.end + offset,
                score=span.score,
                uncertain=span.uncertain,
            )
            for span in spans
        ]
