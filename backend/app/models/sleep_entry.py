from sqlalchemy import BigInteger, Column, Date, DateTime, Float, ForeignKey, Index
from sqlalchemy.sql import func

from app.models.base import Base


class SleepEntry(Base):
    __tablename__ = "sleep_entries"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sleep_date = Column(Date, nullable=False, index=True)
    duration_hours = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    __table_args__ = (
        Index("idx_sleep_entries_user_date", "user_id", "sleep_date", unique=True),
    )
