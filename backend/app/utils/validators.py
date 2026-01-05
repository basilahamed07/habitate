import re

from pydantic import EmailStr

PASSWORD_PATTERN = re.compile(r"^(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$")
PASSWORD_MESSAGE = "Password must be at least 8 characters and include 1 uppercase and 1 special character."


def normalize_email(email: EmailStr) -> str:
    return str(email).strip().lower()


def validate_password(password: str) -> str:
    if not PASSWORD_PATTERN.search(password or ""):
        raise ValueError(PASSWORD_MESSAGE)
    return password
