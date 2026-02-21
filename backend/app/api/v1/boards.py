import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.schemas.board import BoardCreate, BoardDetailOut, BoardOut, BoardUpdate
from app.services import board_service

router = APIRouter(prefix="/api/v1/boards", tags=["boards"])


@router.get("/", response_model=list[BoardOut])
async def get_boards(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get all non-deleted boards for the current user."""
    return await board_service.get_boards(db, current_user.id)


@router.post("/", response_model=BoardDetailOut, status_code=status.HTTP_201_CREATED)
async def create_board(
    data: BoardCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Create a new board with a default 'To Do' list."""
    return await board_service.create_board(db, data, current_user.id)


@router.get("/{board_id}", response_model=BoardDetailOut)
async def get_board_detail(
    board_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Get board with all active lists and cards (single query, no N+1)."""
    return await board_service.get_board_detail(db, board_id, current_user.id)


@router.patch("/{board_id}", response_model=BoardOut)
async def update_board(
    board_id: uuid.UUID,
    data: BoardUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Update board title and/or description."""
    return await board_service.update_board(db, board_id, current_user.id, data)


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_board(
    board_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a board and cascade to its lists and cards."""
    await board_service.soft_delete_board(db, board_id, current_user.id)
