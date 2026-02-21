import pytest
from httpx import AsyncClient


class TestCreateBoard:
    """Tests for board creation."""

    async def test_create_board(self, client: AsyncClient, auth_headers: dict):
        response = await client.post(
            "/api/v1/boards",
            json={"title": "New Board", "description": "Test description"},
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "New Board"
        assert len(data["lists"]) == 1
        assert data["lists"][0]["title"] == "To Do"

    async def test_get_boards_empty(self, client: AsyncClient):
        # Register a fresh user with no boards
        await client.post(
            "/api/v1/auth/register",
            json={
                "email": "empty@test.com",
                "password": "password123",
            },
        )
        login_resp = await client.post(
            "/api/v1/auth/login",
            data={"username": "empty@test.com", "password": "password123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.get("/api/v1/boards/", headers=headers)
        assert response.status_code == 200
        assert response.json() == []


class TestBoardDetail:
    """Tests for board detail retrieval."""

    async def test_get_board_detail(
        self, client: AsyncClient, auth_headers: dict, test_board: dict
    ):
        board_id = test_board["id"]
        response = await client.get(
            f"/api/v1/boards/{board_id}", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test Board"
        assert "lists" in data

    async def test_get_board_not_found(
        self, client: AsyncClient, auth_headers: dict
    ):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(
            f"/api/v1/boards/{fake_id}", headers=auth_headers
        )
        assert response.status_code == 404


class TestBoardUpdate:
    """Tests for board updates."""

    async def test_update_board_title(
        self, client: AsyncClient, auth_headers: dict, test_board: dict
    ):
        board_id = test_board["id"]
        response = await client.patch(
            f"/api/v1/boards/{board_id}",
            json={"title": "Updated Title"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["title"] == "Updated Title"


class TestBoardDelete:
    """Tests for board soft deletion."""

    async def test_delete_board_soft(
        self, client: AsyncClient, auth_headers: dict, test_board: dict
    ):
        board_id = test_board["id"]

        # Delete the board
        delete_resp = await client.delete(
            f"/api/v1/boards/{board_id}", headers=auth_headers
        )
        assert delete_resp.status_code == 204

        # Verify it's gone
        get_resp = await client.get(
            f"/api/v1/boards/{board_id}", headers=auth_headers
        )
        assert get_resp.status_code == 404

    async def test_other_user_cannot_access_board(
        self, client: AsyncClient, auth_headers: dict, test_board: dict
    ):
        board_id = test_board["id"]

        # Register another user
        await client.post(
            "/api/v1/auth/register",
            json={
                "email": "other@test.com",
                "password": "password123",
            },
        )
        login_resp = await client.post(
            "/api/v1/auth/login",
            data={"username": "other@test.com", "password": "password123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        other_token = login_resp.json()["access_token"]
        other_headers = {"Authorization": f"Bearer {other_token}"}

        response = await client.get(
            f"/api/v1/boards/{board_id}", headers=other_headers
        )
        assert response.status_code == 404
