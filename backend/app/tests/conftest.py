import asyncio
import os
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Set test database URL BEFORE importing the app
os.environ["TEST_DATABASE_URL"] = "sqlite+aiosqlite:///./test.db"

from app.core.database import Base, get_db
from app.main import app

# Create test-specific engine
test_engine = create_async_engine(
    "sqlite+aiosqlite:///./test.db",
    echo=False,
    connect_args={"check_same_thread": False},
)

test_session = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with test_session() as session:
        try:
            yield session
        finally:
            await session.close()


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture(scope="session")
def event_loop():
    """Create an instance of the event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    """Create and tear down the test database for each test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test", follow_redirects=True) as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient) -> dict:
    """Register a test user and return auth headers."""
    # Register
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@test.com",
            "password": "password123",
            "full_name": "Test User",
        },
    )
    # Login
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": "test@test.com", "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def test_board(client: AsyncClient, auth_headers: dict) -> dict:
    """Create a test board and return the response JSON."""
    response = await client.post(
        "/api/v1/boards",
        json={"title": "Test Board", "description": "A test board"},
        headers=auth_headers,
    )
    return response.json()


@pytest_asyncio.fixture
async def test_lists(
    client: AsyncClient, auth_headers: dict, test_board: dict
) -> list[dict]:
    """Create 2 additional lists on the test board (board already has 'To Do')."""
    board_id = test_board["id"]

    resp1 = await client.post(
        "/api/v1/lists",
        json={"title": "In Progress", "board_id": board_id},
        headers=auth_headers,
    )
    resp2 = await client.post(
        "/api/v1/lists",
        json={"title": "Done", "board_id": board_id},
        headers=auth_headers,
    )

    # Return all lists including the default "To Do"
    return test_board["lists"] + [resp1.json(), resp2.json()]


@pytest_asyncio.fixture
async def test_card(
    client: AsyncClient, auth_headers: dict, test_board: dict
) -> dict:
    """Create a test card on the first list."""
    board_id = test_board["id"]
    list_id = test_board["lists"][0]["id"]

    response = await client.post(
        "/api/v1/cards",
        json={
            "title": "Test Card",
            "list_id": list_id,
            "board_id": board_id,
        },
        headers=auth_headers,
    )
    return response.json()
