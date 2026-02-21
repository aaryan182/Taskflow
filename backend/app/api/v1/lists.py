import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.schemas.board import ListOut
from app.schemas.list import ListCreate, ListUpdate
from app.services import list_service

router = APIRouter(prefix="/api/v1/lists", tags=["lists"])


@router.post("/", response_model=ListOut, status_code=status.HTTP_201_CREATED)
async def create_list(
    data: ListCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Create a new list in a board with LexoRank positioning."""
    return await list_service.create_list(db, data, current_user.id)


@router.patch("/{list_id}", response_model=ListOut)
async def update_list(
    list_id: uuid.UUID,
    data: ListUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Update a list's title."""
    return await list_service.update_list(db, list_id, current_user.id, data)


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_list(
    list_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a list and all its cards."""
    await list_service.soft_delete_list(db, list_id, current_user.id)
