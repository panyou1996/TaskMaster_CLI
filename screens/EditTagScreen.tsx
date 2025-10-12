import React, { useState, useEffect } from 'react';
import { CheckIcon, TrashIcon, RefreshSpinnerIcon } from '../components/icons/Icons';

interface EditTagScreenProps {
  isOpen: boolean;
  onClose: () => void;
  tagName: string | null;
  onSaveTag: (oldName: string, newName: string) => Promise<void>;
  onDeleteTag: (tagName: string) => void;
}

const EditTagScreen: React.FC<EditTagScreenProps> = ({ isOpen, onClose, tagName, onSaveTag, onDeleteTag }) => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && tagName) {
            setName(tagName);
            setLoading(false);
            setError(null);
        }
    }, [isOpen, tagName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !tagName) {
            setError("Tag name is required.");
            return;
        }
        if (name.trim() === tagName) {
            onClose();
            return;
        }
        
        setLoading(true);
        setError(null);

        try {
            await onSaveTag(tagName, name.trim());
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save changes.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        if (tagName) {
            onDeleteTag(tagName);
        }
    }
    
    const CloseIcon: React.FC = () => (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    );

    return (
        <div className={`fixed inset-0 z-50 flex items-end transition-all duration-300 ${isOpen ? 'visible' : 'invisible'}`}>
            <div
                className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                className={`w-full bg-[var(--color-surface-container-low)] dark:bg-gray-900 rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out transform ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-tag-title"
            >
                <header className="pt-3 px-4 pb-3 border-b border-[var(--color-border)] bg-[var(--color-surface-container)] rounded-t-3xl sticky top-0 z-10">
                    <div className="w-8 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-3" />
                    <div className="flex justify-between items-center h-8">
                        <button onClick={handleDelete} className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-functional-red)] rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <TrashIcon />
                        </button>
                        <h2 id="edit-tag-title" className="text-base font-bold text-[var(--color-text-primary)]">Edit Tag</h2>
                        <button type="submit" form="edit-tag-form" disabled={loading} className="p-1 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50">
                             {loading ? <RefreshSpinnerIcon /> : <CheckIcon />}
                        </button>
                    </div>
                </header>
                
                <form id="edit-tag-form" onSubmit={handleSubmit}>
                    <div
                        className="p-4 space-y-6 overflow-y-auto max-h-[75vh] pb-24"
                        style={{ paddingBottom: `calc(6rem + env(safe-area-inset-bottom))` }}
                    >
                        {error && <p className="text-[var(--color-functional-red)] text-sm text-center -mt-4 mb-2 px-4 bg-red-50 dark:bg-red-900/20 py-2 rounded-lg">{error}</p>}
                        
                        <div className="bg-[var(--color-surface-container)] p-4 rounded-xl card-shadow space-y-4">
                            <div>
                                <label htmlFor="tag-name-edit" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Tag Name</label>
                                <input
                                    id="tag-name-edit"
                                    type="text"
                                    placeholder="e.g. Reading"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="w-full px-4 py-2.5 bg-[var(--color-surface-container-low)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditTagScreen;
