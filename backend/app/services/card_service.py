import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.lexorank import LexoRank
from app.models.board import Board
from app.models.card import Card
from app.models.list import List
from app.schemas.card import CardCreate, CardMove, CardUpdate


async def create_card(
    db: AsyncSession, data: CardCreate, owner_id: uuid.UUID
) -> Card:
    """Create a new card at the end of a list."""
    # Verify board ownership
    board_result = await db.execute(
        select(Board).where(
            Board.id == data.board_id,
            Board.owner_id == owner_id,
            Board.deleted_at.is_(None),
        )
    )
    if not board_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )

    # Verify list belongs to board
    list_result = await db.execute(
        select(List).where(
            List.id == data.list_id,
            List.board_id == data.board_id,
            List.deleted_at.is_(None),
        )
    )
    if not list_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="List not found",
        )

    # Get last card rank in list
    last_rank_result = await db.execute(
        select(Card.rank)
        .where(Card.list_id == data.list_id, Card.deleted_at.is_(None))
        .order_by(Card.rank.desc())
        .limit(1)
    )
    last_rank = last_rank_result.scalar_one_or_none()

    rank = LexoRank.rank_after(last_rank) if last_rank else LexoRank.initial_rank()

    card = Card(
        title=data.title,
        list_id=data.list_id,
        board_id=data.board_id,
        rank=rank,
    )
    db.add(card)
    await db.commit()
    await db.refresh(card)
    return card


async def update_card(
    db: AsyncSession,
    card_id: uuid.UUID,
    owner_id: uuid.UUID,
    data: CardUpdate,
) -> Card:
    """Update a card's title and/or description."""
    result = await db.execute(
        select(Card)
        .join(Board, Board.id == Card.board_id)
        .where(
            Card.id == card_id,
            Board.owner_id == owner_id,
            Card.deleted_at.is_(None),
        )
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found",
        )

    if data.title is not None:
        card.title = data.title
    if data.description is not None:
        card.description = data.description

    await db.commit()
    await db.refresh(card)
    return card


async def move_card(
    db: AsyncSession,
    card_id: uuid.UUID,
    data: CardMove,
    owner_id: uuid.UUID,
) -> Card:
    """
    Move a card to a new position using SELECT FOR UPDATE (row-level lock).
    
    Concurrency handling:
    - User A's transaction acquires the lock first
    - User B's transaction WAITS (blocks) until A commits
    - When B proceeds, it reads the UPDATED card state
    """
    # 1. SELECT the card FOR UPDATE (row-level lock) — skip on SQLite
    query = select(Card).where(Card.id == card_id, Card.deleted_at.is_(None))
    
    # SQLite doesn't support FOR UPDATE — only lock in production (PostgreSQL)
    dialect = db.bind.dialect.name if db.bind else ""
    if dialect != "sqlite":
        query = query.with_for_update()
    
    result = await db.execute(query)
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found",
        )

    # 2. Verify board ownership
    board_result = await db.execute(
        select(Board).where(
            Board.id == card.board_id,
            Board.owner_id == owner_id,
            Board.deleted_at.is_(None),
        )
    )
    if not board_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )

    # 3. Verify target list exists and is active
    target_list_result = await db.execute(
        select(List).where(
            List.id == data.list_id,
            List.deleted_at.is_(None),
        )
    )
    if not target_list_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target list not found",
        )

    # 4. Compute new rank
    new_rank = LexoRank.rank_between(data.before_rank, data.after_rank)

    # 5. Check for rank collision in target list
    collision_result = await db.execute(
        select(func.count())
        .select_from(Card)
        .where(
            Card.list_id == data.list_id,
            Card.rank == new_rank,
            Card.id != card_id,
            Card.deleted_at.is_(None),
        )
    )
    collision_count = collision_result.scalar()
    if collision_count and collision_count > 0:
        # Conflict resolution: extend the rank
        new_rank = LexoRank.parse(new_rank)
        new_rank = f"0|{new_rank}i:"

    # 6. Update card
    card.list_id = data.list_id
    card.rank = new_rank

    await db.commit()
    await db.refresh(card)
    return card


async def soft_delete_card(
    db: AsyncSession, card_id: uuid.UUID, owner_id: uuid.UUID
) -> None:
    """Soft delete a card."""
    result = await db.execute(
        select(Card)
        .join(Board, Board.id == Card.board_id)
        .where(
            Card.id == card_id,
            Board.owner_id == owner_id,
            Card.deleted_at.is_(None),
        )
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found",
        )

    card.deleted_at = datetime.now(timezone.utc)
    await db.commit()
