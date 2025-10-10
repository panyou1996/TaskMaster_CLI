
import React, { useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layouts/MainLayout';
import { ChevronLeftIcon, EditIcon } from '../components/icons/Icons';
import { useData } from '../contexts/DataContext';
import { supabase } from '../utils/supabase';

// Helper to convert data URL to Blob
function dataURLtoBlob(dataurl: string): Blob {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Invalid data URL');
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}


const resizeImage = (file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            const result = event.target?.result;
            if (typeof result === 'string') {
                img.src = result;
            } else {
                reject(new Error('FileReader result is not a string'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};


const ProfileScreen: React.FC = () => {
    const navigate = useNavigate();
    const { profile, setProfile, tasks: allTasks, moments: momentsData, logout, user, focusHistory } = useData();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const tasksCompleted = useMemo(() => {
        return allTasks.filter(task => task.completed).length;
    }, [allTasks]);

    const momentsCreated = useMemo(() => {
        return momentsData.length;
    }, [momentsData]);
    
    const { totalFocusMinutes, focusStreak } = useMemo(() => {
        if (!focusHistory || focusHistory.length === 0) {
            return { totalFocusMinutes: 0, focusStreak: 0 };
        }

        // Calculate total minutes
        const totalMinutes = focusHistory.reduce((sum, session) => sum + (session.duration || 0), 0);

        // Calculate focus streak
        const uniqueDates = [...new Set(focusHistory.map(s => s.session_date))].sort().reverse();
        if (uniqueDates.length === 0) {
            return { totalFocusMinutes: totalMinutes, focusStreak: 0 };
        }
        
        let streak = 0;
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        const mostRecentDate = new Date(uniqueDates[0] + 'T00:00:00');
        const todayDate = new Date(todayStr + 'T00:00:00');
        
        const diffDays = Math.round((todayDate.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
            return { totalFocusMinutes: totalMinutes, focusStreak: 0 };
        }

        streak = 1;
        for (let i = 0; i < uniqueDates.length - 1; i++) {
            const currentDate = new Date(uniqueDates[i] + 'T00:00:00');
            const prevDate = new Date(uniqueDates[i+1] + 'T00:00:00');
            const dayDiff = Math.round((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (dayDiff === 1) {
                streak++;
            } else {
                break;
            }
        }
        
        return { totalFocusMinutes: totalMinutes, focusStreak: streak };
    }, [focusHistory]);

    const totalFocusTime = useMemo(() => {
        if (totalFocusMinutes < 60) {
            return `${totalFocusMinutes} min`;
        }
        const hours = Math.floor(totalFocusMinutes / 60);
        const minutes = totalFocusMinutes % 60;
        return `${hours}h ${minutes}m`;
    }, [totalFocusMinutes]);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !profile) return;

        try {
            const resizedDataUrl = await resizeImage(file, 256, 256, 0.8);
            const imageBlob = dataURLtoBlob(resizedDataUrl);
            const filePath = `public/${user.id}/avatar.jpg`;
            
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, imageBlob, { upsert: true });
            
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            if (!publicUrl) throw new Error("Could not get public URL");
            
            const updatedProfile = { ...profile, avatar_url: `${publicUrl}?t=${new Date().getTime()}` };
            const { error: dbError } = await supabase.from('profiles').upsert(updatedProfile);

            if (dbError) throw dbError;

            setProfile(updatedProfile);
        } catch (error) {
            console.error("Error updating avatar:", error);
            alert("Failed to update avatar. Please try again.");
        }
    };
    
    const handleProfileUpdate = async () => {
        if (!profile) return;
        const { error } = await supabase.from('profiles').upsert(profile);
        if (error) {
            alert("Failed to save profile changes.");
        } else {
            alert("Profile saved!");
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };
    
    if (!profile) return null;

    return (
        <MainLayout hideNavBar>
            <div className="absolute inset-0 flex flex-col bg-gray-50 dark:bg-gray-900">
                {/* Header */}
                <header
                    className="px-4 pt-6 pb-4 grid grid-cols-3 items-center flex-shrink-0 bg-[var(--color-surface-container)] border-b border-[var(--color-border)] sticky top-0 z-10"
                    style={{ paddingTop: `calc(1.5rem + env(safe-area-inset-top))` }}
                >
                    <div className="flex justify-start">
                        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100" aria-label="Go back">
                            <ChevronLeftIcon />
                        </button>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center">Profile</h1>
                    <div className="flex justify-end">
                       <button onClick={handleProfileUpdate} className="font-semibold text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30">Save</button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-grow overflow-y-auto p-6 space-y-8">
                    {/* Avatar Section */}
                    <section className="flex flex-col items-center text-center">
                        <div className="relative">
                            <img 
                                src={profile.avatar_url}
                                alt={profile.name}
                                className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 card-shadow object-cover"
                            />
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleAvatarChange}
                                accept="image/*"
                                className="hidden"
                            />
                            <button 
                                onClick={handleAvatarClick}
                                className="absolute bottom-1 right-1 w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-gray-800 hover:bg-blue-700 transition-colors" 
                                aria-label="Edit avatar"
                            >
                                <EditIcon />
                            </button>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-4">{profile.name}</h2>
                        <p className="text-gray-500 dark:text-gray-400">{profile.email}</p>
                    </section>

                    {/* Personal Info */}
                    <section>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3">Personal Info</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Username</label>
                                <input
                                    id="username"
                                    type="text"
                                    value={profile.username}
                                    onChange={(e) => setProfile(prev => prev ? { ...prev, username: e.target.value } : null)}
                                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                                />
                            </div>
                            <div>
                                <label htmlFor="bio" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Bio</label>
                                <textarea
                                    id="bio"
                                    rows={3}
                                    value={profile.bio}
                                    onChange={(e) => setProfile(prev => prev ? { ...prev, bio: e.target.value } : null)}
                                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900 dark:text-gray-100"
                                />
                            </div>
                        </div>
                    </section>
                    
                    {/* Stats */}
                    <section>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3">Stats</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4 text-center">
                                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{tasksCompleted}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tasks Completed</p>
                            </div>
                             <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4 text-center">
                                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{momentsCreated}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Moments Created</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4 text-center">
                                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{totalFocusTime}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Focus Time</p>
                            </div>
                             <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4 text-center">
                                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{focusStreak} <span className="text-lg">days</span></p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Focus Streak</p>
                            </div>
                        </div>
                    </section>
                    
                    {/* Logout */}
                    <section className="pb-4">
                         <button 
                            onClick={handleLogout}
                            className="w-full bg-gray-200 dark:bg-gray-700 text-red-600 dark:text-red-400 font-bold py-3 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                         >
                            Logout
                         </button>
                    </section>
                </main>
            </div>
        </MainLayout>
    );
};

export default ProfileScreen;