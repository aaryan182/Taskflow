import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { boardsApi } from '../api/boards';
import type { BoardDetail } from '../types';

interface CreateBoardModalProps {
    onCreated: (board: BoardDetail) => void;
    onClose: () => void;
}

export default function CreateBoardModal({ onCreated, onClose }: CreateBoardModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsLoading(true);
        try {
            const response = await boardsApi.create({
                title: title.trim(),
                description: description.trim() || undefined,
            });
            onCreated(response.data);
        } catch {
            console.error('Failed to create board');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-slide-up">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800">Create New Board</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleCreate} className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Board Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            autoFocus
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent
                transition-all"
                            placeholder="e.g., Sprint 23"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Description (optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm resize-none
                focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent
                transition-all"
                            placeholder="What's this board about?"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={isLoading || !title.trim()}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-600 text-white font-semibold rounded-xl
                hover:bg-brand-700 transition-all shadow-md
                disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={18} />
                            Create Board
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
