import React from 'react';
import { useData } from '../../contexts/DataContext';
import { UserProfile } from '../../data/mockData';

interface SyncStatusIndicatorProps {
    profile: UserProfile;
    onClick?: () => void;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ profile, onClick }) => {
    const { isOnline, isSyncing, offlineQueue, syncError } = useData();
    const hasPendingChanges = offlineQueue.length > 0;

    let status: 'offline' | 'syncing' | 'pending' | 'synced' | 'error' = 'synced';
    let title = 'Data is synced';
    let colorClass = 'bg-green-500';

    if (syncError) {
        status = 'error';
        title = `Sync failed: ${syncError}. Tap for details.`;
        colorClass = 'bg-red-500 animate-pulse';
    } else if (!isOnline) {
        status = 'offline';
        title = `Offline. ${offlineQueue.length} change(s) pending.`;
        colorClass = 'bg-red-500';
    } else if (isSyncing) {
        status = 'syncing';
        title = 'Syncing changes...';
        colorClass = 'bg-blue-500'; // Will be replaced by spinner
    } else if (hasPendingChanges) {
        status = 'pending';
        title = `${offlineQueue.length} change(s) pending sync.`;
        colorClass = 'bg-yellow-500';
    }

    return (
        <button
            onClick={onClick}
            className="relative focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full"
            title={title}
            aria-label={`Sync status: ${title}`}
        >
            <img 
                src={profile.avatar_url} 
                alt="User Avatar" 
                className="w-10 h-10 rounded-full cursor-pointer object-cover" 
            />
            <div className="absolute -bottom-0.5 -right-0.5">
                {status === 'syncing' ? (
                    <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                         <svg className="w-3 h-3 text-blue-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                ) : (
                    <div className={`w-3.5 h-3.5 rounded-full ${colorClass} border-2 border-white`} />
                )}
            </div>
        </button>
    );
};

export default SyncStatusIndicator;