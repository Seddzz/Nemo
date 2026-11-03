"""Regex-based entity detectors."""
import re

from anonymizer.detect import Entity
from anonymizer.detectors.checksum import validate_ice, validate_rib


class RegexDetector:
    """Base class for regex-based detectors."""
    
    def __init__(
        self,
        label: str,
        pattern: re.Pattern,
        source: str = "regex",
        group: int = 0,
        validator=None,
    ):
        self.label = label
        self.pattern = pattern
        self.source = source
        self.group = group  # which capture group to use (0 = full match)
        self.validator = validator
    
    def detect(self, text: str) -> list[Entity]:
        entities = []
        for match in self.pattern.finditer(text):
            matched_text = match.group(self.group)
            start = match.start(self.group)
            end = match.end(self.group)
            confidence = "high"
            if self.validator is not None:
                confidence = "high" if self.validator(matched_text) else "medium"
            entities.append(Entity(
                label=self.label,
                start=start,
                end=end,
                text=matched_text,
                score=1.0,
                source=self.source,
                uncertain=False,
                confidence=confidence,
            ))
        return entities


# ============================================================
# Regex patterns for English PII
# ============================================================

# Email: user@domain.com, first.last@company.org, test+tag@domain.co.uk, etc.
# Use capturing group: (?:^|\s) matches leading whitespace/start, group 1 is the email
# Domain: subdomains separated by dots, TLD 2-6 chars (prevents "comextra" matching)
EMAIL_PATTERN = re.compile(
    r"(?:^|\s)"                    # start of string or whitespace
    r"([a-zA-Z0-9._%+-]+@"         # local part + @
    r"[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*"  # domain: subdomains (no leading dot)
    r"\.[a-zA-Z]{2,6})"            # TLD: 2-6 letters
    r"\b"                          # word boundary
)

# US Phone: (555) 123-4567, 555-123-4567, +1 555 123 4567, 555.123.4567, 5551234567
# Optional +1, optional parens around area code, separators: space, dash, dot, or none
# Word boundary at end prevents partial match on 555-123-45678
PHONE_PATTERN = re.compile(
    r"(?:\+1[\s.-]?)?"           # optional +1 with separator
    r"(?:\(\d{3}\)|\d{3})"       # area code: (555) or 555
    r"[\s.-]?"                    # optional separator
    r"\d{3}"                      # exchange
    r"[\s.-]?"                    # optional separator
    r"\d{4}"                      # subscriber
    r"\b"                         # word boundary
)

# French and Moroccan phone numbers: +212 6 61 23 45 67, +33 6 12 34 56 78,
# 06 12 34 56 78. The leading 0 form covers both numbering plans.
INTL_PHONE_PATTERN = re.compile(
    r"(?<![\w+])"
    r"(?:"
    r"(?:\+212|00212|0)[\s.-]?[2567](?:[\s.-]?\d{2}){4}"
    r"|(?:\+33|0033)[\s.-]?[1-9](?:[\s.-]?\d{2}){4}"
    r"|0[1-9](?:[\s.-]?\d{2}){4}"
    r")"
    r"(?!\d)"
)

# Moroccan ICE (15 digits) and CIN (1-2 letters + 5-7 digits) are only
# trusted when explicitly labelled, which keeps false positives near zero.
ICE_PATTERN = re.compile(r"(?i)\bICE\b[\s:.\-]{0,3}(\d{15})\b")
CIN_PATTERN = re.compile(
    r"(?i)\bC\.?\s?I\.?\s?N\.?\b[\s:.\-]{0,3}([A-Z]{1,2}\d{5,7})\b"
)

# Moroccan RIB: 24 digits grouped as 3-3-16-2 (spaces, dots or dashes optional).
RIB_PATTERN = re.compile(
    r"(?i)\bRIB\b[\s:.\-]{0,3}"
    r"(\d{3}(?:[\s.-]?\d{3})(?:[\s.-]?\d{4}){4}(?:[\s.-]?\d{2}))\b"
)

# Labelled IBANs are redacted even when their checksum is invalid.
IBAN_CONTEXT_PATTERN = re.compile(
    r"(?i)\bIBAN\b[\s:.\-]{0,3}"
    r"([A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){1,6}(?:[ ]?[A-Z0-9]{1,4}))\b"
)

