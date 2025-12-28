from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine
from app.core.logger import setup_logging
from app.models import Base
from app.utils.error_handlers import register_error_handlers


def create_app() -> FastAPI:
    setup_logging()
    Base.metadata.create_all(bind=engine)
    app = FastAPI(title=settings.PROJECT_NAME)
    origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
    allow_all = "*" in origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if allow_all else origins,
        allow_credentials=False if allow_all else True,
        allow_methods=["*"],
        allow_headers=["*"]
    )
    app.include_router(api_router, prefix=settings.API_V1_STR)
    register_error_handlers(app)
    return app


app = create_app()
