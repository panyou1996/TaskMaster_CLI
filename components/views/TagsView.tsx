import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { TagIcon, TrashIcon, ChevronRightIcon, PlusIconHeader } from '../icons/Icons';
import ConfirmationModal from '../common/ConfirmationModal';

const TagsView: React.FC = () => {
    const { moments, tags: allTags, addTag, deleteTag } = useData();
    const navigate = useNavigate();
    const [newTag, setNewTag] = useState('');
    const [tagToDelete, setTagToDelete] = useState<string | null>(null);

    const tagData = useMemo(() => {
        const counts = new Map<string, number>();
        const recentMoments = new Map<string, string>();

        moments.forEach(moment => {
            moment.tags?.forEach(tag => {
                counts.set(tag, (counts.get(tag) || 0) + 1);
                if (!recentMoments.has(tag)) {
                    recentMoments.set(tag, moment.imageUrl);
                }
            });
        });

        // Ensure all tags from the master list are included, even if count is 0
        allTags.forEach(tag => {
            if (!counts.has(tag)) {
                counts.set(tag, 0);
            }
        });

        return Array.from(counts.entries())
            .map(([name, count]) => ({
                name,
                count,
                imageUrl: recentMoments.get(name),
            }))
            .sort((a, b) => b.count - a.count);

    }, [moments, allTags]);

    const handleAddTag = () => {
        if (newTag.trim()) {
            addTag(newTag.trim());
            setNewTag('');
        }
    };

    const handleDeleteClick = (tagName: string) => {
        setTagToDelete(tagName);
    };

    const handleConfirmDelete = async () => {
        if (tagToDelete) {
            await deleteTag(tagToDelete);
            setTagToDelete(null);
        }
    };
    
    const totalCheckins = useMemo(() => tagData.reduce((sum, tag) => sum + tag.count, 0), [tagData]);

    return (
        <>
            <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl card-shadow text-center">
                        <p className="text-2xl font-bold text-purple-600">{tagData.length}</p>
                        <p className="text-sm text-gray-500 mt-1">Total Tags</p>
                    </div>
                     <div className="bg-white p-4 rounded-xl card-shadow text-center">
                        <p className="text-2xl font-bold text-purple-600">{totalCheckins}</p>
                        <p className="text-sm text-gray-500 mt-1">Total Check-ins</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl card-shadow mb-6">
                    <label htmlFor="new-tag-input" className="block text-sm font-medium text-gray-700 mb-1">Add New Tag</label>
                    <div className="flex items-center gap-2">
                        <input
                            id="new-tag-input"
                            type="text"
                            placeholder="e.g. Gym, Reading..."
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        <button 
                            type="button" 
                            onClick={handleAddTag} 
                            className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
                            aria-label="Add new tag"
                        >
                            <PlusIconHeader />
                        </button>
                    </div>
                </div>
                
                <div className="bg-white rounded-xl card-shadow overflow-hidden divide-y divide-gray-100">
                    {tagData.map(tag => (
                        <div key={tag.name} className="flex items-center p-3 group hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4 flex-grow" onClick={() => navigate(`/moments/tags/${encodeURIComponent(tag.name)}`)}>
                                {tag.imageUrl ? (
                                    <img src={tag.imageUrl} alt={tag.name} className="w-10 h-10 rounded-lg object-cover" />
                                ) : (
                                    <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg text-gray-400">
                                        <TagIcon className="w-5 h-5" />
                                    </div>
                                )}
                                <div className="flex-grow">
                                    <p className="font-semibold text-gray-800">{tag.name}</p>
                                    <p className="text-sm text-gray-500">{tag.count} check-in{tag.count !== 1 ? 's' : ''}</p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(tag.name); }}
                                    className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label={`Delete tag ${tag.name}`}
                                >
                                    <TrashIcon />
                                </button>
                                 <div onClick={() => navigate(`/moments/tags/${encodeURIComponent(tag.name)}`)}>
                                    <ChevronRightIcon />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <ConfirmationModal
                isOpen={!!tagToDelete}
                onClose={() => setTagToDelete(null)}
                onConfirm={handleConfirmDelete}
                title={`Delete "${tagToDelete}"?`}
                message="This will remove the tag from all associated moments. This action cannot be undone."
                confirmText="Delete Tag"
            />
        </>
    );
};

export default TagsView;