from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.services import user_service

bearer_scheme = HTTPBearer(auto_error=False)


def get_request(request: Request) -> Request:
    return request


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"}
    )
    token = None
    if credentials:
        token = credentials.credentials
    if not token:
        token = request.cookies.get(settings.AUTH_COOKIE_NAME)
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        subject = payload.get("sub")
        if subject is None:
            raise credentials_exception
        user_id = int(subject)
        token_version = int(payload.get("ver", 0))
    except (JWTError, ValueError):
        raise credentials_exception
    user = user_service.get_user(db, user_id)
    if not user:
        raise credentials_exception
    if (user.token_version or 0) != token_version:
        raise credentials_exception
    return user


def require_admin(user=Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
