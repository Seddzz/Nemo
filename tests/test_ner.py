import os

import pytest

from anonymizer.detect import validate_entity_offsets
from anonymizer.detectors.ner import (
    NerDetector,
    RawSpan,
    canonical_label,
    decode_bioes,
    postprocess,
    titlecase_keep_len,
    viterbi_decode,
)

ID2LABEL = {
    0: "O",
    1: "B-FIRSTNAME",
    2: "I-FIRSTNAME",
    3: "E-FIRSTNAME",
    4: "B-LASTNAME",
    5: "I-LASTNAME",
    6: "E-LASTNAME",
    7: "B-EMAIL",
    8: "E-EMAIL",
    9: "S-STREET",
    10: "S-CURRENCYCODE",
    11: "S-PREFIX",
}


def test_decode_bioes_rebuilds_subword_spans():
    text = "Salma Benjelloun"
    offsets = [(0, 3), (3, 5), (6, 12), (12, 16)]
    ids = [1, 3, 4, 6]

    spans = decode_bioes(offsets, ids, ID2LABEL)

    assert [(span.label, span.start, span.end) for span in spans] == [
        ("FIRSTNAME", 0, 5),
        ("LASTNAME", 6, 16),
    ]
    assert all(0.0 <= span.score <= 1.0 for span in spans)
    assert text[spans[0].start : spans[0].end] == "Salma"


def test_decode_bioes_skips_special_and_o_tokens():
    offsets = [(0, 0), (0, 3), (3, 4), (4, 9)]
    ids = [0, 1, 0, 4]

    spans = decode_bioes(offsets, ids, ID2LABEL)

    assert [(span.label, span.start, span.end) for span in spans] == [
        ("FIRSTNAME", 0, 3),
        ("LASTNAME", 4, 9),
    ]


def test_postprocess_snaps_and_merges_names():
    text = "Salma Benjelloun"
    spans = [
        RawSpan("FIRSTNAME", 0, 3, 0.99),
        RawSpan("FIRSTNAME", 3, 5, 0.99),
        RawSpan("LASTNAME", 6, 12, 0.99),
        RawSpan("LASTNAME", 12, 16, 0.99),
    ]

    result = postprocess(text, spans)

    assert [(span.label, span.start, span.end) for span in result] == [
        ("PERSON", 0, 16)
    ]
    assert text[result[0].start : result[0].end] == "Salma Benjelloun"


def test_postprocess_rebuilds_email_fragments():
    text = "sarah.kellermann@example.com"
    spans = [
        RawSpan("EMAIL", 0, 24, 0.99),
        RawSpan("EMAIL", 24, 28, 0.99),
    ]

    result = postprocess(text, spans)

    assert [(span.label, span.start, span.end) for span in result] == [
        ("EMAIL", 0, 28)
    ]


def test_postprocess_rebuilds_phone_fragments():
    text = "+212 6 61 23 45 67"
    spans = [
        RawSpan("PHONE", 0, 15, 0.99),
        RawSpan("PHONE", 16, 18, 0.99),
    ]

    result = postprocess(text, spans)

    assert [(span.label, span.start, span.end) for span in result] == [
        ("PHONE", 0, 18)
    ]


def test_postprocess_drops_titles():
    text = "Mme Salma Benjelloun"
    spans = [
        RawSpan("PREFIX", 0, 3, 0.51),
        RawSpan("FIRSTNAME", 4, 9, 0.99),
        RawSpan("LASTNAME", 10, 20, 0.99),
    ]

    result = postprocess(text, spans)

    assert [(span.label, span.start, span.end) for span in result] == [
        ("PERSON", 4, 20)
    ]


def test_postprocess_drops_expanded_currency_codes():
    text = "SARL"
    spans = [RawSpan("CURRENCYCODE", 0, 3, 0.91)]

    assert postprocess(text, spans) == []


def test_postprocess_keeps_separate_labels_apart():
    text = "Oujda Morocco"
    spans = [
        RawSpan("CITY", 0, 5, 0.9),
        RawSpan("STATE", 6, 13, 0.9),
    ]

    result = postprocess(text, spans)

    assert [(span.label, span.start, span.end) for span in result] == [
        ("CITY", 0, 5),
        ("STATE", 6, 13),
    ]


def test_canonical_label_mapping():
    assert canonical_label("FIRSTNAME") == "PERSON"
    assert canonical_label("LASTNAME") == "PERSON"
    assert canonical_label("STREET") == "ADDRESS"
    assert canonical_label("BUILDINGNUMBER") == "ADDRESS"
    assert canonical_label("ZIPCODE") == "ZIP"
    assert canonical_label("CREDITCARD") == "CARD"
    assert canonical_label("MASKEDNUMBER") == "ID"
    assert canonical_label("EMAIL") == "EMAIL"


def test_titlecase_keep_len_preserves_offsets():
    text = "karim el amrani"
    titlecased = titlecase_keep_len(text)

    assert titlecased == "Karim El Amrani"
    assert len(titlecased) == len(text)


@pytest.mark.skipif(
    not os.getenv("ANONYMIZER_TEST_MODEL"),
    reason="set ANONYMIZER_TEST_MODEL=1 to download and run the real model",
)
def test_real_model_rebuilds_french_names():
    detector = NerDetector()
    text = "Bonjour, je m'appelle Salma Benjelloun et mon email est salma@example.com."
    entities = detector.detect(text)

    validate_entity_offsets(text, entities)
    assert any(entity.label == "PERSON" for entity in entities)
    assert any(entity.label == "EMAIL" for entity in entities)


def test_viterbi_decode_transition_constraints():
    import numpy as np
    id2label = {0: "O", 1: "B-PERSON", 2: "I-PERSON", 3: "E-PERSON"}
    logp = np.zeros((4, 4))
    path = viterbi_decode(logp, id2label)
    assert len(path) == 4
    # Check valid path constraints
    assert path[0] == "O" or path[0].startswith("B") or path[0].startswith("S")
