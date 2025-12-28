from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Habitat"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/habits"
    SECRET_KEY: str = "change_me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    TRACK_WINDOW_DAYS: int = 30
    CORS_ORIGINS: str = "*"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
