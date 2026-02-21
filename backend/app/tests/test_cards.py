import re

import pytest
from httpx import AsyncClient


class TestCreateCard:
    """Tests for card creation."""

    async def test_create_card(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_board: dict,
    ):
        board_id = test_board["id"]
        list_id = test_board["lists"][0]["id"]

        response = await client.post(
            "/api/v1/cards",
            json={
                "title": "New Card",
                "list_id": list_id,
                "board_id": board_id,
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "New Card"
        assert data["list_id"] == list_id

    async def test_create_card_wrong_list(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_board: dict,
    ):
        board_id = test_board["id"]
        fake_list_id = "00000000-0000-0000-0000-000000000000"

        response = await client.post(
            "/api/v1/cards",
            json={
                "title": "Bad Card",
                "list_id": fake_list_id,
                "board_id": board_id,
            },
            headers=auth_headers,
        )
        assert response.status_code == 404


class TestUpdateCard:
    """Tests for card updates."""

    async def test_update_card(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_card: dict,
    ):
        card_id = test_card["id"]
        response = await client.patch(
            f"/api/v1/cards/{card_id}",
            json={"title": "Updated Card", "description": "New description"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Card"
        assert data["description"] == "New description"


class TestMoveCard:
    """Tests for card movement."""

    async def test_move_card_to_other_list(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_board: dict,
        test_lists: list[dict],
        test_card: dict,
    ):
        card_id = test_card["id"]
        target_list_id = test_lists[1]["id"]  # "In Progress" list

        response = await client.post(
            f"/api/v1/cards/{card_id}/move",
            json={
                "list_id": target_list_id,
                "before_rank": None,
                "after_rank": None,
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["list_id"] == target_list_id

    async def test_move_card_rank_is_valid_lexorank(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_board: dict,
        test_lists: list[dict],
        test_card: dict,
    ):
        card_id = test_card["id"]
        target_list_id = test_lists[1]["id"]

        response = await client.post(
            f"/api/v1/cards/{card_id}/move",
            json={
                "list_id": target_list_id,
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        # Rank should match "0|...:\" pattern
        assert re.match(r"^0\|[0-9a-z]+:$", data["rank"])


class TestDeleteCard:
    """Tests for card soft deletion."""

    async def test_soft_delete_card(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_board: dict,
        test_card: dict,
    ):
        card_id = test_card["id"]
        board_id = test_board["id"]

        # Delete the card
        del_resp = await client.delete(
            f"/api/v1/cards/{card_id}", headers=auth_headers
        )
        assert del_resp.status_code == 204

        # Verify card is not in board detail
        board_resp = await client.get(
            f"/api/v1/boards/{board_id}", headers=auth_headers
        )
        board_data = board_resp.json()
        all_card_ids = [
            card["id"]
            for lst in board_data["lists"]
            for card in lst["cards"]
        ]
        assert card_id not in all_card_ids
