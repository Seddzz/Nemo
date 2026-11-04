
from anonymizer.detect import validate_entity_offsets
from anonymizer.detectors.regex_detector import (
    cin_detector,
    iban_context_detector,
    ice_detector,
    intl_phone_detector,
    neighborhood_detector,
    organization_detector,
    rib_detector,
    street_address_detector,
)
from anonymizer.engine import DetectionEngine


def test_moroccan_and_french_phone_numbers():
    cases = [
        "+212 6 61 23 45 67",
        "06 12 34 56 78",
        "+33 6 12 34 56 78",
        "07.61.23.45.67",
    ]

    for text in cases:
        entities = intl_phone_detector.detect(text)
        assert len(entities) == 1, text
        assert entities[0].label == "PHONE"
        assert entities[0].text == text
        validate_entity_offsets(text, entities)


def test_intl_phone_does_not_match_short_numbers():
    assert intl_phone_detector.detect("123 456") == []
    assert intl_phone_detector.detect("06 12 34") == []


def test_ice_detector():
    text = "ICE 001234567000089"
    entities = ice_detector.detect(text)

    assert len(entities) == 1
    assert entities[0].label == "ICE"
    assert entities[0].text == "001234567000089"
    assert entities[0].source == "context"
    validate_entity_offsets(text, entities)


def test_cin_detector():
    text = "CIN ab123456"
    entities = cin_detector.detect(text)

    assert len(entities) == 1
    assert entities[0].label == "CIN"
    assert entities[0].text == "ab123456"
    assert entities[0].source == "context"
    validate_entity_offsets(text, entities)


def test_rib_detector():
    text = "RIB 007 780 0001234567890123 45"
    entities = rib_detector.detect(text)

    assert len(entities) == 1
    assert entities[0].label == "RIB"
    assert entities[0].text == "007 780 0001234567890123 45"
    assert entities[0].source == "context"
    validate_entity_offsets(text, entities)


def test_iban_context_detector():
    text = "IBAN MA64 0077 8000 0123 4567 8901 2345"
    entities = iban_context_detector.detect(text)

    assert len(entities) == 1
    assert entities[0].label == "IBAN"
    assert entities[0].text == "MA64 0077 8000 0123 4567 8901 2345"
    assert entities[0].source == "context"
    validate_entity_offsets(text, entities)


def test_street_address_detector():
    text = "habite 12 rue Hassan II, quartier Al Qods, oujda."
    entities = street_address_detector.detect(text)

    assert len(entities) == 1
    assert entities[0].label == "ADDRESS"
    assert entities[0].text == "12 rue Hassan II"
    validate_entity_offsets(text, entities)


def test_street_address_with_french_particles():
    text = "domicilié au 12 rue de la Paix."
    entities = street_address_detector.detect(text)

    assert len(entities) == 1
    assert entities[0].text == "12 rue de la Paix"
    validate_entity_offsets(text, entities)


def test_neighborhood_detector():
    text = "habite 12 rue Hassan II, quartier Al Qods, oujda."
    entities = neighborhood_detector.detect(text)

    assert len(entities) == 1
    assert entities[0].label == "ADDRESS"
    assert entities[0].text == "Al Qods"
    validate_entity_offsets(text, entities)


def test_organization_detector():
    text = "la société Atlas Conseil SARL (ICE 001234567000089)"
    entities = organization_detector.detect(text)

    assert len(entities) == 1
    assert entities[0].label == "ORGANIZATION"
    assert entities[0].text == "Atlas Conseil SARL"
    validate_entity_offsets(text, entities)


def test_context_ids_need_their_label():
    assert ice_detector.detect("001234567000089") == []
    assert cin_detector.detect("ab123456") == []
    assert rib_detector.detect("007 780 0001234567890123 45") == []
    assert iban_context_detector.detect("MA64 0077 8000 0123 4567 8901 2345") == []


def test_no_false_positives_on_mixed_text():
    """Ensure random numbers without labels or context do not produce spurious ID detections."""
    engine = DetectionEngine()

    # 15-digit number with invalid mod 97
    invalid_15 = "111111111111111"
    entities = engine.detect_all(invalid_15)
    assert not any(e.label == "ICE" for e in entities)

    # 24-digit number with invalid checksum
    invalid_24 = "111111111111111111111111"
    entities = engine.detect_all(invalid_24)
    assert not any(e.label == "RIB" for e in entities)


def test_ma_iban_auto_detect_confidence():
    # Test the IBAN validation logic that drives confidence decisions
    from anonymizer.detectors.checksum import validate_iban
    # Valid Moroccan IBAN (mod-97 == 1) -> high confidence
    valid_candidate = 'MA64011519000001205000534921'
    assert validate_iban(valid_candidate)
    # Invalid Moroccan IBAN (mod-97 mismatch) -> medium confidence
    invalid_candidate = 'MA64007780000123456789012345'
    assert not validate_iban(invalid_candidate)


def test_ice_confidence_valid_vs_invalid():
    # Valid ICE checksum (001561191000066 -> mod 97 == 0) -> high via ChecksumDetector
    from anonymizer.detectors.checksum import ICEDetector
    valid_e = ICEDetector().detect("001561191000066")
    assert len(valid_e) == 1
    assert valid_e[0].confidence == "high"

    # Invalid ICE with context (001234567000089 -> mod 97 != 0) -> medium
    invalid_e = ice_detector.detect("ICE 001234567000089")
    assert len(invalid_e) == 1
    assert invalid_e[0].confidence == "medium"


def test_rib_confidence_valid_vs_invalid():
    # Valid RIB checksum
    valid_rib = "011 519 0000012050005349 21"
    from anonymizer.detectors.checksum import RIBDetector
    valid_e = RIBDetector().detect(valid_rib)
    assert len(valid_e) == 1
    assert valid_e[0].confidence == "high"

    # Invalid RIB with context -> medium
    invalid_e = rib_detector.detect("RIB 007 780 0001234567890123 45")
    assert len(invalid_e) == 1
    assert invalid_e[0].confidence == "medium"
