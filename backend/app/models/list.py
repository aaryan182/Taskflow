import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class List(TimestampMixin, Base):
    """Kanban list (column) within a board, ordered by LexoRank."""

    __tablename__ = "lists"
    __table_args__ = (
        UniqueConstraint("board_id", "rank", name="uq_list_board_rank"),
    )

    board_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("boards.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    rank: Mapped[str] = mapped_column(String(255), nullable=False)

    # Relationships
    board = relationship("Board", back_populates="lists")
    cards = relationship(
        "Card",
        back_populates="list",
        order_by="Card.rank",
        lazy="selectin",
        cascade="all, delete-orphan",
    )
