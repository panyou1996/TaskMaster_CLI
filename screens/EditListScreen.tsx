import React, { useState, useEffect } from 'react';
import { CheckIcon, TrashIcon, RefreshSpinnerIcon } from '../components/icons/Icons';
import { TaskList } from '../data/mockData';

interface EditListScreenProps {
  isOpen: boolean;
  onClose: () => void;
  list: TaskList | null;
  onSaveList: (listData: TaskList) => Promise<void>;
  onDeleteList: (listId: number) => void;
}

const colors = ['green', 'blue', 'pink', 'purple', 'yellow', 'red', 'orange'];
const icons = ['🛒', '💼', '💪', '✈️', '🎁', '💡', '🏠', '❤️', '🎉', '📚', '💰', '🎵'];

const EditListScreen: React.FC<EditListScreenProps> = ({ isOpen, onClose, list, onSaveList, onDeleteList }) => {
    const [name, setName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('🛒');
    const [selectedColor, setSelectedColor] = useState('green');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && list) {
            setName(list.name);
            setSelectedIcon(list.icon);
            setSelectedColor(list.color);
            setLoading(false);
            setError(null);
        }
    }, [isOpen, list]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !list) {
            setError("List name is required.");
            return;
        }
        
        setLoading(true);
        setError(null);

        try {
            await onSaveList({
                ...list,
                name,
                icon: selectedIcon,
                color: selectedColor,
            });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save changes.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        if (list && window.confirm(`Are you sure you want to delete the "${list.name}" list? All tasks within it will be moved to your default list.`)) {
            onDeleteList(list.id);
        }
    }
    
    const colorVariants = {
        green: { bg: 'bg-green-500', ring: 'ring-green-500' },
        blue: { bg: 'bg-blue-500', ring: 'ring-blue-500' },
        pink: { bg: 'bg-pink-500', ring: 'ring-pink-500' },
        purple: { bg: 'bg-purple-500', ring: 'ring-purple-500' },
        yellow: { bg: 'bg-yellow-500', ring: 'ring-yellow-500' },
        red: { bg: 'bg-red-500', ring: 'ring-red-500' },
        orange: { bg: 'bg-orange-500', ring: 'ring-orange-500' },
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
                aria-labelledby="edit-list-title"
            >
                <header className="pt-3 px-4 pb-3 border-b border-gray-200 bg-white rounded-t-3xl sticky top-0 z-10">
                    <div className="w-8 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
                    <div className="flex justify-between items-center h-8">
                        <button onClick={handleDelete} className="p-1 text-gray-500 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors">
                            <TrashIcon />
                        </button>
                        <h2 id="edit-list-title" className="text-base font-bold text-gray-900">Edit List</h2>
                        <button type="submit" form="edit-list-form" disabled={loading} className="p-1 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50 transition-colors disabled:opacity-50">
                             {loading ? <RefreshSpinnerIcon /> : <CheckIcon />}
                        </button>
                    </div>
                </header>
                
                <form id="edit-list-form" onSubmit={handleSubmit}>
                    <div
                        className="p-4 space-y-6 overflow-y-auto max-h-[75vh] pb-24"
                        style={{ paddingBottom: `calc(6rem + env(safe-area-inset-bottom))` }}
                    >
                        {error && <p className="text-red-500 text-sm text-center -mt-4 mb-2 px-4 bg-red-50 py-2 rounded-lg">{error}</p>}
                        
                        <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                            <div>
                                <label htmlFor="list-name-edit" className="block text-sm font-medium text-gray-700 mb-1">List Name</label>
                                <input
                                    id="list-name-edit"
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

export default EditListScreen;