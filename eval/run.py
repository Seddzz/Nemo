"""Run the evaluation harness and print precision/recall/F1."""
import argparse

from anonymizer.detectors import ALL_CHECKSUM_DETECTORS, ALL_REGEX_DETECTORS
from anonymizer.engine import DetectionEngine
from eval.generate import DatasetGenerator
from eval.metrics import evaluate_detailed


def main() -> None:
    parser = argparse.ArgumentParser(description="Anonymizer evaluation harness")
    parser.add_argument("-n", "--count", type=int, default=50, help="number of documents")
    parser.add_argument("--seed", type=int, default=0, help="generation seed")
    parser.add_argument("--ner", action="store_true", help="include the NER detector")
    parser.add_argument("--per-label", action="store_true", help="print per-label metrics")
    args = parser.parse_args()

    detectors = [*ALL_REGEX_DETECTORS, *ALL_CHECKSUM_DETECTORS]
    if args.ner:
        from anonymizer.detectors import NerDetector

        detectors.append(NerDetector())

    engine = DetectionEngine(detectors)
    samples = DatasetGenerator(seed=args.seed).generate(args.count)
    metrics, per_label_metrics = evaluate_detailed(samples, engine.detect_all)

    print(f"documents : {args.count}")
    counts = f"{metrics.true_positives}/{metrics.false_positives}/{metrics.false_negatives}"
    print(f"tp/fp/fn  : {counts}")
    print(f"precision : {metrics.precision:.3f}")
    print(f"recall    : {metrics.recall:.3f}")
    print(f"f1        : {metrics.f1:.3f}")

    if args.per_label:
        print("\nper-label metrics:")
        for label, label_metrics in per_label_metrics.items():
            label_counts = (
                f"{label_metrics.true_positives}/{label_metrics.false_positives}/"
                f"{label_metrics.false_negatives}"
            )
            print(
                f"{label:12} tp/fp/fn={label_counts:>10} "
                f"p={label_metrics.precision:.3f} r={label_metrics.recall:.3f} "
                f"f1={label_metrics.f1:.3f}"
            )


if __name__ == "__main__":
    main()
