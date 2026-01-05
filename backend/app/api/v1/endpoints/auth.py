from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.schemas.auth import LoginRequest, SignupRequest, Token
from app.services import auth_service, user_service
from app.core.config import settings
from app.core.database import get_db
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookie(response: Response, token: str) -> None:
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


def _clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.AUTH_COOKIE_NAME,
        path=settings.AUTH_COOKIE_PATH,
        domain=settings.AUTH_COOKIE_DOMAIN
    )


@router.post("/login", response_model=Token)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
) -> Token:
    result = auth_service.login(db, payload.email, payload.password, request)
    if not result:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token, reset_required = result
    _set_auth_cookie(response, token)
    return Token(access_token=token, reset_required=reset_required)


@router.post("/signup", response_model=Token)
async def signup(
    payload: SignupRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
) -> Token:
    existing = user_service.get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    try:
        token = auth_service.signup(db, payload.email, payload.password, payload.full_name, request)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    _set_auth_cookie(response, token)
    return Token(access_token=token, reset_required=False)


@router.post("/logout", response_model=dict)
async def logout(
    response: Response,
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    user_service.increment_token_version(db, user.id)
    _clear_auth_cookie(response)
    return {"status": "ok"}
