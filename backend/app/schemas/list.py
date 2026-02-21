import uuid

from pydantic import BaseModel


class ListCreate(BaseModel):
    """Schema for creating a new list."""
    title: str
    board_id: uuid.UUID
    after_rank: str | None = None


class ListUpdate(BaseModel):
    """Schema for updating a list."""
    title: str | None = None
