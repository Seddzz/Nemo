from typing import TYPE_CHECKING

from anonymizer.detectors.checksum import (
    ALL_CHECKSUM_DETECTORS,
    CardDetector,
    IBANDetector,
    NIRDetector,
    SIRENDetector,
    SIRETDetector,
    detect_all_checksum,
)
from anonymizer.detectors.regex_detector import (
    ALL_REGEX_DETECTORS,
    RegexDetector,
    cin_detector,
    detect_all_regex,
    iban_context_detector,
    ice_detector,
    intl_phone_detector,
    neighborhood_detector,
    organization_detector,
    rib_detector,
    street_address_detector,
)

if TYPE_CHECKING:
    from anonymizer.detectors.ner import NerDetector


def __getattr__(name: str):
    if name == "NerDetector":
        from anonymizer.detectors.ner import NerDetector

        return NerDetector
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

__all__ = [
    "NerDetector",
    "RegexDetector",
    "ALL_REGEX_DETECTORS",
    "detect_all_regex",
    "intl_phone_detector",
    "ice_detector",
    "cin_detector",
    "rib_detector",
    "iban_context_detector",
    "street_address_detector",
    "neighborhood_detector",
    "organization_detector",
    "IBANDetector",
    "CardDetector",
    "SIRENDetector",
    "SIRETDetector",
    "NIRDetector",
    "ALL_CHECKSUM_DETECTORS",
    "detect_all_checksum",
]

