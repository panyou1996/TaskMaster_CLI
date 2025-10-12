import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { TagIcon, PlusIconHeader } from '../../components/icons/Icons';

interface TagsViewProps {
  onOpenEditModal: (tagName: string) => void;
}

const TagsView: React.FC<TagsViewProps> = ({ onOpenEditModal }) => {
    const { moments, tags: allTags, addTag } = useData();
    const navigate = useNavigate();
    const [newTag, setNewTag] = useState('');

    // Refs for gesture handling
    const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

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

    const cancelLongPress = () => {
        if (pressTimerRef.current) {
            clearTimeout(pressTimerRef.current);
            pressTimerRef.current = null;
        }
        pointerStartRef.current = null;
    };

    const onPointerDown = (e: React.PointerEvent, tagName: string) => {
        pointerStartRef.current = { x: e.clientX, y: e.clientY };
        pressTimerRef.current = setTimeout(() => {
            onOpenEditModal(tagName);
            pressTimerRef.current = null;
            pointerStartRef.current = null;
        }, 500);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (pointerStartRef.current) {
            const dx = Math.abs(e.clientX - pointerStartRef.current.x);
            const dy = Math.abs(e.clientY - pointerStartRef.current.y);
            if (dx > 10 || dy > 10) {
                cancelLongPress();
            }
        }
    };
    
    const onPointerUp = (tagName: string) => {
        if (pressTimerRef.current) {
            cancelLongPress();
            navigate(`/moments/tags/${encodeURIComponent(tagName)}`);
        }
    };

    const totalCheckins = useMemo(() => tagData.reduce((sum, tag) => sum + tag.count, 0), [tagData]);

    return (
        <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[var(--color-surface-container)] p-4 rounded-xl card-shadow text-center">
                    <p className="text-2xl font-bold text-[var(--color-primary-500)]">{tagData.length}</p>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">Total Tags</p>
                </div>
                    <div className="bg-[var(--color-surface-container)] p-4 rounded-xl card-shadow text-center">
                    <p className="text-2xl font-bold text-[var(--color-primary-500)]">{totalCheckins}</p>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">Total Check-ins</p>
                </div>
            </div>

            <div className="bg-[var(--color-surface-container)] p-4 rounded-xl card-shadow mb-6">
                <label htmlFor="new-tag-input" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">Add New Tag</label>
                <div className="flex items-center gap-2">
                    <input
                        id="new-tag-input"
                        type="text"
                        placeholder="e.g. Gym, Reading..."
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                        className="w-full px-4 py-2.5 border border-[var(--color-border)] bg-[var(--color-surface-container-low)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] text-sm"
                    />
                    <button 
                        type="button" 
                        onClick={handleAddTag} 
                        className="flex-shrink-0 w-10 h-10 bg-[var(--color-primary-500)] text-white rounded-full flex items-center justify-center hover:opacity-90 transition-colors"
                        aria-label="Add new tag"
                    >
                        <PlusIconHeader />
                    </button>
                </div>
            </div>
            
            <div className="space-y-3">
                {tagData.map(tag => (
                    <div 
                        key={tag.name}
                        onTouchStart={(e) => e.stopPropagation()}
                        onPointerDown={(e) => onPointerDown(e, tag.name)}
                        onPointerUp={() => onPointerUp(tag.name)}
                        onPointerMove={onPointerMove}
                        onPointerCancel={cancelLongPress}
                        className="bg-[var(--color-surface-container)] p-4 rounded-xl card-shadow flex items-center space-x-4 cursor-pointer hover:bg-[var(--color-surface-container-low)] transition-colors select-none h-[80px]"
                        onContextMenu={(e) => e.preventDefault()}
                    >
                        <div className="p-2 rounded-lg flex items-center justify-center w-12 h-12">
                            {tag.imageUrl ? (
                                <img src={tag.imageUrl} alt={tag.name} className="w-full h-full rounded-md object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 rounded-md">
                                    <TagIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{tag.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{tag.count} check-in{tag.count !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TagsView;
