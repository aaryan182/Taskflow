import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout, Plus, LogOut, Sparkles } from 'lucide-react';
import BoardView from './components/BoardView';
import AuthModal from './components/AuthModal';
import CreateBoardModal from './components/CreateBoardModal';
import ToastContainer from './components/Toast';
import { boardsApi } from './api/boards';
import type { Board, BoardDetail } from './types';

const queryClient = new QueryClient();

function AppContent() {
    const [isAuthenticated, setIsAuthenticated] = useState(
        !!localStorage.getItem('token')
    );
    const [boards, setBoards] = useState<Board[]>([]);
    const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isLoadingBoards, setIsLoadingBoards] = useState(false);

    const fetchBoards = async () => {
        setIsLoadingBoards(true);
        try {
            const response = await boardsApi.getAll();
            setBoards(response.data);
            if (response.data.length > 0 && !selectedBoardId) {
                setSelectedBoardId(response.data[0].id);
            }
        } catch {
            console.error('Failed to fetch boards');
        } finally {
            setIsLoadingBoards(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchBoards();
        }
    }, [isAuthenticated]);

    // Listen for forced logout from the API interceptor (e.g. expired token)
    useEffect(() => {
        const handleForcedLogout = () => {
            setIsAuthenticated(false);
            setBoards([]);
            setSelectedBoardId(null);
        };
        window.addEventListener('auth:logout', handleForcedLogout);
        return () => window.removeEventListener('auth:logout', handleForcedLogout);
    }, []);

    const handleAuth = () => {
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setBoards([]);
        setSelectedBoardId(null);
    };

    const handleBoardCreated = (board: BoardDetail) => {
        setBoards((prev) => [board, ...prev]);
        setSelectedBoardId(board.id);
        setShowCreateModal(false);
    };

    if (!isAuthenticated) {
        return (
            <>
                <div className="min-h-screen bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 flex items-center justify-center relative overflow-hidden">
                    {/* Background decorations */}
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-500/20 rounded-full blur-3xl" />
                        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-400/5 rounded-full blur-3xl" />
                    </div>
                    <AuthModal onAuth={handleAuth} />
                </div>
                <ToastContainer />
            </>
        );
    }

    if (!selectedBoardId || boards.length === 0) {
        return (
            <>
                <div className="min-h-screen bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 relative overflow-hidden">
                    {/* Background decorations */}
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-500/20 rounded-full blur-3xl" />
                        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
                    </div>

                    {/* Navbar */}
                    <div className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-white/10 backdrop-blur-sm">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                <Layout size={20} className="text-white" />
                            </div>
                            <span className="text-lg font-bold text-white tracking-tight">
                                TaskFlow
                            </span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors"
                        >
                            <LogOut size={16} />
                            Sign out
                        </button>
                    </div>

                    {/* Empty state */}
                    <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-4rem)]">
                        {isLoadingBoards ? (
                            <div className="text-center">
                                <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-white/70 text-sm">Loading your boards...</p>
                            </div>
                        ) : (
                            <div className="text-center max-w-md mx-auto px-4">
                                <div className="inline-flex p-4 bg-white/10 rounded-2xl backdrop-blur-sm mb-6">
                                    <Sparkles size={40} className="text-brand-200" />
                                </div>
                                <h2 className="text-3xl font-bold text-white mb-3">
                                    Welcome to TaskFlow
                                </h2>
                                <p className="text-brand-200 mb-8 leading-relaxed">
                                    Organize your work into boards, lists, and cards.
                                    Drag and drop to reorder. Stay productive.
                                </p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-brand-700 font-semibold rounded-xl
                    hover:bg-brand-50 transition-all shadow-lg hover:shadow-xl
                    active:scale-[0.98]"
                                >
                                    <Plus size={20} />
                                    Create your first board
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                {showCreateModal && (
                    <CreateBoardModal
                        onCreated={handleBoardCreated}
                        onClose={() => setShowCreateModal(false)}
                    />
                )}
                <ToastContainer />
            </>
        );
    }

    return (
        <>
            <div className="min-h-screen flex flex-col">
                {/* Top navbar with board selector */}
                <div className="bg-brand-900/90 backdrop-blur-sm px-4 py-2 flex items-center justify-between border-b border-white/10">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="p-1 bg-white/20 rounded-lg">
                                <Layout size={16} className="text-white" />
                            </div>
                            <span className="text-sm font-bold text-white tracking-tight">
                                TaskFlow
                            </span>
                        </div>

                        {/* Board tabs */}
                        <div className="flex items-center gap-1 ml-4">
                            {boards.map((b) => (
                                <button
                                    key={b.id}
                                    onClick={() => setSelectedBoardId(b.id)}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${b.id === selectedBoardId
                                        ? 'bg-white/20 text-white'
                                        : 'text-white/60 hover:text-white hover:bg-white/10'
                                        }`}
                                >
                                    {b.title}
                                </button>
                            ))}
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-2 py-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors"
                    >
                        <LogOut size={14} />
                        <span className="hidden sm:inline">Sign out</span>
                    </button>
                </div>

                {/* Board view */}
                <div className="flex-1">
                    <BoardView boardId={selectedBoardId} />
                </div>
            </div>
            {showCreateModal && (
                <CreateBoardModal
                    onCreated={handleBoardCreated}
                    onClose={() => setShowCreateModal(false)}
                />
            )}
            <ToastContainer />
        </>
    );
}

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AppContent />
        </QueryClientProvider>
    );
}
