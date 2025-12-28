from pydantic import EmailStr


def normalize_email(email: EmailStr) -> str:
    return str(email).strip().lower()
