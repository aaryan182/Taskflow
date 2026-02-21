import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Card } from '../types';

interface CardItemProps {
    card: Card;
    listId: string;
    onDelete: (cardId: string, listId: string) => void;
}

export default function CardItem({ card, listId, onDelete }: CardItemProps) {
    const [isHovered, setIsHovered] = useState(false);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: card.id,
        data: {
            type: 'card',
            card,
            listId,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group relative bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-2 
        cursor-grab active:cursor-grabbing transition-all duration-200
        hover:shadow-md hover:border-brand-300
        ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-brand-400 rotate-2' : ''}
      `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            {...attributes}
            {...listeners}
        >
            <div className="flex items-start gap-2">
                <div className="mt-0.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical size={14} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 leading-snug">
                        {card.title}
                    </p>
                    {card.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {card.description}
                        </p>
                    )}
                </div>
                {isHovered && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(card.id, listId);
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded"
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}
