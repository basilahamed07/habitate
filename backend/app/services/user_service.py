from typing import Optional

from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.utils.validators import normalize_email, validate_password


def list_users(db: Session) -> list[User]:
    return db.query(User).order_by(User.id.desc()).all()


def get_user(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    normalized = normalize_email(email)
    return db.query(User).filter(User.email == normalized).first()


def create_user(
    db: Session,
    name: str,
    email: str,
    password: str,
    role: str = "user",
    status: str = "active"
) -> User:
    validate_password(password)
    user = User(
        full_name=name,
        email=normalize_email(email),
        password_hash=get_password_hash(password),
        role=role,
        status=status,
        token_version=0
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(
    db: Session, user_id: int, name: Optional[str], email: Optional[str], status: Optional[str]
) -> Optional[User]:
    user = get_user(db, user_id)
    if not user:
        return None
    if name:
        user.full_name = name
    if email:
        user.email = normalize_email(email)
    if status:
        user.status = status
    db.commit()
    db.refresh(user)
    return user


def update_password(db: Session, user_id: int, password: str) -> bool:
    user = get_user(db, user_id)
    if not user:
        return False
    validate_password(password)
    user.password_hash = get_password_hash(password)
    user.token_version = (user.token_version or 0) + 1
    db.commit()
    return True


def update_profile(
    db: Session,
    user_id: int,
    name: Optional[str],
    email: Optional[str],
    bio: Optional[str],
    avatar_url: Optional[str]
) -> Optional[User]:
    user = get_user(db, user_id)
    if not user:
        return None
    if name is not None:
        user.full_name = name
    if email is not None:
        user.email = normalize_email(email)
    if bio is not None:
        user.bio = bio
    if avatar_url is not None:
        user.avatar_url = avatar_url
    db.commit()
    db.refresh(user)
    return user


def increment_token_version(db: Session, user_id: int) -> bool:
    user = get_user(db, user_id)
    if not user:
        return False
    user.token_version = (user.token_version or 0) + 1
    db.commit()
    return True


def authenticate(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user
