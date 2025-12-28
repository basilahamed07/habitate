from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.schemas.dashboard import DashboardResponse
from app.services import habit_service, user_service
from app.core.database import get_db
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
    user_id: int | None = Query(default=None, alias="userId")
) -> DashboardResponse:
    target_user_id = user.id
    if user_id is not None and user.role == "admin":
        if not user_service.get_user(db, user_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        target_user_id = user_id
    data = habit_service.get_dashboard(db, target_user_id)
    return DashboardResponse(**data)
