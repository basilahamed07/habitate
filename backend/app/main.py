from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logger import setup_logging
from app.utils.error_handlers import register_error_handlers


def create_app() -> FastAPI:
    setup_logging()
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

    if settings.SECURITY_HEADERS:
        @app.middleware("http")
        async def add_security_headers(request, call_next):
            response = await call_next(request)
            response.headers.setdefault("Content-Security-Policy", settings.CSP_POLICY)
            response.headers.setdefault("X-Content-Type-Options", "nosniff")
            response.headers.setdefault("X-Frame-Options", "DENY")
            response.headers.setdefault("Referrer-Policy", "no-referrer")
            response.headers.setdefault("Permissions-Policy", "geolocation=()")
            return response

    app.include_router(api_router, prefix=settings.API_V1_STR)
    register_error_handlers(app)
    return app


app = create_app()
