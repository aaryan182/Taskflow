import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Board(TimestampMixin, Base):
    """Kanban board model owned by a user."""

    __tablename__ = "boards"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )

    # Relationships
    owner = relationship("User", back_populates="boards")
    lists = relationship(
        "List",
        back_populates="board",
        order_by="List.rank",
        lazy="selectin",
        cascade="all, delete-orphan",
    )
