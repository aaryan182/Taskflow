import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import CardItem from './CardItem';
import type { List } from '../types';
import { cardsApi } from '../api/cards';
import { useBoardStore } from '../store/boardStore';

interface ListColumnProps {
    list: List;
    boardId: string;
    onDeleteList: (listId: string) => void;
}

export default function ListColumn({ list, boardId, onDeleteList }: ListColumnProps) {
    const [isAddingCard, setIsAddingCard] = useState(false);
    const [newCardTitle, setNewCardTitle] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { addCard, removeCard } = useBoardStore();

    const { setNodeRef } = useDroppable({
        id: list.id,
        data: {
            type: 'list',
            list,
        },
    });

    const handleAddCard = async () => {
        if (!newCardTitle.trim()) return;

        try {
            const response = await cardsApi.create({
                title: newCardTitle.trim(),
                list_id: list.id,
                board_id: boardId,
            });
            addCard(response.data);
            setNewCardTitle('');
            setIsAddingCard(false);
        } catch {
            console.error('Failed to create card');
        }
    };

    const handleDeleteCard = async (cardId: string, listId: string) => {
        try {
            await cardsApi.delete(cardId);
            removeCard(cardId, listId);
        } catch {
            console.error('Failed to delete card');
        }
    };

    const cardIds = list.cards.map((c) => c.id);

    return (
        <div className="bg-gray-100/80 backdrop-blur-sm rounded-xl p-3 w-72 flex-shrink-0 flex flex-col max-h-[calc(100vh-10rem)] border border-gray-200/50 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-gray-800 tracking-tight">
                        {list.title}
                    </h3>
                    <span className="bg-gray-200 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                        {list.cards.length}
                    </span>
                </div>
                <div className="relative">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-200"
                    >
                        <MoreHorizontal size={16} />
                    </button>
                    {isMenuOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setIsMenuOpen(false)}
                            />
                            <div className="absolute right-0 top-8 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px] animate-fade-in">
                                <button
                                    onClick={() => {
                                        onDeleteList(list.id);
                                        setIsMenuOpen(false);
                                    }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 size={14} />
                                    Delete list
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Cards */}
            <div
                ref={setNodeRef}
                className="flex-1 overflow-y-auto space-y-0 min-h-[2rem] scrollbar-thin"
            >
                <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
                    {list.cards.map((card) => (
                        <CardItem
                            key={card.id}
                            card={card}
                            listId={list.id}
                            onDelete={handleDeleteCard}
                        />
                    ))}
                </SortableContext>
            </div>

            {/* Add Card */}
            {isAddingCard ? (
                <div className="mt-2 animate-fade-in">
                    <textarea
                        className="w-full p-2 text-sm border border-brand-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 shadow-sm"
                        placeholder="Enter card title..."
                        rows={2}
                        value={newCardTitle}
                        onChange={(e) => setNewCardTitle(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddCard();
                            }
                            if (e.key === 'Escape') {
                                setIsAddingCard(false);
                                setNewCardTitle('');
                            }
                        }}
                        autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                        <button
                            onClick={handleAddCard}
                            className="px-3 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
                        >
                            Add card
                        </button>
                        <button
                            onClick={() => {
                                setIsAddingCard(false);
                                setNewCardTitle('');
                            }}
                            className="px-3 py-1.5 text-gray-600 text-sm hover:text-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setIsAddingCard(true)}
                    className="mt-2 flex items-center gap-1.5 w-full px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200/70 rounded-lg transition-all"
                >
                    <Plus size={16} />
                    Add a card
                </button>
            )}
        </div>
    );
}
