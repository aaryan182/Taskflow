"""
LexoRank Algorithm Implementation

LexoRank uses base-36 string ordering for efficient item reordering.
Format: "0|{rank_value}:" where rank_value is a base-36 string.

Moving an item only requires updating ONE row — the moved item's rank string.
We compute the new rank by finding the alphabetic midpoint between its neighbors.
"""


class LexoRank:
    """LexoRank implementation for efficient list/card ordering."""

    CHARSET = "0123456789abcdefghijklmnopqrstuvwxyz"  # base-36
    BASE = len(CHARSET)  # 36
    MID = "hzzzzz"  # Middle value
    MIN_CHAR = CHARSET[0]  # '0'
    MAX_CHAR = CHARSET[-1]  # 'z'
    DEFAULT_LENGTH = 6

    @staticmethod
    def parse(rank: str) -> str:
        """Strip bucket prefix '0|' and suffix ':' to get the core value."""
        if rank.startswith("0|"):
            rank = rank[2:]
        if rank.endswith(":"):
            rank = rank[:-1]
        return rank

    @staticmethod
    def encode(value: int, length: int = 6) -> str:
        """Convert integer to base-36 string of given length, zero-padded."""
        if value == 0:
            return LexoRank.MIN_CHAR * length
        
        result = []
        while value > 0:
            result.append(LexoRank.CHARSET[value % LexoRank.BASE])
            value //= LexoRank.BASE
        
        result.reverse()
        encoded = "".join(result)
        
        # Zero-pad to desired length
        if len(encoded) < length:
            encoded = LexoRank.MIN_CHAR * (length - len(encoded)) + encoded
        
        return encoded

    @staticmethod
    def decode(s: str) -> int:
        """Convert base-36 string to integer."""
        result = 0
        for char in s:
            result = result * LexoRank.BASE + LexoRank.CHARSET.index(char)
        return result

    @staticmethod
    def initial_rank() -> str:
        """Returns the starting rank for the first item."""
        return f"0|{LexoRank.MID}:"

    @staticmethod
    def rank_between(before: str | None, after: str | None) -> str:
        """
        Compute a rank string between two adjacent ranks.
        
        Args:
            before: The rank of the item before the target position (or None if inserting at start)
            after: The rank of the item after the target position (or None if inserting at end)
        
        Returns:
            A new rank string that sorts between before and after.
        """
        if before is None and after is None:
            return LexoRank.initial_rank()

        if before is None:
            # Insert before the first item
            after_val = LexoRank.parse(after)
            after_int = LexoRank.decode(after_val)
            new_int = after_int // 2
            if new_int == 0:
                new_int = 1
            new_val = LexoRank.encode(new_int, len(after_val))
            if new_val >= after_val:
                # Too close — use string extension
                new_val = after_val[:len(after_val)] + "i"
                # Actually, prepend a character before
                new_val = LexoRank.encode(new_int, len(after_val))
                if new_val >= after_val:
                    new_val = after_val + "i"
                    # Find midpoint by reducing
                    after_int_ext = LexoRank.decode(after_val + LexoRank.MAX_CHAR)
                    min_int_ext = 0
                    mid_ext = (min_int_ext + after_int_ext) // 2
                    new_val = LexoRank.encode(mid_ext, len(after_val) + 1)
            return f"0|{new_val}:"

        if after is None:
            # Insert after the last item
            before_val = LexoRank.parse(before)
            before_int = LexoRank.decode(before_val)
            max_int = LexoRank.BASE ** len(before_val) - 1
            new_int = before_int + (max_int - before_int) * 3 // 4
            if new_int <= before_int:
                new_int = before_int + 1
            new_val = LexoRank.encode(new_int, len(before_val))
            if new_val <= before_val:
                new_val = before_val + "i"
            return f"0|{new_val}:"

        # Insert between two items
        before_val = LexoRank.parse(before)
        after_val = LexoRank.parse(after)

        # Normalize lengths
        max_len = max(len(before_val), len(after_val))
        before_padded = before_val.ljust(max_len, LexoRank.MIN_CHAR)
        after_padded = after_val.ljust(max_len, LexoRank.MIN_CHAR)

        before_int = LexoRank.decode(before_padded)
        after_int = LexoRank.decode(after_padded)

        mid_int = (before_int + after_int) // 2
        mid_val = LexoRank.encode(mid_int, max_len)

        if mid_val <= before_padded or mid_val >= after_padded:
            # Too close — extend with a middle character
            mid_val = before_val + "i"

        return f"0|{mid_val}:"

    @staticmethod
    def generate_n_ranks(n: int) -> list[str]:
        """
        Generate n evenly-spaced ranks for initial list population.
        Distributes evenly between "000000" and "zzzzzz" in base-36 space.
        """
        if n <= 0:
            return []

        max_int = LexoRank.BASE**LexoRank.DEFAULT_LENGTH - 1
        step = max_int // (n + 1)
        ranks = []

        for i in range(1, n + 1):
            val = step * i
            rank_str = LexoRank.encode(val, LexoRank.DEFAULT_LENGTH)
            ranks.append(f"0|{rank_str}:")

        return ranks

    @staticmethod
    def rank_before(rank: str) -> str:
        """Convenience: compute a rank before the given rank."""
        return LexoRank.rank_between(None, rank)

    @staticmethod
    def rank_after(rank: str) -> str:
        """Convenience: compute a rank after the given rank."""
        return LexoRank.rank_between(rank, None)
