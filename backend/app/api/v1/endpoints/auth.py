from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.schemas.auth import LoginRequest, SignupRequest, Token
from app.services import auth_service, user_service
from app.core.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
async def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> Token:
    token = auth_service.login(db, payload.email, payload.password, request)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return Token(access_token=token)


@router.post("/signup", response_model=Token)
async def signup(payload: SignupRequest, request: Request, db: Session = Depends(get_db)) -> Token:
    existing = user_service.get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    token = auth_service.signup(db, payload.email, payload.password, payload.full_name, request)
    return Token(access_token=token)
