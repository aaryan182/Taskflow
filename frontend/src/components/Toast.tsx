import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface ToastProps {
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
}

function ToastItem({ message, type, onClose }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm
        animate-slide-up max-w-sm
        ${type === 'success'
                    ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800'
                    : 'bg-red-50/90 border-red-200 text-red-800'
                }
      `}
        >
            {type === 'success' ? (
                <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
            ) : (
                <XCircle size={18} className="text-red-500 flex-shrink-0" />
            )}
            <p className="text-sm font-medium flex-1">{message}</p>
            <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            >
                <X size={14} />
            </button>
        </div>
    );
}

// Global toast state
type ToastItem = { id: number; message: string; type: 'success' | 'error' };
let toastListeners: Array<(toasts: ToastItem[]) => void> = [];
let toasts: ToastItem[] = [];
let nextId = 0;

function notifyListeners() {
    toastListeners.forEach((listener) => listener([...toasts]));
}

export const toast = {
    success: (message: string) => {
        toasts = [...toasts, { id: nextId++, message, type: 'success' }];
        notifyListeners();
    },
    error: (message: string) => {
        toasts = [...toasts, { id: nextId++, message, type: 'error' }];
        notifyListeners();
    },
};

export default function ToastContainer() {
    const [items, setItems] = useState<ToastItem[]>([]);

    useEffect(() => {
        toastListeners.push(setItems);
        return () => {
            toastListeners = toastListeners.filter((l) => l !== setItems);
        };
    }, []);

    const handleClose = (id: number) => {
        toasts = toasts.filter((t) => t.id !== id);
        notifyListeners();
    };

    return createPortal(
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
            {items.map((item) => (
                <ToastItem
                    key={item.id}
                    message={item.message}
                    type={item.type}
                    onClose={() => handleClose(item.id)}
                />
            ))}
        </div>,
        document.body
    );
}
