from datetime import timedelta
from typing import Optional, Tuple

from fastapi import Request

from app.core.config import settings
from app.core.logger import get_auth_logger
from app.core.security import create_access_token
from sqlalchemy.orm import Session

from app.services import user_service


def _log_auth_event(event: str, email: str, request: Request, success: bool) -> None:
    logger = get_auth_logger()
    ip_address = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    logger.info(
        "%s | %s | success=%s | ip=%s | agent=%s",
        event,
        email,
        success,
        ip_address,
        user_agent
    )


def login(db: Session, email: str, password: str, request: Request) -> Optional[Tuple[str, bool]]:
    user = user_service.authenticate(db, email, password)
    if not user:
        _log_auth_event("login_failed", email, request, False)
        return None
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        subject=str(user.id),
        expires_delta=access_token_expires,
        token_version=user.token_version or 0
    )
    _log_auth_event("login_success", email, request, True)
    reset_required = user.status == "pending_reset"
    return token, reset_required


def signup(
    db: Session,
    email: str,
    password: str,
    full_name: str,
    request: Request
) -> str:
    user = user_service.create_user(db, full_name, email, password)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        subject=str(user.id),
        expires_delta=access_token_expires,
        token_version=user.token_version or 0
    )
    _log_auth_event("signup", email, request, True)
    return token
