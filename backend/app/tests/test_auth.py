import pytest
from httpx import AsyncClient


class TestRegister:
    """Tests for user registration."""

    async def test_register_success(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "new@test.com",
                "password": "password123",
                "full_name": "New User",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "new@test.com"
        assert data["full_name"] == "New User"
        assert "id" in data

    async def test_register_duplicate_email(
        self, client: AsyncClient, auth_headers: dict
    ):
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@test.com",
                "password": "password123",
                "full_name": "Duplicate User",
            },
        )
        assert response.status_code == 409

    async def test_register_weak_password(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "weak@test.com",
                "password": "short",
                "full_name": "Weak Pass User",
            },
        )
        assert response.status_code == 422


class TestLogin:
    """Tests for user login."""

    async def test_login_success(self, client: AsyncClient, auth_headers: dict):
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@test.com", "password": "password123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password(
        self, client: AsyncClient, auth_headers: dict
    ):
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "test@test.com", "password": "wrongpass"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert response.status_code == 401

    async def test_protected_route_no_token(self, client: AsyncClient):
        response = await client.get("/api/v1/boards/")
        assert response.status_code == 401
