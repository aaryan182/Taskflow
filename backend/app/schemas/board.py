import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CardOut(BaseModel):
    """Schema for card in API responses."""
    id: uuid.UUID
    title: str
    description: str | None
    rank: str
    list_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class ListOut(BaseModel):
    """Schema for list in API responses, includes nested cards."""
    id: uuid.UUID
    title: str
    rank: str
    board_id: uuid.UUID
    cards: list[CardOut] = []

    model_config = {"from_attributes": True}


class BoardCreate(BaseModel):
    """Schema for creating a new board."""
    title: str = Field(..., min_length=1)
    description: str | None = None


class BoardUpdate(BaseModel):
    """Schema for updating a board."""
    title: str | None = None
    description: str | None = None


class BoardOut(BaseModel):
    """Schema for board in API responses."""
    id: uuid.UUID
    title: str
    description: str | None
    owner_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class BoardDetailOut(BoardOut):
    """Schema for detailed board response with nested lists and cards."""
    lists: list[ListOut] = []
