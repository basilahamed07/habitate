from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.schemas.user import (
    PasswordUpdate,
    PasswordChange,
    UserCreate,
    UserListResponse,
    UserProfile,
    UserProfileUpdate,
    UserUpdate
)
from app.services import habit_service, user_service
from app.core.security import create_access_token
from app.core.database import get_db
from app.utils.dependencies import get_current_user, require_admin
from app.core.config import settings

router = APIRouter(prefix="/users", tags=["users"])


def _serialize_user(db: Session, user) -> dict:
    joined = user.created_at.date().isoformat() if user.created_at else ""
    return {
        "id": user.id,
        "name": user.full_name,
        "email": user.email,
        "status": user.status,
        "joined": joined,
        "habits": habit_service.get_habit_count(db, user.id)
    }


@router.get("", response_model=UserListResponse)
async def list_users(
    _admin=Depends(require_admin),
    db: Session = Depends(get_db)
) -> UserListResponse:
    users = user_service.list_users(db)
    payload = [_serialize_user(db, user) for user in users]
    return UserListResponse(users=payload, total=len(payload))


@router.get("/me", response_model=UserProfile)
async def get_me(user=Depends(get_current_user)) -> UserProfile:
    return UserProfile(
        id=user.id,
        name=user.full_name,
        email=user.email,
        status=user.status,
        bio=user.bio,
        avatarUrl=user.avatar_url
    )


@router.post("/me", response_model=UserProfile)
async def update_me(
    payload: UserProfileUpdate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
) -> UserProfile:
    if payload.email:
        existing = user_service.get_user_by_email(db, payload.email)
        if existing and existing.id != user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    updated = user_service.update_profile(
        db,
        user.id,
        payload.name,
        payload.email,
        payload.bio,
        payload.avatarUrl
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserProfile(
        id=updated.id,
        name=updated.full_name,
        email=updated.email,
        status=updated.status,
        bio=updated.bio,
        avatarUrl=updated.avatar_url
    )


@router.post("", response_model=dict)
async def create_user(
    payload: UserCreate,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    existing = user_service.get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    status_value = "pending_reset" if payload.require_reset else "active"
    user = user_service.create_user(db, payload.name, payload.email, payload.password, status=status_value)
    users = user_service.list_users(db)
    serialized = [_serialize_user(db, item) for item in users]
    return {"user": _serialize_user(db, user), "users": serialized, "total": len(serialized)}


@router.post("/{user_id:int}", response_model=dict)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    user = user_service.update_user(db, user_id, payload.name, payload.email, payload.status)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    users = user_service.list_users(db)
    serialized = [_serialize_user(db, item) for item in users]
    return {"users": serialized, "total": len(serialized)}


@router.post("/{user_id:int}/password", response_model=dict)
async def change_password(
    user_id: int,
    payload: PasswordUpdate,
    _admin=Depends(require_admin),
    db: Session = Depends(get_db)
) -> dict:
    updated = user_service.update_password(db, user_id, payload.password)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {"status": "ok"}


@router.post("/me/password", response_model=dict)
async def change_my_password(
    payload: PasswordChange,
    response: Response,
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    if user.status != "pending_reset" and not payload.currentPassword:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is required"
        )
    if payload.currentPassword:
        authenticated = user_service.authenticate(db, user.email, payload.currentPassword)
        if not authenticated:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
    updated = user_service.update_password(db, user.id, payload.newPassword)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.status == "pending_reset":
        user_service.update_user(db, user.id, None, None, "active")
    refreshed = user_service.get_user(db, user.id)
    token = create_access_token(
        subject=str(user.id),
        token_version=refreshed.token_version if refreshed else 0
    )
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        max_age=settings.AUTH_COOKIE_MAX_AGE,
        path=settings.AUTH_COOKIE_PATH,
        domain=settings.AUTH_COOKIE_DOMAIN
    )
    return {"status": "ok"}
