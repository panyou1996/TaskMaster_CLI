import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layouts/MainLayout';
import { SearchIcon, PlusIconHeader, FilterIcon, ChevronDownIcon, RefreshSpinnerIcon } from '../components/icons/Icons';
import { EmptyMomentsIllustration } from '../components/illustrations/Illustrations';
import { useData } from '../contexts/DataContext';
import { Moment } from '../data/mockData';
import AddMomentScreen, { NewMomentData } from './AddMomentScreen';

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

    // Pull to refresh state
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDelta, setPullDelta] = useState(0);
    const touchStartY = useRef<number | null>(null);
    const mainRef = useRef<HTMLElement>(null);
    const REFRESH_THRESHOLD = 80;

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
    
    // Pull to refresh handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        if (mainRef.current?.scrollTop === 0) {
            touchStartY.current = e.touches[0].clientY;
        } else {
            touchStartY.current = null;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartY.current === null || isRefreshing) return;
        const currentY = e.touches[0].clientY;
        const delta = currentY - touchStartY.current;
        if (delta > 0) {
            setPullDelta(Math.pow(delta, 0.85)); // Apply resistance
        }
    };

    const handleTouchEnd = () => {
        if (touchStartY.current === null || isRefreshing) return;

        if (pullDelta > REFRESH_THRESHOLD) {
            setIsRefreshing(true);
            syncData().finally(() => {
                setIsRefreshing(false);
                setPullDelta(0);
                touchStartY.current = null;
            });
        } else {
            setPullDelta(0);
            touchStartY.current = null;
        }
    };

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
                        className="px-6 pt-6 pb-4 flex justify-between items-center flex-shrink-0"
                        style={{ paddingTop: `calc(1.5rem + env(safe-area-inset-top))` }}
                    >
                        <div className="w-6" /> {/* Spacer */}
                        <h1 className="text-3xl font-bold text-gray-900">Moments</h1>
                        <button className="text-gray-800" onClick={() => setIsAddMomentOpen(true)}>
                            <PlusIconHeader />
                        </button>
                    </header>

                    <div className="px-6 pb-4 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="relative flex-grow">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <SearchIcon />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search moments..."
                                    className="w-full bg-gray-100 border border-gray-200 rounded-xl py-2.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                             <button className="p-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-200">
                                <FilterIcon />
                            </button>
                        </div>
                    </div>

                    <main ref={mainRef} className="px-6 pb-24 overflow-y-auto flex-grow">
                        {momentsData.length === 0 ? (
                            <EmptyMomentsIllustration onAddMoment={() => setIsAddMomentOpen(true)} />
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {momentsData.map((moment, index) => (
                                    <MomentCard key={moment.id} {...moment} index={index} />
                                ))}
                            </div>
                        )}
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