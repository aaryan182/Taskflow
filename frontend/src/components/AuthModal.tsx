import { useState } from 'react';
import { Layout, X } from 'lucide-react';
import { authApi } from '../api/auth';

interface AuthModalProps {
    onAuth: () => void;
}

export default function AuthModal({ onAuth }: AuthModalProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (!isLogin) {
                await authApi.register({ email, password, full_name: fullName || undefined });
            }
            const response = await authApi.login(email, password);
            localStorage.setItem('token', response.data.access_token);
            onAuth();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { detail?: string } } };
            setError(error.response?.data?.detail || 'Authentication failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <Layout size={24} />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">TaskFlow</h1>
                    </div>
                    <p className="text-brand-100 text-sm">
                        {isLogin ? 'Welcome back! Sign in to continue.' : 'Create your account to get started.'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent
                  transition-all"
                                placeholder="John Doe"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent
                transition-all"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm
                focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent
                transition-all"
                            placeholder="Min. 8 characters"
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-fade-in">
                            <X size={16} />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-brand-600 text-white font-semibold rounded-xl
              hover:bg-brand-700 transition-all shadow-md hover:shadow-lg
              disabled:opacity-50 disabled:cursor-not-allowed
              active:scale-[0.98]"
                    >
                        {isLoading ? (
                            <span className="inline-flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Processing...
                            </span>
                        ) : isLogin ? 'Sign In' : 'Create Account'}
                    </button>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                            }}
                            className="text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
                        >
                            {isLogin
                                ? "Don't have an account? Sign up"
                                : 'Already have an account? Sign in'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
