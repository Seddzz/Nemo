"""Fake surrogate generation for the ``fake`` redaction strategy."""
import re
from collections.abc import Callable

from faker import Faker

Provider = Callable[[Faker, str], str]

FRENCH_HINT_RE = re.compile(
    r"[àâçéèêëîïôûùüÿœ]|\+212\b|\+33\b|"
    r"\b(?:le|la|les|de|du|des|et|je|mon|ma|mes|est|pour|avec|rue|avenue|"
    r"boulevard|cin|rib|mme|mlle|monsieur|madame|maroc|casablanca|oujda|rabat)\b",
    re.IGNORECASE,
)


def _digits(length: int) -> Provider:
    return lambda fake, original: fake.numerify("#" * length)


def _shape(fake: Faker, original: str) -> str:
    characters: list[str] = []
    for character in original:
        if character.isdigit():
            characters.append(str(fake.random_digit()))
        elif character.isalpha():
            characters.append(fake.random_letter())
        else:
            characters.append(character)
    return "".join(characters)


def _base58(fake: Faker, length: int) -> str:
    alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    return fake.bothify("?" * length, letters=alphabet)


def _address(fake: Faker, original: str) -> str:
    if any(character.isdigit() for character in original):
        return fake.street_address()
    return fake.street_name()


FAKE_PROVIDERS: dict[str, Provider] = {
    "PERSON": lambda fake, original: fake.name(),
    "ORGANIZATION": lambda fake, original: fake.company(),
    "LOCATION": lambda fake, original: fake.city(),
    "ADDRESS": _address,
    "CITY": lambda fake, original: fake.city(),
    "STATE": lambda fake, original: fake.state(),
    "COUNTY": lambda fake, original: fake.state(),
    "ZIP": lambda fake, original: fake.postcode(),
    "EMAIL": lambda fake, original: fake.email(),
    "PHONE": lambda fake, original: fake.phone_number(),
    "IBAN": lambda fake, original: fake.iban(),
    "CARD": lambda fake, original: fake.credit_card_number(),
    "BIC": lambda fake, original: fake.swift(),
    "BANKACCOUNT": lambda fake, original: fake.bban(),
    "ACCOUNTNAME": lambda fake, original: fake.name(),
    "SSN": lambda fake, original: fake.ssn(),
    "SIREN": _digits(9),
    "SIRET": _digits(14),
    "NIR": _digits(15),
    "RIB": _digits(24),
    "ICE": _digits(15),
    "CIN": lambda fake, original: (
        _shape(fake, original) if original else fake.bothify("??######").upper()
    ),
    "ID": lambda fake, original: _shape(fake, original) if original else _digits(10)(fake, ""),
    "DATE": lambda fake, original: fake.date(),
    "DATEOFBIRTH": lambda fake, original: fake.date_of_birth().isoformat(),
    "TIME": lambda fake, original: fake.time(),
    "USERNAME": lambda fake, original: fake.user_name(),
    "URL": lambda fake, original: fake.url(),
    "IPADDRESS": lambda fake, original: fake.ipv4(),
    "MACADDRESS": lambda fake, original: fake.mac_address(),
    "USERAGENT": lambda fake, original: fake.user_agent(),
    "PASSWORD": lambda fake, original: fake.password(),
    "PIN": _digits(4),
    "CVV": _digits(3),
    "GPSCOORDINATES": lambda fake, original: f"{fake.latitude()}, {fake.longitude()}",
    "IMEI": _digits(15),
    "VIN": lambda fake, original: fake.bothify("?" * 17).upper(),
    "VRM": lambda fake, original: fake.license_plate(),
    "BITCOINADDRESS": lambda fake, original: "1" + _base58(fake, 33),
    "ETHEREUMADDRESS": lambda fake, original: "0x" + fake.hexify("^" * 40),
    "LITECOINADDRESS": lambda fake, original: "L" + _base58(fake, 33),
    "CREDITCARDISSUER": lambda fake, original: fake.company(),
    "MASKEDNUMBER": lambda fake, original: (
        _shape(fake, original) if original else _digits(10)(fake, "")
    ),
    "AMOUNT": lambda fake, original: str(fake.random_number(digits=4)),
    "CURRENCY": lambda fake, original: fake.currency_code(),
    "CURRENCYCODE": lambda fake, original: fake.currency_code(),
    "CURRENCYNAME": lambda fake, original: fake.currency_name(),
    "CURRENCYSYMBOL": lambda fake, original: fake.currency_symbol(),
    "AGE": lambda fake, original: str(fake.random_int(18, 90)),
    "HEIGHT": lambda fake, original: f"{fake.random_int(150, 200)} cm",
    "GENDER": lambda fake, original: fake.random_element(("female", "male", "non-binary")),
    "SEX": lambda fake, original: fake.random_element(("F", "M", "X")),
    "EYECOLOR": lambda fake, original: fake.random_element(
        ("amber", "blue", "brown", "green", "grey", "hazel")
    ),
    "OCCUPATION": lambda fake, original: fake.job(),
    "JOBTITLE": lambda fake, original: fake.job(),
    "JOBDEPARTMENT": lambda fake, original: fake.bs(),
    "ORDINALDIRECTION": lambda fake, original: fake.random_element(
        ("North", "South", "East", "West")
    ),
}


class FakeGenerator:
    """Produce realistic-looking surrogates per entity label.

    Pass ``seed`` to make output reproducible (useful for tests).
    """

    def __init__(self, seed: int | None = None, locale: str = "en_US") -> None:
        self._fake = Faker(locale)
        if seed is not None:
            self._fake.seed_instance(seed)

    def generate(self, label: str, original: str = "") -> str:
        """Return a fake value for ``label``, falling back to a word."""
        provider = FAKE_PROVIDERS.get(label)
        if provider is None:
            return self._fake.word()
        return provider(self._fake, original)

    def generate_unique(self, label: str, original: str, used: set[str]) -> str:
        """Return a fake value not already present in ``used``."""
        for _ in range(100):
            value = self.generate(label, original)
            if value not in used:
                return value
        value = self.generate(label, original)
        counter = 2
        while f"{value} {counter}" in used:
            counter += 1
        return f"{value} {counter}"


def guess_locale(text: str) -> str:
    """Pick a Faker locale from the text, defaulting to English."""
    return "fr_FR" if FRENCH_HINT_RE.search(text) else "en_US"
