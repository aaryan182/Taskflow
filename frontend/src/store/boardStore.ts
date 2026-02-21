import { create } from 'zustand';
import type { BoardDetail, Card } from '../types';

interface BoardStore {
    board: BoardDetail | null;
    isLoading: boolean;
    error: string | null;

    setBoard: (board: BoardDetail) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;

    // Optimistic move: immediately updates local state
    optimisticMoveCard: (
        cardId: string,
        sourceListId: string,
        destListId: string,
        newRank: string,
        newIndex: number
    ) => void;

    // Rollback if API fails: restore previous state
    rollbackCard: (previousBoard: BoardDetail) => void;

    // Sync card after API success: update rank from server response
    syncCard: (updatedCard: Card) => void;

    // Add a card to a list
    addCard: (card: Card) => void;

    // Remove a card
    removeCard: (cardId: string, listId: string) => void;

    // Add a list
    addList: (list: { id: string; title: string; rank: string; board_id: string; cards: Card[] }) => void;
}

export const useBoardStore = create<BoardStore>((set) => ({
    board: null,
    isLoading: false,
    error: null,

    setBoard: (board) => set({ board, isLoading: false, error: null }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error, isLoading: false }),

    optimisticMoveCard: (cardId, sourceListId, destListId, newRank, newIndex) =>
        set((state) => {
            if (!state.board) return state;

            const board = JSON.parse(JSON.stringify(state.board)) as BoardDetail;

            // Find and remove card from source list
            const sourceList = board.lists.find((l) => l.id === sourceListId);
            if (!sourceList) return state;

            const cardIndex = sourceList.cards.findIndex((c) => c.id === cardId);
            if (cardIndex === -1) return state;

            const [card] = sourceList.cards.splice(cardIndex, 1);
            card.rank = newRank;
            card.list_id = destListId;

            // Add card to destination list
            const destList = board.lists.find((l) => l.id === destListId);
            if (!destList) return state;

            destList.cards.splice(newIndex, 0, card);

            // Re-sort by rank
            destList.cards.sort((a, b) => a.rank.localeCompare(b.rank));

            return { board };
        }),

    rollbackCard: (previousBoard) =>
        set({ board: JSON.parse(JSON.stringify(previousBoard)) }),

    syncCard: (updatedCard) =>
        set((state) => {
            if (!state.board) return state;

            const board = JSON.parse(JSON.stringify(state.board)) as BoardDetail;

            for (const list of board.lists) {
                const cardIndex = list.cards.findIndex((c) => c.id === updatedCard.id);
                if (cardIndex !== -1) {
                    list.cards[cardIndex].rank = updatedCard.rank;
                    list.cards[cardIndex].list_id = updatedCard.list_id;
                    list.cards.sort((a, b) => a.rank.localeCompare(b.rank));
                    break;
                }
            }

            return { board };
        }),

    addCard: (card) =>
        set((state) => {
            if (!state.board) return state;

            const board = JSON.parse(JSON.stringify(state.board)) as BoardDetail;
            const list = board.lists.find((l) => l.id === card.list_id);
            if (!list) return state;

            list.cards.push(card);
            list.cards.sort((a, b) => a.rank.localeCompare(b.rank));

            return { board };
        }),

    removeCard: (cardId, listId) =>
        set((state) => {
            if (!state.board) return state;

            const board = JSON.parse(JSON.stringify(state.board)) as BoardDetail;
            const list = board.lists.find((l) => l.id === listId);
            if (!list) return state;

            list.cards = list.cards.filter((c) => c.id !== cardId);
            return { board };
        }),

    addList: (newList) =>
        set((state) => {
            if (!state.board) return state;

            const board = JSON.parse(JSON.stringify(state.board)) as BoardDetail;
            board.lists.push(newList);
            board.lists.sort((a, b) => a.rank.localeCompare(b.rank));
            return { board };
        }),
}));
