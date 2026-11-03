import pytest

from anonymizer.detect import Entity
from anonymizer.engine import DetectionEngine, _rank


class FakeDetector:
    """A detector that returns a fixed list of entities."""

    def __init__(self, entities: list[Entity]):
        self._entities = entities

    def detect(self, text: str) -> list[Entity]:
        return list(self._entities)


TEXT = "0123456789abcdefghij"  # 20 chars; offsets are easy to reason about


def make(source: str, start: int, end: int, score: float = 1.0) -> Entity:
    return Entity(
        label="TEST",
        start=start,
        end=end,
        text=TEXT[start:end],
        score=score,
        source=source,
    )


def test_collects_and_sorts_all_detectors():
    engine = DetectionEngine([
        FakeDetector([make("regex", 10, 14)]),
        FakeDetector([make("checksum", 0, 5)]),
    ])
    result = engine.detect_all(TEXT)
    assert [e.start for e in result] == [0, 10]


def test_checksum_beats_regex_on_overlap():
    engine = DetectionEngine([
        FakeDetector([make("regex", 0, 5)]),
        FakeDetector([make("checksum", 3, 8)]),
    ])
    result = engine.detect_all(TEXT)
    assert len(result) == 1
    assert result[0].source == "checksum"


def test_regex_beats_ner_on_overlap():
    engine = DetectionEngine([
        FakeDetector([make("ner", 0, 5)]),
        FakeDetector([make("regex", 2, 6)]),
    ])
    result = engine.detect_all(TEXT)
    assert result[0].source == "regex"


def test_longer_span_wins_on_equal_priority():
    engine = DetectionEngine([
        FakeDetector([make("regex", 0, 4), make("regex", 2, 8)]),
    ])
    result = engine.detect_all(TEXT)
    assert len(result) == 1
    assert (result[0].start, result[0].end) == (2, 8)


def test_score_breaks_remaining_tie():
    a = make("regex", 0, 4, score=0.9)
    b = make("regex", 2, 6, score=0.6)
    assert _rank(a) > _rank(b)


def test_bad_offsets_raise():
    bad = Entity("TEST", 0, 5, "WRONG", 1.0, "regex")
    engine = DetectionEngine([FakeDetector([bad])])
    with pytest.raises(AssertionError):
        engine.detect_all(TEXT)


def test_engine_defaults_on_real_text():
    engine = DetectionEngine()  # regex + checksum
    text = "Email a@b.com and IBAN GB29NWBK60161331926819"
    labels = {e.label for e in engine.detect_all(text)}
    assert "EMAIL" in labels
    assert "IBAN" in labels


def test_empty_text_returns_empty():
    assert DetectionEngine().detect_all("") == []


def test_ner_span_covering_two_regex_spans_is_dropped():
    engine = DetectionEngine([
        FakeDetector([make("ner", 0, 10)]),
        FakeDetector([make("regex", 0, 5), make("regex", 5, 10)]),
    ])
    result = engine.detect_all(TEXT)

    assert [(e.source, e.start, e.end) for e in result] == [
        ("regex", 0, 5),
        ("regex", 5, 10),
    ]


def test_long_ner_span_loses_to_regex_overlap():
    engine = DetectionEngine([
        FakeDetector([make("ner", 0, 10)]),
        FakeDetector([make("regex", 2, 4)]),
    ])
    result = engine.detect_all(TEXT)

    assert [(e.source, e.start, e.end) for e in result] == [("regex", 2, 4)]


def test_adjacent_spans_from_different_sources_are_kept():
    engine = DetectionEngine([
        FakeDetector([make("ner", 0, 5)]),
        FakeDetector([make("regex", 5, 10)]),
    ])
    result = engine.detect_all(TEXT)

    assert [(e.source, e.start, e.end) for e in result] == [
        ("ner", 0, 5),
        ("regex", 5, 10),
    ]


def test_context_beats_checksum_on_overlap():
    engine = DetectionEngine([
        FakeDetector([make("checksum", 0, 10)]),
        FakeDetector([make("context", 0, 10)]),
    ])
    result = engine.detect_all(TEXT)

    assert result[0].source == "context"


def test_rule_beats_ner_on_rib():
    """Rule (context) should win over NER on overlapping RIB text."""
    from anonymizer.detect import Entity
    from anonymizer.detectors.regex_detector import rib_detector
    engine = DetectionEngine([
        FakeDetector([Entity(label="SSN", start=4, end=7, text="780", score=1.0, source="ner")]),
        rib_detector,
    ])
    text = "RIB 007 780 0001234567890123 45"
    result = engine.detect_all(text)
    # RIB should win, source should be "context"
    assert len(result) == 1
    assert result[0].label == "RIB"
    assert result[0].source == "context"


def test_rule_beats_ner_on_iban():
    """Rule (context) should win over NER on overlapping IBAN text."""
    from anonymizer.detect import Entity
    from anonymizer.detectors.regex_detector import iban_context_detector
    engine = DetectionEngine([
        FakeDetector([
            Entity(
                label="CHECKSUM", start=4, end=8, text="12345678",
                score=1.0, source="checksum",
            ),
        ]),
        iban_context_detector,
    ])
    text = "IBAN MA64 0115 1900 0001 2050 0053 4921"
    result = engine.detect_all(text)
    # IBAN context should win
    assert len(result) == 1
    assert result[0].label == "IBAN"
    assert result[0].source == "context"
