import uuid

from pydantic import BaseModel


class CardCreate(BaseModel):
    """Schema for creating a new card."""
    title: str
    list_id: uuid.UUID
    board_id: uuid.UUID


class CardUpdate(BaseModel):
    """Schema for updating a card."""
    title: str | None = None
    description: str | None = None


class CardMove(BaseModel):
    """
    Schema for moving a card to a new position.
    
    list_id: target list
    before_rank: rank of card just above target position (None if moving to start)
    after_rank: rank of card just below target position (None if moving to end)
    """
    list_id: uuid.UUID
    before_rank: str | None = None
    after_rank: str | None = None
