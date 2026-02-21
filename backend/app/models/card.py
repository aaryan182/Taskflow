import uuid

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Card(TimestampMixin, Base):
    """Kanban card within a list, ordered by LexoRank."""

    __tablename__ = "cards"
    __table_args__ = (
        UniqueConstraint("list_id", "rank", name="uq_card_list_rank"),
    )

    list_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("lists.id"), nullable=False, index=True
    )
    board_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("boards.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    rank: Mapped[str] = mapped_column(String(255), nullable=False)

    # Relationships
    list = relationship("List", back_populates="cards")
