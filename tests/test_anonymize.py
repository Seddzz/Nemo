import pytest

from anonymizer.anonymize import anonymize_text, replacement_table
from anonymizer.detect import Entity
from anonymizer.fakes import FakeGenerator


def test_single_entity():
    text = "Hello John Doe!"
    entities = [Entity("PERSON", 6, 14, "John Doe", 1.0, "ner")]
    redacted = anonymize_text(text, entities)
    assert redacted == "Hello [PERSON_1]!"


def test_multiple_labels():
    text = "Email a@b.com from John"
    entities = [
        Entity("EMAIL", 6, 13, "a@b.com", 1.0, "regex"),
        Entity("PERSON", 19, 23, "John", 1.0, "ner"),
    ]
    redacted = anonymize_text(text, entities)
    assert redacted == "Email [EMAIL_1] from [PERSON_1]"


def test_repeated_value_reuses_placeholder():
    text = "John met John"
    entities = [
        Entity("PERSON", 0, 4, "John", 1.0, "ner"),
        Entity("PERSON", 9, 13, "John", 1.0, "ner"),
    ]
    redacted = anonymize_text(text, entities)
    assert redacted == "[PERSON_1] met [PERSON_1]"


def test_numbering_is_per_label():
    entities = [
        Entity("X", 0, 1, "a", 1.0, "regex"),
        Entity("Y", 2, 3, "b", 1.0, "regex"),
    ]
    table = replacement_table(entities)
    assert set(table.values()) == {"[X_1]", "[Y_1]"}


def test_adjacent_spans():
    text = "ab"
    entities = [
        Entity("X", 0, 1, "a", 1.0, "regex"),
        Entity("X", 1, 2, "b", 1.0, "regex"),
    ]
    assert anonymize_text(text, entities) == "[X_1][X_2]"


def test_empty_input():
    assert anonymize_text("", []) == ""


def test_text_without_entities_is_unchanged():
    text = "nothing to redact here"
    assert anonymize_text(text, []) == text


def test_bad_offsets_raise():
    text = "John Doe"
    entities = [Entity("PERSON", 0, 8, "Jane Doe", 1.0, "ner")]
    with pytest.raises(AssertionError):
        anonymize_text(text, entities)


def test_unknown_strategy_raises():
    with pytest.raises(ValueError, match="unknown strategy"):
        anonymize_text("x", [], strategy="nope")


def test_fake_strategy_replaces_with_surrogate():
    text = "Hello John Doe!"
    entities = [Entity("PERSON", 6, 14, "John Doe", 1.0, "ner")]
    redacted = anonymize_text(text, entities, strategy="fake", faker=FakeGenerator(seed=1))
    assert "John Doe" not in redacted
    assert redacted.startswith("Hello ") and redacted.endswith("!")


def test_fake_strategy_is_deterministic_with_seed():
    text = "John Doe"
    entities = [Entity("PERSON", 0, 8, "John Doe", 1.0, "ner")]
    first = anonymize_text(text, entities, strategy="fake", faker=FakeGenerator(seed=42))
    second = anonymize_text(text, entities, strategy="fake", faker=FakeGenerator(seed=42))
    assert first == second


def test_fake_strategy_reuses_surrogate_for_repeated_value():
    text = "John met John"
    entities = [
        Entity("PERSON", 0, 4, "John", 1.0, "ner"),
        Entity("PERSON", 9, 13, "John", 1.0, "ner"),
    ]
    table = replacement_table(entities, strategy="fake", faker=FakeGenerator(seed=3))
    assert len(table) == 1
    surrogate = next(iter(table.values()))
    redacted = anonymize_text(
        text, entities, strategy="fake", faker=FakeGenerator(seed=3), replacements=table
    )
    assert redacted == f"{surrogate} met {surrogate}"


def test_fake_strategy_gives_distinct_values_distinct_surrogates():
    entities = [
        Entity("PERSON", 0, 8, "John Doe", 1.0, "ner"),
        Entity("PERSON", 13, 21, "Jane Doe", 1.0, "ner"),
    ]
    table = replacement_table(entities, strategy="fake", faker=FakeGenerator(seed=2))
    assert len(set(table.values())) == 2


def test_fake_strategy_handles_low_cardinality_labels():
    entities = [
        Entity("GENDER", 0, 1, "a", 1.0, "ner"),
        Entity("GENDER", 2, 3, "b", 1.0, "ner"),
    ]
    table = replacement_table(entities, strategy="fake", faker=FakeGenerator(seed=1))

    assert len(table) == 2
    assert len(set(table.values())) == 2


def test_fake_id_preserves_shape():
    entity = Entity("ID", 0, 8, "ab123456", 1.0, "ner")
    table = replacement_table([entity], strategy="fake", faker=FakeGenerator(seed=1))
    value = table[("ID", "ab123456")]

    assert len(value) == len(entity.text)
    assert value[:2].isalpha()
    assert value[2:].isdigit()


def test_fake_supports_new_openmed_labels():
    labels = [
        "ADDRESS",
        "CITY",
        "STATE",
        "USERNAME",
        "IPADDRESS",
        "MACADDRESS",
        "RIB",
        "ICE",
        "CIN",
        "DATEOFBIRTH",
    ]
    generator = FakeGenerator(seed=4)

    for label in labels:
        assert generator.generate(label, "original") != ""


def test_fake_rib_has_24_digits():
    generator = FakeGenerator(seed=5)
    value = generator.generate("RIB", "007 780 0001234567890123 45")

    assert value.isdigit()
    assert len(value) == 24
