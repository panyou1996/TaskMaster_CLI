import React, { useState, useEffect } from 'react';
import { CheckIcon, RefreshSpinnerIcon } from '../components/icons/Icons';

export interface NewListData {
    name: string;
    icon: string;
    color: string;
}

interface AddListScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onAddList: (listData: NewListData) => Promise<void>;
}

const colors = ['green', 'blue', 'pink', 'purple', 'yellow', 'red', 'orange', 'teal', 'cyan', 'indigo', 'lime', 'amber', 'rose', 'fuchsia'];
const icons = ['🛒', '💼', '💪', '✈️', '🎁', '💡', '🏠', '❤️', '🎉', '📚', '💰', '🎵', '💻', '🌱', '🎨', '🍽️', '🎬', '🏀', '🐾', '💊', '🛠️', '💬', '✨', '📍'];

const AddListScreen: React.FC<AddListScreenProps> = ({ isOpen, onClose, onAddList }) => {
    const [name, setName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('🛒');
    const [selectedColor, setSelectedColor] = useState('green');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Reset state when modal opens
            setName('');
            setSelectedIcon('🛒');
            setSelectedColor('green');
            setLoading(false);
            setError(null);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError("List name is required.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await onAddList({
                name,
                icon: selectedIcon,
                color: selectedColor,
            });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create list.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    
    const CloseIcon: React.FC = () => (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
    
    const colorVariants = {
        green: { bg: 'bg-green-500', ring: 'ring-green-500' },
        blue: { bg: 'bg-blue-500', ring: 'ring-blue-500' },
        pink: { bg: 'bg-pink-500', ring: 'ring-pink-500' },
        purple: { bg: 'bg-purple-500', ring: 'ring-purple-500' },
        yellow: { bg: 'bg-yellow-500', ring: 'ring-yellow-500' },
        red: { bg: 'bg-red-500', ring: 'ring-red-500' },
        orange: { bg: 'bg-orange-500', ring: 'ring-orange-500' },
        teal: { bg: 'bg-teal-500', ring: 'ring-teal-500' },
        cyan: { bg: 'bg-cyan-500', ring: 'ring-cyan-500' },
        indigo: { bg: 'bg-indigo-500', ring: 'ring-indigo-500' },
        lime: { bg: 'bg-lime-500', ring: 'ring-lime-500' },
        amber: { bg: 'bg-amber-500', ring: 'ring-amber-500' },
        rose: { bg: 'bg-rose-500', ring: 'ring-rose-500' },
        fuchsia: { bg: 'bg-fuchsia-500', ring: 'ring-fuchsia-500' },
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-end transition-all duration-300 ${isOpen ? 'visible' : 'invisible'}`}>
            <div
                className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                className={`w-full bg-gray-50 rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out transform ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-list-title"
            >
                <header className="pt-3 px-4 pb-3 border-b border-gray-200 bg-white rounded-t-3xl sticky top-0 z-10">
                    <div className="w-8 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
                    <div className="flex justify-between items-center h-8">
                        <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100">
                            <CloseIcon />
                        </button>
                        <h2 id="add-list-title" className="text-base font-bold text-gray-900">Add New List</h2>
                        <button type="submit" form="add-list-form" disabled={loading} className="p-1 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50 transition-colors disabled:opacity-50">
                            {loading ? <RefreshSpinnerIcon /> : <CheckIcon />}
                        </button>
                    </div>
                </header>
                
                <form id="add-list-form" onSubmit={handleSubmit}>
                    <div
                        className="p-4 space-y-6 overflow-y-auto max-h-[75vh] pb-24"
                        style={{ paddingBottom: `calc(6rem + env(safe-area-inset-bottom))` }}
                    >
                        {error && <p className="text-red-500 text-sm text-center -mt-4 mb-2 px-4 bg-red-50 py-2 rounded-lg">{error}</p>}

                        <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                            <div>
                                <label htmlFor="list-name" className="block text-sm font-medium text-gray-700 mb-1">List Name</label>
                                <input
                                    id="list-name"
                                    type="text"
                                    placeholder="e.g. Home Project"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl shadow-sm">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                            <div className="grid grid-cols-6 gap-2">
                                {icons.map(icon => (
                                    <button
                                        type="button"
                                        key={icon}
                                        onClick={() => setSelectedIcon(icon)}
                                        className={`flex items-center justify-center text-2xl w-12 h-12 rounded-lg transition-all ${selectedIcon === icon ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-gray-100 hover:bg-gray-200'}`}
                                    >
                                        {icon}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl shadow-sm">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                            <div className="flex flex-wrap gap-3">
                                {colors.map(color => {
                                    const variant = colorVariants[color as keyof typeof colorVariants];
                                    return (
                                        <button
                                            type="button"
                                            key={color}
                                            onClick={() => setSelectedColor(color)}
                                            className={`w-10 h-10 rounded-full transition-all ${variant.bg} ${selectedColor === color ? `ring-2 ring-offset-2 ${variant.ring}` : ''}`}
                                            aria-label={`Select ${color} color`}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddListScreen;
