from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.sleep import SleepCreate, SleepResponse
from app.services import sleep_service, user_service
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/sleep", tags=["sleep"])


@router.get("", response_model=SleepResponse)
async def list_sleep(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
    user_id: int | None = Query(default=None, alias="userId")
) -> SleepResponse:
    target_user_id = user.id
    if user_id is not None and user.role == "admin":
        if not user_service.get_user(db, user_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        target_user_id = user_id
    data = sleep_service.list_sleep(db, target_user_id)
    return SleepResponse(**data)


@router.post("", response_model=SleepResponse)
async def upsert_sleep(
    payload: SleepCreate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
) -> SleepResponse:
    if payload.hours < 0 or payload.hours > 24:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid hours")
    sleep_service.upsert_sleep(db, user.id, payload.date, payload.hours)
    data = sleep_service.list_sleep(db, user.id)
    return SleepResponse(**data)


@router.delete("/{entry_id}", response_model=dict)
async def delete_sleep(
    entry_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    deleted = sleep_service.delete_sleep(db, user.id, entry_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sleep entry not found")
    return {"status": "ok"}
