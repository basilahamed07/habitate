from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Habitat"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/habits"
    SECRET_KEY: str = "change_me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    TRACK_WINDOW_DAYS: int = 30
    CORS_ORIGINS: str = "http://localhost:3000"
    AUTH_COOKIE_NAME: str = "habitat_auth"
    AUTH_COOKIE_SECURE: bool = False
    AUTH_COOKIE_SAMESITE: str = "lax"
    AUTH_COOKIE_PATH: str = "/"
    AUTH_COOKIE_DOMAIN: str | None = None
    AUTH_COOKIE_MAX_AGE: int = ACCESS_TOKEN_EXPIRE_MINUTES * 60
    SECURITY_HEADERS: bool = True
    CSP_POLICY: str = "default-src 'none'; frame-ancestors 'none'; base-uri 'none';"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
