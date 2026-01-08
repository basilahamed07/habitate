from typing import Optional

from pydantic import BaseModel, EmailStr, validator

from app.utils.validators import validate_password


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: Optional[bool] = False


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str

    _validate_password = validator("password", allow_reuse=True)(validate_password)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    reset_required: bool = False
