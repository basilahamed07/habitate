from sqlalchemy import BigInteger, Column, Date, ForeignKey
from sqlalchemy.dialects.postgresql import BIT

from app.models.base import Base


class HabitMonthlyBits(Base):
    __tablename__ = "habit_monthly_bits"

    habit_id = Column(BigInteger, ForeignKey("habits.id", ondelete="CASCADE"), primary_key=True)
    month = Column(Date, primary_key=True)
    day_bits = Column(BIT(31), nullable=False)
