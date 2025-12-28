from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.schemas.habit import HabitCreate, HabitToggle, HabitsResponse
from app.services import habit_service, user_service
from app.core.database import get_db
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/habits", tags=["habits"])


@router.get("", response_model=HabitsResponse)
async def list_habits(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
    user_id: int | None = Query(default=None, alias="userId")
) -> HabitsResponse:
    target_user_id = user.id
    if user_id is not None and user.role == "admin":
        if not user_service.get_user(db, user_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        target_user_id = user_id
    data = habit_service.list_habits(db, target_user_id)
    return HabitsResponse(**data)


@router.post("", response_model=dict)
async def add_habit(
    payload: HabitCreate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Habit name is required")
    return habit_service.add_habit(db, user.id, name)


@router.post("/{habit_id}/toggle", response_model=dict)
async def toggle_habit(
    habit_id: int,
    payload: HabitToggle,
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    if payload.dayIndex < 0 or payload.dayIndex >= habit_service.DAYS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid day index")
    result = habit_service.toggle_habit(db, user.id, habit_id, payload.dayIndex, payload.done)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")
    return result


@router.delete("/{habit_id}", response_model=dict)
async def delete_habit(
    habit_id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    deleted = habit_service.delete_habit(db, user.id, habit_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit not found")
    return {"status": "ok"}
