from typing import Optional

from pydantic import BaseModel, EmailStr, validator

from app.utils.validators import validate_password


class UserBase(BaseModel):
    id: int
    name: str
    email: EmailStr
    status: str
    habits: int
    joined: str


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    require_reset: bool = True

    _validate_password = validator("password", allow_reuse=True)(validate_password)


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    status: Optional[str] = None


class PasswordUpdate(BaseModel):
    password: str

    _validate_password = validator("password", allow_reuse=True)(validate_password)


class PasswordChange(BaseModel):
    currentPassword: Optional[str] = None
    newPassword: str

    _validate_password = validator("newPassword", allow_reuse=True)(validate_password)


class UserProfile(BaseModel):
    id: int
    name: str
    email: EmailStr
    status: str
    bio: Optional[str] = None
    avatarUrl: Optional[str] = None


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    bio: Optional[str] = None
    avatarUrl: Optional[str] = None


class UserListResponse(BaseModel):
    users: list[UserBase]
    total: int
