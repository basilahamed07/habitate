from typing import Optional

from pydantic import BaseModel, EmailStr


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


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    status: Optional[str] = None


class PasswordUpdate(BaseModel):
    password: str


class UserProfile(BaseModel):
    id: int
    name: str
    email: EmailStr
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
