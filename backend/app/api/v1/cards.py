import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.schemas.board import CardOut
from app.schemas.card import CardCreate, CardMove, CardUpdate
from app.services import card_service

router = APIRouter(prefix="/api/v1/cards", tags=["cards"])


@router.post("/", response_model=CardOut, status_code=status.HTTP_201_CREATED)
async def create_card(
    data: CardCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Create a new card at the end of a list."""
    return await card_service.create_card(db, data, current_user.id)


@router.patch("/{card_id}", response_model=CardOut)
async def update_card(
    card_id: uuid.UUID,
    data: CardUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Update a card's title and/or description."""
    return await card_service.update_card(db, card_id, current_user.id, data)


@router.post("/{card_id}/move", response_model=CardOut)
async def move_card(
    card_id: uuid.UUID,
    data: CardMove,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Move a card to a new position with concurrency-safe locking."""
    return await card_service.move_card(db, card_id, data, current_user.id)


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_card(
    card_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a card."""
    await card_service.soft_delete_card(db, card_id, current_user.id)
