import io
import json
import sys

from anonymizer.cli import main


def test_cli_reads_argument_text_and_redacts(monkeypatch, capsys):
    monkeypatch.setattr(sys, "stdin", io.StringIO(""))

    assert main(["--no-ner", "--strategy", "placeholder", "Email a@b.com"]) == 0
    assert capsys.readouterr().out.strip() == "Email [EMAIL_1]"


def test_cli_reads_stdin(monkeypatch, capsys):
    monkeypatch.setattr(sys, "stdin", io.StringIO("Email a@b.com"))

    assert main(["--no-ner", "--strategy", "placeholder"]) == 0
    assert capsys.readouterr().out.strip() == "Email [EMAIL_1]"


def test_cli_fake_is_default(monkeypatch, capsys):
    monkeypatch.setattr(sys, "stdin", io.StringIO(""))

    assert main(["--no-ner", "--seed", "1", "Email a@b.com"]) == 0
    output = capsys.readouterr().out
    assert "a@b.com" not in output
    assert "[EMAIL_1]" not in output


def test_cli_json_output(monkeypatch, capsys):
    monkeypatch.setattr(sys, "stdin", io.StringIO(""))

    assert main(["--no-ner", "--json", "Email a@b.com"]) == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["redacted"] != "Email a@b.com"
    assert payload["entities"][0]["label"] == "EMAIL"
    assert payload["entities"][0]["source"] == "regex"


def test_cli_without_ner_keeps_names(monkeypatch, capsys):
    monkeypatch.setattr(sys, "stdin", io.StringIO(""))

    assert main(["--no-ner", "John Doe"]) == 0
    assert capsys.readouterr().out.strip() == "John Doe"


def test_cli_moroccan_ids(monkeypatch, capsys):
    monkeypatch.setattr(sys, "stdin", io.StringIO(""))
    text = "CIN ab123456, ICE 001234567000089, RIB 007 780 0001234567890123 45"

    assert main(["--no-ner", "--json", text]) == 0
    labels = {entity["label"] for entity in json.loads(capsys.readouterr().out)["entities"]}
    assert {"CIN", "ICE", "RIB"} <= labels


def test_cli_rejects_missing_text(monkeypatch):
    class Tty(io.StringIO):
        def isatty(self) -> bool:
            return True

    monkeypatch.setattr(sys, "stdin", Tty(""))

    try:
        main(["--no-ner"])
    except SystemExit as exc:
        assert exc.code == 2
    else:
        raise AssertionError("expected argparse to exit")
