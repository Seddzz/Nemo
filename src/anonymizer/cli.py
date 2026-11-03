"""Command-line text anonymizer: read text, write the rewritten text."""
import argparse
import json
import sys

from anonymizer.anonymize import anonymize_text
from anonymizer.detect import Entity
from anonymizer.detectors.checksum import ALL_CHECKSUM_DETECTORS
from anonymizer.detectors.regex_detector import ALL_REGEX_DETECTORS
from anonymizer.engine import DetectionEngine
from anonymizer.fakes import FakeGenerator, guess_locale


def _label_set(value: str | None) -> set[str] | None:
    if not value:
        return None
    return {label.strip().upper() for label in value.split(",") if label.strip()}


def _build_engine(args: argparse.Namespace) -> DetectionEngine:
    detectors = [*ALL_REGEX_DETECTORS, *ALL_CHECKSUM_DETECTORS]
    if not args.no_ner:
        from anonymizer.detectors.ner import NerDetector

        if not args.quiet:
            sys.stderr.write(
                "Loading the OpenMed privacy-filter model "
                "(first run downloads about 2.8 GB into .hf-cache)...\n"
            )
        detectors.append(
            NerDetector(
                model_name=args.model,
                confidence_threshold=args.min_score,
                max_tokens=args.max_tokens,
                second_pass=not args.no_second_pass,
                include_labels=_label_set(args.include_labels),
                exclude_labels=_label_set(args.exclude_labels),
            )
        )
    return DetectionEngine(detectors)


def _entity_dict(entity: Entity) -> dict[str, object]:
    return {
        "label": entity.label,
        "start": entity.start,
        "end": entity.end,
        "text": entity.text,
        "score": entity.score,
        "source": entity.source,
        "uncertain": entity.uncertain,
        "confidence": entity.confidence,
    }


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m anonymizer.cli",
        description="Rewrite text with fake entities (or numbered placeholders).",
    )
    parser.add_argument("text", nargs="*", help="text to anonymize; omit to read stdin")
    parser.add_argument(
        "--strategy",
        choices=("fake", "placeholder"),
        default="fake",
        help="replacement strategy (default: fake)",
    )
    parser.add_argument(
        "--no-ner",
        action="store_true",
        help="skip the OpenMed model and use regex/checksum detectors only",
    )
    parser.add_argument("--json", action="store_true", help="print redacted text and entities")
    parser.add_argument("--seed", type=int, default=None, help="seed for reproducible fakes")
    parser.add_argument(
        "--locale",
        choices=("auto", "en_US", "fr_FR"),
        default="auto",
        help="locale for fake values (default: auto)",
    )
    parser.add_argument(
        "--min-score",
        type=float,
        default=0.5,
        help="minimum NER confidence (default: 0.5)",
    )
    parser.add_argument("--model", default=None, help="override the NER model name")
    parser.add_argument(
        "--max-tokens",
        type=int,
        default=512,
        help="NER window size in tokens (default: 512)",
    )
    parser.add_argument(
        "--no-second-pass",
        action="store_true",
        help="disable the lowercase-name second NER pass",
    )
    parser.add_argument(
        "--include-labels",
        default=None,
        help="comma-separated NER labels to keep (e.g. PERSON,EMAIL)",
    )
    parser.add_argument(
        "--exclude-labels",
        default=None,
        help="comma-separated NER labels to drop (overrides the default skip list)",
    )
    parser.add_argument("--quiet", action="store_true", help="hide progress messages")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _parser()
    args = parser.parse_args(argv)

    if args.text:
        text = " ".join(args.text)
    else:
        if sys.stdin.isatty():
            parser.error("provide text as arguments or pipe it through stdin")
        text = sys.stdin.read()

    engine = _build_engine(args)
    entities = engine.detect_all(text)

    if args.strategy == "fake":
        locale = guess_locale(text) if args.locale == "auto" else args.locale
        faker = FakeGenerator(seed=args.seed, locale=locale)
    else:
        faker = None

    redacted = anonymize_text(text, entities, strategy=args.strategy, faker=faker)

    if args.json:
        payload = {
            "redacted": redacted,
            "entities": [_entity_dict(entity) for entity in entities],
        }
        sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    else:
        sys.stdout.write(redacted)
        if not redacted.endswith("\n"):
            sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
