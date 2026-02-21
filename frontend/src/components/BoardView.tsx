import { useEffect, useState, useCallback } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
} from '@dnd-kit/core';
import {
    SortableContext,
    horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Layout, Plus, RefreshCw, Users } from 'lucide-react';
import ListColumn from './ListColumn';
import CardItem from './CardItem';
import BoardSkeleton from './Skeleton';
import { toast } from './Toast';
import { boardsApi } from '../api/boards';
import { cardsApi } from '../api/cards';
import { listsApi } from '../api/lists';
import { useBoardStore } from '../store/boardStore';
import { lexoRankBetween } from '../utils/lexorank';
import type { Card, BoardDetail } from '../types';

interface BoardViewProps {
    boardId: string;
}

export default function BoardView({ boardId }: BoardViewProps) {
    const {
        board,
        isLoading,
        error,
        setBoard,
        setLoading,
        setError,
        optimisticMoveCard,
        rollbackCard,
        syncCard,
        addList,
    } = useBoardStore();

    const [activeCard, setActiveCard] = useState<Card | null>(null);
    const [isAddingList, setIsAddingList] = useState(false);
    const [newListTitle, setNewListTitle] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const fetchBoard = useCallback(async () => {
        setLoading(true);
        try {
            const response = await boardsApi.getDetail(boardId);
            setBoard(response.data);
        } catch {
            setError('Failed to load board');
        }
    }, [boardId, setBoard, setLoading, setError]);

    useEffect(() => {
        fetchBoard();
    }, [fetchBoard]);

    const findListByCardId = (cardId: string): string | null => {
        if (!board) return null;
        for (const list of board.lists) {
            if (list.cards.some((c) => c.id === cardId)) {
                return list.id;
            }
        }
        return null;
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        if (!board) return;

        for (const list of board.lists) {
            const card = list.cards.find((c) => c.id === active.id);
            if (card) {
                setActiveCard(card);
                break;
            }
        }
    };

    const handleDragOver = (_event: DragOverEvent) => {
        // Visual feedback only — we handle the actual move in handleDragEnd
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveCard(null);

        if (!over || !board) return;
        if (active.id === over.id) return;

        const sourceListId = findListByCardId(active.id as string);
        if (!sourceListId) return;

        // Determine target list: could be a card or a list itself
        let destListId = findListByCardId(over.id as string);
        if (!destListId) {
            // `over` is a list container itself
            destListId = over.id as string;
        }

        const destList = board.lists.find((l) => l.id === destListId);
        if (!destList) return;

        // Find the target index
        const overCardIndex = destList.cards.findIndex((c) => c.id === over.id);
        const targetIndex = overCardIndex >= 0 ? overCardIndex : destList.cards.length;

        // Determine before/after ranks for LexoRank computation
        let beforeRank: string | null = null;
        let afterRank: string | null = null;

        if (sourceListId === destListId) {
            // Same list reorder
            const filteredCards = destList.cards.filter((c) => c.id !== active.id);
            if (targetIndex > 0) {
                beforeRank = filteredCards[targetIndex - 1]?.rank || null;
            }
            afterRank = filteredCards[targetIndex]?.rank || null;
        } else {
            // Cross-list move
            if (targetIndex > 0) {
                beforeRank = destList.cards[targetIndex - 1]?.rank || null;
            }
            afterRank = destList.cards[targetIndex]?.rank || null;
        }

        // Compute optimistic rank client-side
        const optimisticRank = lexoRankBetween(beforeRank, afterRank);

        // Save snapshot for rollback
        const snapshot = JSON.parse(JSON.stringify(board)) as BoardDetail;

        // OPTIMISTIC UPDATE — immediate, no waiting
        optimisticMoveCard(
            active.id as string,
            sourceListId,
            destListId,
            optimisticRank,
            targetIndex
        );

        // API call (async, non-blocking)
        try {
            const updated = await cardsApi.move(active.id as string, {
                list_id: destListId,
                before_rank: beforeRank,
                after_rank: afterRank,
            });
            syncCard(updated.data);
        } catch {
            // ROLLBACK on failure
            rollbackCard(snapshot);
            toast.error('Failed to move card. Changes reverted.');
        }
    };

    const handleAddList = async () => {
        if (!newListTitle.trim() || !board) return;

        try {
            const response = await listsApi.create({
                title: newListTitle.trim(),
                board_id: board.id,
            });
            addList({ ...response.data, cards: [] });
            setNewListTitle('');
            setIsAddingList(false);
            toast.success('List created!');
        } catch {
            toast.error('Failed to create list');
        }
    };

    const handleDeleteList = async (listId: string) => {
        try {
            await listsApi.delete(listId);
            fetchBoard(); // Refresh to get updated state
            toast.success('List deleted');
        } catch {
            toast.error('Failed to delete list');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800">
                <div className="p-4 border-b border-white/10 backdrop-blur-sm">
                    <div className="h-8 w-48 bg-white/20 rounded animate-pulse" />
                </div>
                <BoardSkeleton />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 flex items-center justify-center">
                <div className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-sm">
                    <div className="text-6xl mb-4">😵</div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        Oops! Something went wrong
                    </h2>
                    <p className="text-brand-200 mb-6 text-sm">{error}</p>
                    <button
                        onClick={fetchBoard}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-brand-700 font-semibold rounded-xl hover:bg-brand-50 transition-all shadow-lg"
                    >
                        <RefreshCw size={16} />
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!board) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800">
            {/* Board Header */}
            <div className="px-6 py-4 border-b border-white/10 backdrop-blur-sm bg-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                <Layout size={20} className="text-white" />
                            </div>
                            <h1 className="text-xl font-bold text-white tracking-tight">
                                {board.title}
                            </h1>
                        </div>
                        {board.description && (
                            <span className="text-brand-200 text-sm hidden md:block">
                                {board.description}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-brand-200 text-sm">
                            <Users size={16} />
                            <span>3 members</span>
                        </div>
                        <button className="px-4 py-2 bg-white/15 text-white text-sm font-medium rounded-lg hover:bg-white/25 transition-all backdrop-blur-sm border border-white/10">
                            Share
                        </button>
                    </div>
                </div>
            </div>

            {/* Board Content */}
            <div className="p-6 overflow-x-auto">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex gap-4 items-start">
                        <SortableContext
                            items={board.lists.map((l) => l.id)}
                            strategy={horizontalListSortingStrategy}
                        >
                            {board.lists.map((list) => (
                                <ListColumn
                                    key={list.id}
                                    list={list}
                                    boardId={board.id}
                                    onDeleteList={handleDeleteList}
                                />
                            ))}
                        </SortableContext>

                        {/* Add List */}
                        {isAddingList ? (
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 w-72 flex-shrink-0 border border-white/10 animate-fade-in">
                                <input
                                    type="text"
                                    value={newListTitle}
                                    onChange={(e) => setNewListTitle(e.target.value)}
                                    placeholder="Enter list title..."
                                    autoFocus
                                    className="w-full px-3 py-2 bg-white rounded-lg text-sm border-0 focus:outline-none focus:ring-2 focus:ring-brand-400 shadow-sm"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddList();
                                        if (e.key === 'Escape') {
                                            setIsAddingList(false);
                                            setNewListTitle('');
                                        }
                                    }}
                                />
                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={handleAddList}
                                        className="px-3 py-1.5 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors"
                                    >
                                        Add list
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsAddingList(false);
                                            setNewListTitle('');
                                        }}
                                        className="px-3 py-1.5 text-white/70 text-sm hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsAddingList(true)}
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white
                  backdrop-blur-sm rounded-xl px-4 py-3 w-72 flex-shrink-0 text-sm font-medium
                  transition-all border border-white/10 hover:border-white/20"
                            >
                                <Plus size={18} />
                                Add another list
                            </button>
                        )}
                    </div>

                    {/* Drag Overlay */}
                    <DragOverlay>
                        {activeCard ? (
                            <div className="rotate-3 shadow-2xl">
                                <CardItem
                                    card={activeCard}
                                    listId=""
                                    onDelete={() => { }}
                                />
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    );
}
