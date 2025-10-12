import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layouts/MainLayout';
import { PlusIconHeader, ChevronDownIcon, RefreshSpinnerIcon, SearchIcon } from '../components/icons/Icons';
import { EmptyMomentsIllustration } from '../components/illustrations/Illustrations';
import { useData } from '../contexts/DataContext';
import { Moment } from '../data/mockData';
// FIX: Changed import to use named export for AddMomentScreen.
import { AddMomentScreen, NewMomentData } from './AddMomentScreen';
import TagsView from '../components/views/TagsView';
import CalendarView from '../components/views/CalendarView';
import EditTagScreen from './EditTagScreen';
import ConfirmationModal from '../components/common/ConfirmationModal';

const MomentCard: React.FC<{ id: number | string; title: string; description: string; imageUrl: string; index: number; createdAt?: string; tags?: string[]; }> = ({ id, title, description, imageUrl, index, createdAt, tags }) => {
    const formattedTime = useMemo(() => {
        if (!createdAt) return null;
        try {
            const date = new Date(createdAt);
            if (isNaN(date.getTime())) return null;
            return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        } catch (e) {
            console.error("Error formatting date:", e);
            return null;
        }
    }, [createdAt]);
    
    return (
        <Link 
            to={`/moments/${id}`} 
            className="relative aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer block animate-card-fade-in card-shadow"
            style={{ animationDelay: `${index * 50}ms`, willChange: 'transform, opacity' }}
        >
            <img src={imageUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 p-3 text-white w-full">
                <h3 className="font-bold truncate">{title}</h3>
                <div className="text-xs text-gray-200 mt-0.5 flex items-center gap-1.5 truncate">
                    {formattedTime && <span>{formattedTime}</span>}
                    {tags && tags.length > 0 && formattedTime && <span>·</span>}
                    {tags && tags.length > 0 && <span className="truncate">{tags.map(t => `#${t}`).join(' ')}</span>}
                </div>
                {description && <p className="text-xs mt-1 opacity-80 truncate">{description}</p>}
            </div>
        </Link>
    );
};


const MomentsScreen: React.FC = () => {
    const { moments: momentsData, addMoment, syncData, updateTag, deleteTag } = useData();
    const [isAddMomentOpen, setIsAddMomentOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'moments' | 'calendar' | 'tags'>('moments');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);
    
    // State for modals, lifted from TagsView
    const [isEditTagOpen, setIsEditTagOpen] = useState(false);
    const [tagToEdit, setTagToEdit] = useState<string | null>(null);
    const [tagToDelete, setTagToDelete] = useState<string | null>(null);

    // Pull to refresh and swipe state
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDelta, setPullDelta] = useState(0);
    const gestureStart = useRef<{ x: number; y: number } | null>(null);
    const gestureType = useRef<'none' | 'vertical' | 'horizontal'>('none');
    const momentsViewRef = useRef<HTMLDivElement>(null);
    const calendarViewRef = useRef<HTMLDivElement>(null);
    const tagsViewRef = useRef<HTMLDivElement>(null);
    const REFRESH_THRESHOLD = 80;
    const MIN_SWIPE_DISTANCE = 50;

    useEffect(() => {
        if (isSearchVisible) {
            setTimeout(() => searchInputRef.current?.focus(), 300); // Wait for transition
        }
    }, [isSearchVisible]);

    const filteredMoments = useMemo(() => {
        if (!searchQuery) {
            return momentsData;
        }
        const lowerCaseQuery = searchQuery.toLowerCase();
        return momentsData.filter(moment => 
            moment.title.toLowerCase().includes(lowerCaseQuery) ||
            (moment.notes && moment.notes.toLowerCase().includes(lowerCaseQuery)) ||
            (moment.tags && moment.tags.some(tag => tag.toLowerCase().includes(lowerCaseQuery)))
        );
    }, [momentsData, searchQuery]);

    const handleAddMoment = async (newMomentData: NewMomentData) => {
        const newMoment: Omit<Moment, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
            title: newMomentData.title,
            description: newMomentData.notes.substring(0, 50) + (newMomentData.notes.length > 50 ? '...' : ''),
            imageUrl: newMomentData.imageUrl,
            date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            notes: newMomentData.notes,
            tags: newMomentData.tags,
        };
        await addMoment(newMoment);
    };

    // Handlers for modals, lifted from TagsView
    const handleOpenEditModal = (tagName: string) => {
        setTagToEdit(tagName);
        setIsEditTagOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditTagOpen(false);
        setTagToEdit(null);
    };

    const handleSaveTag = async (oldName: string, newName: string) => {
        await updateTag(oldName, newName);
    };

    const handleDeleteTagRequest = (tagName: string) => {
        handleCloseEditModal();
        setTimeout(() => {
            setTagToDelete(tagName);
        }, 300);
    };
    
    const handleConfirmDelete = async () => {
        if (tagToDelete) {
            await deleteTag(tagToDelete);
            setTagToDelete(null);
        }
    };
    
    // Combined handlers for pull-to-refresh and swipe
    const handleTouchStart = (e: React.TouchEvent) => {
        gestureStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        gestureType.current = 'none';
        
        const viewRefMap = {
            moments: momentsViewRef,
            calendar: calendarViewRef,
            tags: tagsViewRef
        };
        const activeScrollView = viewRefMap[viewMode].current;

        if (activeScrollView?.scrollTop !== 0) {
            gestureStart.current.y = -1;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!gestureStart.current) return;

        const deltaX = e.touches[0].clientX - gestureStart.current.x;
        const deltaY = e.touches[0].clientY - gestureStart.current.y;

        if (gestureType.current === 'none') {
            if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
                gestureType.current = 'horizontal';
            } else if (Math.abs(deltaY) > 10 && Math.abs(deltaY) > Math.abs(deltaX)) {
                gestureType.current = 'vertical';
            }
        }

        if (gestureType.current === 'vertical' && gestureStart.current.y !== -1 && deltaY > 0) {
            setPullDelta(Math.pow(deltaY, 0.85));
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!gestureStart.current) return;

        if (gestureType.current === 'horizontal') {
            const endX = e.changedTouches[0].clientX;
            const distance = gestureStart.current.x - endX;
            if (distance > MIN_SWIPE_DISTANCE) { // Swipe left
                if (viewMode === 'moments') setViewMode('calendar');
                else if (viewMode === 'calendar') setViewMode('tags');
            } else if (distance < -MIN_SWIPE_DISTANCE) { // Swipe right
                if (viewMode === 'tags') setViewMode('calendar');
                else if (viewMode === 'calendar') setViewMode('moments');
            }
        } else if (gestureType.current === 'vertical' && gestureStart.current.y !== -1) {
            if (pullDelta > REFRESH_THRESHOLD) {
                setIsRefreshing(true);
                syncData().finally(() => {
                    setIsRefreshing(false);
                    setPullDelta(0);
                });
            } else {
                setPullDelta(0);
            }
        }
        
        gestureStart.current = null;
        gestureType.current = 'none';
    };
    
    const viewIndex = useMemo(() => {
        if (viewMode === 'moments') return 0;
        if (viewMode === 'calendar') return 1;
        return 2;
    }, [viewMode]);

    return (
        <MainLayout>
            <div className="absolute inset-0 flex flex-col bg-[var(--color-background-primary)] overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-14 flex justify-center items-center transition-opacity duration-300 pointer-events-none z-10 ${pullDelta > 0 || isRefreshing ? 'opacity-100' : 'opacity-0'}`}>
                    {isRefreshing ? <RefreshSpinnerIcon /> : <ChevronDownIcon className={`w-6 h-6 text-gray-500 transition-transform duration-300 ${pullDelta > REFRESH_THRESHOLD ? 'rotate-180' : ''}`} />}
                </div>
                
                <div
                    className="h-full flex flex-col"
                    style={{ transform: `translateY(${isRefreshing ? 56 : pullDelta}px)`, transition: pullDelta === 0 || isRefreshing ? 'transform 0.3s' : 'none' }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <header
                        className="px-6 pt-6 pb-4 flex-shrink-0 grid grid-cols-[auto_1fr_auto] items-center gap-4 bg-[var(--color-surface-container)] border-b border-[var(--color-border)]"
                        style={{ paddingTop: `calc(1.5rem + env(safe-area-inset-top, 0px))` }}
                    >
                         <div className="flex justify-start">
                            <button className="text-gray-600 dark:text-gray-400 p-1" onClick={() => setIsSearchVisible(true)}>
                                <SearchIcon />
                            </button>
                         </div>
                        <div className="flex justify-center">
                            <div className="grid grid-cols-3 bg-gray-200 dark:bg-gray-700 rounded-lg p-1 w-full max-w-xs">
                                <button onClick={() => setViewMode('moments')} className={`flex justify-center items-center py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === 'moments' ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>Grid</button>
                                <button onClick={() => setViewMode('calendar')} className={`flex justify-center items-center py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>Calendar</button>
                                <button onClick={() => setViewMode('tags')} className={`flex justify-center items-center py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === 'tags' ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>Tags</button>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button className="text-gray-800 dark:text-gray-200" onClick={() => setIsAddMomentOpen(true)}>
                                <PlusIconHeader />
                            </button>
                        </div>
                    </header>

                    <main className="overflow-hidden flex-grow flex flex-col">
                        <div
                            className="flex h-full transition-transform duration-300 ease-out"
                            style={{ transform: `translateX(-${viewIndex * 100}%)` }}
                        >
                             {/* Grid View */}
                            <div ref={momentsViewRef} className="w-full flex-shrink-0 h-full overflow-y-auto px-6 pb-24">
                                {momentsData.length === 0 ? (
                                    <EmptyMomentsIllustration onAddMoment={() => setIsAddMomentOpen(true)} />
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pt-4">
                                        {momentsData.map((moment, index) => (
                                            <MomentCard key={moment.id} {...moment} index={index} createdAt={moment.created_at} />
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Calendar View */}
                            <div ref={calendarViewRef} className="w-full flex-shrink-0 h-full overflow-y-auto pb-24">
                                <CalendarView />
                            </div>
                            {/* Tags View */}
                            <div ref={tagsViewRef} className="w-full flex-shrink-0 h-full overflow-y-auto pb-24">
                                <TagsView onOpenEditModal={handleOpenEditModal} />
                            </div>
                        </div>
                    </main>
                </div>
            </div>
            
             {/* Search Overlay */}
            <div className={`fixed inset-0 z-40 bg-[var(--color-background-primary)] flex flex-col transition-transform duration-300 ease-in-out ${isSearchVisible ? 'translate-y-0' : 'translate-y-full'}`}
                 style={{ paddingTop: `var(--safe-area-inset-top, 0px)` }}>
                <div className="flex-shrink-0 px-4 pt-4 pb-3 flex items-center gap-2">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon />
                        </div>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search moments..."
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button 
                        onClick={() => { setIsSearchVisible(false); setSearchQuery(''); }}
                        className="font-semibold text-blue-600 dark:text-blue-400 px-2"
                    >
                        Cancel
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto px-6 pb-24">
                    {filteredMoments.length === 0 && searchQuery ? (
                        <div className="text-center py-16">
                            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">No moments found</p>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Try a different search term.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-4">
                            {filteredMoments.map((moment, index) => (
                                <MomentCard key={moment.id} {...moment} index={index} createdAt={moment.created_at} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <AddMomentScreen
                isOpen={isAddMomentOpen}
                onClose={() => setIsAddMomentOpen(false)}
                onAddMoment={handleAddMoment}
            />
            <EditTagScreen
                isOpen={isEditTagOpen}
                onClose={handleCloseEditModal}
                tagName={tagToEdit}
                onSaveTag={handleSaveTag}
                onDeleteTag={handleDeleteTagRequest}
            />
            <ConfirmationModal
                isOpen={!!tagToDelete}
                onClose={() => setTagToDelete(null)}
                onConfirm={handleConfirmDelete}
                title={`Delete "${tagToDelete}"?`}
                message="This will remove the tag from all associated moments. This action cannot be undone."
                confirmText="Delete Tag"
            />
        </MainLayout>
    );
};

export default MomentsScreen;