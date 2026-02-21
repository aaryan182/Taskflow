import pytest
from httpx import AsyncClient


class TestLexoRank:
    """Tests for the LexoRank algorithm."""

    def test_initial_rank(self):
        from app.core.lexorank import LexoRank
        assert LexoRank.initial_rank() == "0|hzzzzz:"

    def test_rank_between_two_values(self):
        from app.core.lexorank import LexoRank
        a = "0|aaaaaa:"
        b = "0|zzzzzz:"
        mid = LexoRank.rank_between(a, b)
        assert a < mid < b

    def test_rank_before_first(self):
        from app.core.lexorank import LexoRank
        first = "0|hzzzzz:"
        before = LexoRank.rank_between(None, first)
        assert before < first

    def test_rank_after_last(self):
        from app.core.lexorank import LexoRank
        last = "0|hzzzzz:"
        after = LexoRank.rank_between(last, None)
        assert after > last

    def test_generate_n_ranks(self):
        from app.core.lexorank import LexoRank
        ranks = LexoRank.generate_n_ranks(5)
        assert len(ranks) == 5
        assert ranks == sorted(ranks)
        assert all(r.startswith("0|") and r.endswith(":") for r in ranks)

    def test_rank_between_no_collision(self):
        from app.core.lexorank import LexoRank
        ranks = ["0|hzzzzz:"]
        for _ in range(100):
            new_rank = LexoRank.rank_between(None, ranks[0])
            assert new_rank not in ranks
            assert new_rank < ranks[0]
            ranks.insert(0, new_rank)
