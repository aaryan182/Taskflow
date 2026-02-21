import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.lexorank import LexoRank
from app.models.board import Board
from app.models.card import Card
from app.models.list import List
from app.schemas.board import BoardCreate, BoardUpdate


async def create_board(
    db: AsyncSession, data: BoardCreate, owner_id: uuid.UUID
) -> Board:
    """Create a new board with a default 'To Do' list."""
    board = Board(
        title=data.title,
        description=data.description,
        owner_id=owner_id,
    )
    db.add(board)
    await db.flush()

    # Create default "To Do" list
    default_list = List(
        board_id=board.id,
        title="To Do",
        rank=LexoRank.initial_rank(),
    )
    db.add(default_list)
    await db.commit()
    await db.refresh(board)

    # Eager load lists for the response
    result = await db.execute(
        select(Board)
        .where(Board.id == board.id)
        .options(selectinload(Board.lists).selectinload(List.cards))
    )
    return result.scalar_one()


async def get_boards(db: AsyncSession, owner_id: uuid.UUID) -> list[Board]:
    """Get all non-deleted boards for a user, ordered by creation date."""
    result = await db.execute(
        select(Board)
        .where(Board.owner_id == owner_id, Board.deleted_at.is_(None))
        .order_by(Board.created_at.desc())
    )
    return list(result.scalars().all())


async def get_board_detail(
    db: AsyncSession, board_id: uuid.UUID, owner_id: uuid.UUID
) -> Board:
    """
    Get board with all active lists and cards using selectinload.
    Generates exactly 3 queries (board + lists + cards) — no N+1.
    """
    result = await db.execute(
        select(Board)
        .where(
            Board.id == board_id,
            Board.owner_id == owner_id,
            Board.deleted_at.is_(None),
        )
        .options(selectinload(Board.lists).selectinload(List.cards))
    )
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )

    # Filter out soft-deleted lists and cards in-memory
    board.lists = [lst for lst in board.lists if lst.deleted_at is None]
    for lst in board.lists:
        lst.cards = [card for card in lst.cards if card.deleted_at is None]

    return board


async def update_board(
    db: AsyncSession,
    board_id: uuid.UUID,
    owner_id: uuid.UUID,
    data: BoardUpdate,
) -> Board:
    """Update a board's title and/or description."""
    result = await db.execute(
        select(Board).where(
            Board.id == board_id,
            Board.owner_id == owner_id,
            Board.deleted_at.is_(None),
        )
    )
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )

    if data.title is not None:
        board.title = data.title
    if data.description is not None:
        board.description = data.description

    await db.commit()
    await db.refresh(board)
    return board


async def soft_delete_board(
    db: AsyncSession, board_id: uuid.UUID, owner_id: uuid.UUID
) -> None:
    """
    Soft delete a board and cascade to all its lists and cards.
    Single transaction — commit once.
    """
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(Board).where(
            Board.id == board_id,
            Board.owner_id == owner_id,
            Board.deleted_at.is_(None),
        )
    )
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )

    board.deleted_at = now

    # Cascade soft delete to lists
    lists_result = await db.execute(
        select(List).where(List.board_id == board_id, List.deleted_at.is_(None))
    )
    lists = lists_result.scalars().all()
    for lst in lists:
        lst.deleted_at = now

    # Cascade soft delete to cards
    cards_result = await db.execute(
        select(Card).where(Card.board_id == board_id, Card.deleted_at.is_(None))
    )
    cards = cards_result.scalars().all()
    for card in cards:
        card.deleted_at = now

    await db.commit()