# Street lines such as "12 rue Hassan II", "45 avenue Mohammed V" or
# "12 rue de la Paix". French particles are allowed before capitalized names.
STREET_PARTICLE = r"(?:de|du|des|la|le|les|el|al)"
STREET_NAME = (
    rf"(?:{STREET_PARTICLE}\s+)*[A-Z][\w'’-]+"
    rf"(?:\s+(?:{STREET_PARTICLE}\s+)*[A-Z][\w'’-]+){{0,4}}"
)
STREET_ADDRESS_PATTERN = re.compile(
    r"\b(\d{1,4}\s+"
    r"(?:[Rr]ue|[Aa]venue|[Aa]v\.?|[Bb]d|[Bb]oulevard|[Pp]lace|[Cc]hemin|"
    r"[Rr]oute|[Ii]mpasse|[Aa]ll[ée]e|[Ss]quare)\s+"
    rf"{STREET_NAME})"
)

# Neighbourhoods such as "quartier Al Qods" or "hay Salam".
NEIGHBORHOOD_PATTERN = re.compile(
    r"(?i:\b(?:quartier|hay)\s+)"
    r"([A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+){0,3})"
)

# Legal entities such as "Atlas Conseil SARL".
ORGANIZATION_PATTERN = re.compile(
    r"\b([A-Z][\w&'’.-]+(?:\s+[A-Z][\w&'’.-]+){0,5}\s+"
    r"(?:SARL|SA|SAS|SASU|SNC|SCI|GIE))\b"
)

# US ZIP: 12345 or 12345-6789
# Must be at word boundary, not preceded by digit-dash, not followed by digit/dash
ZIP_PATTERN = re.compile(r"(?<!\d-)\b\d{5}(?:-\d{4})?(?![-\d])")

# Dates: 03/15/2024, March 15, 2024, 15 March 2024, Jan 1, 2000
# MM/DD/YYYY with valid month 01-12 | Month DD, YYYY | DD Month YYYY
MONTH = (
    r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
)
# MM/DD/YYYY - month 01-12, day 01-31
DATE_PATTERN = re.compile(
    rf"(?:0[1-9]|1[0-2])/(?:0[1-9]|[12]\d|3[01])/\d{{4}}"  # MM/DD/YYYY valid
    rf"|(?:{MONTH}\s+\d{{1,2}},\s+\d{{4}})"                  # Month DD, YYYY
    rf"|(?:\d{{1,2}}\s+{MONTH}\s+\d{{4}})"                   # DD Month YYYY
)


# Detector instances (export these)
email_detector = RegexDetector("EMAIL", EMAIL_PATTERN, group=1)
phone_detector = RegexDetector("PHONE", PHONE_PATTERN)
intl_phone_detector = RegexDetector("PHONE", INTL_PHONE_PATTERN)
zip_detector = RegexDetector("ZIP", ZIP_PATTERN)
date_detector = RegexDetector("DATE", DATE_PATTERN)
ice_detector = RegexDetector(
    "ICE", ICE_PATTERN, source="context", group=1, validator=validate_ice
)
cin_detector = RegexDetector("CIN", CIN_PATTERN, source="context", group=1)
rib_detector = RegexDetector(
    "RIB", RIB_PATTERN, source="context", group=1, validator=validate_rib
)
iban_context_detector = RegexDetector("IBAN", IBAN_CONTEXT_PATTERN, source="context", group=1)
street_address_detector = RegexDetector(
    "ADDRESS", STREET_ADDRESS_PATTERN, source="context", group=1
)
neighborhood_detector = RegexDetector(
    "ADDRESS", NEIGHBORHOOD_PATTERN, source="context", group=1
)
organization_detector = RegexDetector(
    "ORGANIZATION", ORGANIZATION_PATTERN, source="context", group=1
)


# Convenience: all regex detectors
ALL_REGEX_DETECTORS = [
    email_detector,
    phone_detector,
    intl_phone_detector,
    zip_detector,
    date_detector,
    ice_detector,
    cin_detector,
    rib_detector,
    iban_context_detector,
    street_address_detector,
    neighborhood_detector,
    organization_detector,
]


def detect_all_regex(text: str) -> list[Entity]:
    """Run all regex detectors on text and return combined entities."""
    entities = []
    for detector in ALL_REGEX_DETECTORS:
        entities.extend(detector.detect(text))
    return entities