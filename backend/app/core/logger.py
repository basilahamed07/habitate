import logging
import os

LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "logs")
AUTH_LOG_PATH = os.path.join(LOG_DIR, "auth", "auth.log")


def setup_logging() -> None:
    os.makedirs(os.path.dirname(AUTH_LOG_PATH), exist_ok=True)

    auth_logger = logging.getLogger("auth")
    auth_logger.setLevel(logging.INFO)

    if not any(isinstance(handler, logging.FileHandler) for handler in auth_logger.handlers):
        handler = logging.FileHandler(AUTH_LOG_PATH)
        formatter = logging.Formatter(
            "%(asctime)s | %(levelname)s | %(message)s"
        )
        handler.setFormatter(formatter)
        auth_logger.addHandler(handler)


def get_auth_logger() -> logging.Logger:
    return logging.getLogger("auth")
