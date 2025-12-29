from fastapi import APIRouter

from app.api.v1.endpoints import admin, auth, dashboard, habits, health, sleep, users

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(habits.router)
api_router.include_router(sleep.router)
api_router.include_router(users.router)
api_router.include_router(admin.router)
