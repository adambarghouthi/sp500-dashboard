from datetime import datetime, date
from sqlalchemy import (
    String,
    DateTime,
    Date,
    Index,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class Note(Base):
    __tablename__ = "notes"

    __table_args__ = (
        Index("ix_notes_ticker", "ticker"),
        Index("ix_notes_date", "date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ticker: Mapped[str] = mapped_column(String(16), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    body: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Note id={self.id} ticker={self.ticker} date={self.date}>"
