"""Detection engine: run all detectors and merge their results."""
from collections.abc import Iterable

from anonymizer.detect import Detector, Entity, validate_entity_offsets
from anonymizer.detectors import ALL_CHECKSUM_DETECTORS, ALL_REGEX_DETECTORS

# When two entities overlap, the most trustworthy source wins.
# context = labelled deterministic ID, checksum = structural proof,
# regex = deterministic pattern, ner = probabilistic guess.
SOURCE_PRIORITY = {
    "context": 4,
    "checksum": 3,
    "regex": 2,
    "ner": 1,
}


def _rank(entity: Entity) -> tuple[int, int, float]:
    """Score an entity for overlap resolution: priority, then length, then confidence."""
    return (
        SOURCE_PRIORITY.get(entity.source, 0),
        entity.end - entity.start,
        entity.score,
    )


class DetectionEngine:
    """Runs a set of detectors and resolves their overlapping spans."""

    def __init__(self, detectors: Iterable[Detector] | None = None):
        if detectors is None:
            detectors = [*ALL_REGEX_DETECTORS, *ALL_CHECKSUM_DETECTORS]
        self.detectors: list[Detector] = list(detectors)

    def detect_all(self, text: str) -> list[Entity]:
        """Run every detector, resolve overlaps, and validate the offsets."""
        raw: list[Entity] = []
        for detector in self.detectors:
            raw.extend(detector.detect(text))

        resolved = self.resolve_overlaps(raw)
        validate_entity_offsets(text, resolved)
        return resolved

    def resolve_overlaps(self, entities: list[Entity]) -> list[Entity]:
        """Return non-overlapping entities, preferring higher-ranked spans.

        Entities are grouped into transitively overlapping clusters. Inside a
        cluster the highest-ranked span wins, then the next one that does not
        overlap an already chosen span, and so on.
        """
        ordered = sorted(entities, key=lambda e: (e.start, e.end))
        clusters: list[list[Entity]] = []
        current: list[Entity] = []
        cluster_end = -1

        for entity in ordered:
            if current and entity.start >= cluster_end:
                clusters.append(current)
                current = []
            current.append(entity)
            cluster_end = max(cluster_end, entity.end)
        if current:
            clusters.append(current)

        resolved: list[Entity] = []
        for cluster in clusters:
            chosen: list[Entity] = []
            for entity in sorted(cluster, key=_rank, reverse=True):
                if all(
                    entity.start >= other.end or entity.end <= other.start
                    for other in chosen
                ):
                    chosen.append(entity)
            resolved.extend(sorted(chosen, key=lambda e: e.start))
        return resolved
