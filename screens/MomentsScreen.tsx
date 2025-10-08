
import React, { useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layouts/MainLayout';
import { PlusIconHeader, ChevronDownIcon, RefreshSpinnerIcon, SearchIcon } from '../components/icons/Icons';
import { EmptyMomentsIllustration } from '../components/illustrations/Illustrations';
import { useData } from '../contexts/DataContext';
import { Moment } from '../data/mockData';
import AddMomentScreen, { NewMomentData } from './AddMomentScreen';
import TagsView from '../components/views/TagsView';
import CalendarView from '../components/views/CalendarView';

// FIX: Changed id to allow string for temporary items
const MomentCard: React.FC<{ id: number | string; title: string; description: string; imageUrl: string; index: number; }> = ({ id, title, description, imageUrl, index }) => (
    <Link 
        to={`/moments/${id}`} 
        className="relative aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer block animate-card-fade-in card-shadow"
        style={{ animationDelay: `${index * 50}ms`, willChange: 'transform, opacity' }}
    >
        <img src={imageUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 p-3 text-white">
            <h3 className="font-bold">{title}</h3>
            {description && <p className="text-xs mt-0.5">{description}</p>}
        </div>
    </Link>
);


const MomentsScreen: React.FC = () => {
    const { moments: momentsData, addMoment, syncData } = useData();
    const [isAddMomentOpen, setIsAddMomentOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'moments' | 'calendar' | 'tags'>('moments');
    
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
            <div className="absolute inset-0 flex flex-col bg-gray-50 overflow-hidden">
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
                        className="px-6 pt-6 pb-4 flex-shrink-0 grid grid-cols-[auto_1fr_auto] items-center gap-4"
                        style={{ paddingTop: `calc(1.5rem + env(safe-area-inset-top))` }}
                    >
                         <div className="flex justify-start">
                            <button className="text-gray-600 p-1">
                                <SearchIcon />
                            </button>
                         </div>
                        <div className="flex justify-center">
                            <div className="grid grid-cols-3 bg-gray-200 rounded-lg p-1 w-full max-w-xs">
                                <button onClick={() => setViewMode('moments')} className={`flex justify-center items-center py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === 'moments' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>Grid</button>
                                <button onClick={() => setViewMode('calendar')} className={`flex justify-center items-center py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>Calendar</button>
                                <button onClick={() => setViewMode('tags')} className={`flex justify-center items-center py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === 'tags' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>Tags</button>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button className="text-gray-800" onClick={() => setIsAddMomentOpen(true)}>
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
                                            <MomentCard key={moment.id} {...moment} index={index} />
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
                                <TagsView />
                            </div>
                        </div>
                    </main>
                </div>
            </div>
            <AddMomentScreen
                isOpen={isAddMomentOpen}
                onClose={() => setIsAddMomentOpen(false)}
                onAddMoment={handleAddMoment}
            />
        </MainLayout>
    );
};

export default MomentsScreen;
