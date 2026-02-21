import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.lexorank import LexoRank
from app.models.board import Board
from app.models.card import Card
from app.models.list import List
from app.schemas.list import ListCreate, ListUpdate


async def create_list(
    db: AsyncSession, data: ListCreate, owner_id: uuid.UUID
) -> List:
    """Create a new list in a board with proper LexoRank positioning."""
    # Verify board exists and belongs to owner
    board_result = await db.execute(
        select(Board).where(
            Board.id == data.board_id,
            Board.owner_id == owner_id,
            Board.deleted_at.is_(None),
        )
    )
    board = board_result.scalar_one_or_none()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )

    # Fetch existing list ranks
    ranks_result = await db.execute(
        select(List.rank)
        .where(List.board_id == data.board_id, List.deleted_at.is_(None))
        .order_by(List.rank)
    )
    existing_ranks = list(ranks_result.scalars().all())

    # Compute rank
    if not existing_ranks:
        rank = LexoRank.initial_rank()
    elif data.after_rank:
        # Find the rank after the specified one
        try:
            idx = existing_ranks.index(data.after_rank)
            if idx + 1 < len(existing_ranks):
                rank = LexoRank.rank_between(data.after_rank, existing_ranks[idx + 1])
            else:
                rank = LexoRank.rank_after(data.after_rank)
        except ValueError:
            rank = LexoRank.rank_after(existing_ranks[-1])
    else:
        rank = LexoRank.rank_after(existing_ranks[-1])

    new_list = List(
        board_id=data.board_id,
        title=data.title,
        rank=rank,
    )
    db.add(new_list)
    await db.commit()
    await db.refresh(new_list)
    return new_list


async def update_list(
    db: AsyncSession,
    list_id: uuid.UUID,
    owner_id: uuid.UUID,
    data: ListUpdate,
) -> List:
    """Update a list's title."""
    result = await db.execute(
        select(List)
        .join(Board, Board.id == List.board_id)
        .where(
            List.id == list_id,
            Board.owner_id == owner_id,
            List.deleted_at.is_(None),
        )
    )
    lst = result.scalar_one_or_none()
    if not lst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="List not found",
        )

    if data.title is not None:
        lst.title = data.title

    await db.commit()
    await db.refresh(lst)
    return lst


async def soft_delete_list(
    db: AsyncSession, list_id: uuid.UUID, owner_id: uuid.UUID
) -> None:
    """Soft delete a list and all its active cards in one transaction."""
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(List)
        .join(Board, Board.id == List.board_id)
        .where(
            List.id == list_id,
            Board.owner_id == owner_id,
            List.deleted_at.is_(None),
        )
    )
    lst = result.scalar_one_or_none()
    if not lst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="List not found",
        )

    lst.deleted_at = now

    # Cascade to cards
    cards_result = await db.execute(
        select(Card).where(Card.list_id == list_id, Card.deleted_at.is_(None))
    )
    cards = cards_result.scalars().all()
    for card in cards:
        card.deleted_at = now

    await db.commit()
