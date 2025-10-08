import React, { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MainLayout from '../components/layouts/MainLayout';
import { ChevronLeftIcon } from '../components/icons/Icons';
import { useData } from '../contexts/DataContext';

const MomentCard: React.FC<{ id: number | string; title: string; imageUrl: string; index: number; }> = ({ id, title, imageUrl, index }) => (
    <Link 
        to={`/moments/${id}`} 
        className="relative aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer block animate-card-fade-in card-shadow"
        style={{ animationDelay: `${index * 50}ms`, willChange: 'transform, opacity' }}
    >
        <img src={imageUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 p-3 text-white">
            <h3 className="font-bold">{title}</h3>
        </div>
    </Link>
);


const TagDetailScreen: React.FC = () => {
    const { tagName } = useParams<{ tagName: string }>();
    const navigate = useNavigate();
    const { moments } = useData();

    const decodedTagName = useMemo(() => tagName ? decodeURIComponent(tagName) : '', [tagName]);

    const taggedMoments = useMemo(() => {
        if (!decodedTagName) return [];
        return moments
            .filter(moment => moment.tags?.includes(decodedTagName))
            .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }, [moments, decodedTagName]);
    
    const { totalCheckins, currentStreak, longestStreak } = useMemo(() => {
        if (taggedMoments.length === 0) {
            return { totalCheckins: 0, currentStreak: 0, longestStreak: 0 };
        }

        const dates = taggedMoments
            // FIX: Filter out moments without a date to prevent runtime errors with `m.date!`
            .filter(m => m.date)
            .map(m => new Date(m.date!))
            .sort((a, b) => b.getTime() - a.getTime());

        const uniqueDays = [...new Set(dates.map(d => d.toISOString().split('T')[0]))];

        let current = 0;
        let longest = 0;

        if (uniqueDays.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            // FIX: Fix 'No overload matches this call' error by ensuring argument is a string. Also fixes timezone issues.
            const mostRecent = new Date(uniqueDays[0] + 'T00:00:00');
            mostRecent.setHours(0, 0, 0, 0);
            
            const diff = (today.getTime() - mostRecent.getTime()) / (1000 * 3600 * 24);

            if (diff <= 1) { // includes today or yesterday
                current = 1;
                longest = 1;

                for (let i = 0; i < uniqueDays.length - 1; i++) {
                    // FIX: Fix 'No overload matches this call' error by ensuring argument is a string. Also fixes timezone issues.
                    const d1 = new Date(uniqueDays[i] + 'T00:00:00');
                    // FIX: Fix 'No overload matches this call' error by ensuring argument is a string. Also fixes timezone issues.
                    const d2 = new Date(uniqueDays[i+1] + 'T00:00:00');
                    const dayDiff = (d1.getTime() - d2.getTime()) / (1000 * 3600 * 24);

                    if (dayDiff === 1) {
                        current++;
                    } else {
                        break;
                    }
                }
                longest = current;
            }
        }
        
        // Find longest streak overall
        if (uniqueDays.length > 1) {
             let tempLongest = 1;
             for (let i = 0; i < uniqueDays.length - 1; i++) {
                // FIX: Fix 'No overload matches this call' error by ensuring argument is a string. Also fixes timezone issues.
                const d1 = new Date(uniqueDays[i] + 'T00:00:00');
                // FIX: Fix 'No overload matches this call' error by ensuring argument is a string. Also fixes timezone issues.
                const d2 = new Date(uniqueDays[i+1] + 'T00:00:00');
                const dayDiff = (d1.getTime() - d2.getTime()) / (1000 * 3600 * 24);
                if (dayDiff === 1) {
                    tempLongest++;
                } else {
                    tempLongest = 1;
                }
                if (tempLongest > longest) longest = tempLongest;
            }
        } else if (uniqueDays.length === 1 && longest === 0) {
            longest = 1;
        }

        return {
            totalCheckins: taggedMoments.length,
            currentStreak: current,
            longestStreak: longest,
        };
    }, [taggedMoments]);

    return (
        <MainLayout hideNavBar>
            <div className="absolute inset-0 flex flex-col bg-gray-50">
                <header
                    className="px-4 pt-6 pb-4 flex items-center gap-2 flex-shrink-0 bg-white border-b sticky top-0 z-10"
                    style={{ paddingTop: `calc(1.5rem + env(safe-area-inset-top))` }}
                >
                    <button onClick={() => navigate(-1)} className="p-2 text-gray-600 hover:text-blue-600">
                        <ChevronLeftIcon />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">#{decodedTagName}</h1>
                </header>
                
                <main className="flex-grow overflow-y-auto px-6 pb-24">
                    <div className="grid grid-cols-3 gap-4 my-4">
                        <div className="bg-white p-3 rounded-xl card-shadow text-center">
                            <p className="text-2xl font-bold text-purple-600">{totalCheckins}</p>
                            <p className="text-xs text-gray-500 mt-1">Total Check-ins</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl card-shadow text-center">
                            <p className="text-2xl font-bold text-purple-600">{currentStreak}</p>
                            <p className="text-xs text-gray-500 mt-1">Current Streak</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl card-shadow text-center">
                            <p className="text-2xl font-bold text-purple-600">{longestStreak}</p>
                            <p className="text-xs text-gray-500 mt-1">Longest Streak</p>
                        </div>
                    </div>

                    {taggedMoments.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {taggedMoments.map((moment, index) => (
                                <MomentCard key={moment.id} id={moment.id} title={moment.title} imageUrl={moment.imageUrl} index={index} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-gray-500">
                            <p>No moments found for this tag yet.</p>
                        </div>
                    )}
                </main>
            </div>
        </MainLayout>
    );
};

export default TagDetailScreen;
