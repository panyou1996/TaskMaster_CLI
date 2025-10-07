import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon, SyncIcon, DownloadIcon, RefreshSpinnerIcon } from '../../components/icons/Icons';
import { useData } from '../../contexts/DataContext';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import Button from '../../components/common/Button';


const Toggle: React.FC<{ enabled: boolean; setEnabled: (enabled: boolean) => void; }> = ({ enabled, setEnabled }) => (
    <button
        onClick={() => setEnabled(!enabled)}
        className={`relative inline-flex items-center h-7 w-12 rounded-full transition-colors ${enabled ? 'bg-blue-500' : 'bg-gray-200'}`}
        aria-label={enabled ? "Disable" : "Enable"}
    >
        <span
            className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
        />
    </button>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 pb-2 pt-6">
        {title}
    </h2>
);

interface SettingsItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  isLink?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ children, onClick, isLink = false }) => {
    const commonClasses = "flex justify-between items-center p-4 text-gray-800";
    const interactionClasses = isLink ? "hover:bg-gray-50 transition-colors cursor-pointer" : "";
    return (
        <div className={`${commonClasses} ${interactionClasses}`} onClick={onClick}>
            {children}
        </div>
    );
}

const SettingsScreen: React.FC = () => {
    const navigate = useNavigate();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const { profile, isOnline, isSyncing, offlineQueue, syncData, syncError, clearOfflineQueue } = useData();
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const hasPendingChanges = offlineQueue.length > 0;

    let syncStatusText = "Synced";
    let syncStatusColor = "text-green-600";
    
    if (syncError) {
        syncStatusText = "Sync Failed";
        syncStatusColor = "text-red-600";
    } else if (!isOnline) {
        syncStatusText = "Offline";
        syncStatusColor = "text-red-600";
    } else if (isSyncing) {
        syncStatusText = "Syncing...";
        syncStatusColor = "text-blue-600";
    } else if (hasPendingChanges) {
        syncStatusText = `${offlineQueue.length} pending change${offlineQueue.length > 1 ? 's' : ''}`;
        syncStatusColor = "text-yellow-600";
    }

    const handleSyncNow = () => {
        if (!isSyncing) {
            syncData();
        }
    };
    
    const handleClearQueue = () => {
        clearOfflineQueue();
        setIsClearConfirmOpen(false);
        syncData(); // Attempt a fresh sync after clearing
    };


    if (!profile) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-gray-50">
                <svg className="w-10 h-10 animate-ios-spinner text-gray-500" viewBox="0 0 50 50">
                    <circle className="animate-ios-spinner-path" cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="4" />
                </svg>
            </div>
        );
    }

    return (
        <>
            <div className="h-full w-full flex flex-col bg-gray-50">
                <header
                    className="flex-shrink-0 p-4 relative bg-white border-b"
                    style={{ paddingTop: `calc(1rem + env(safe-area-inset-top))` }}
                >
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-gray-300 rounded-full" />
                    <div className="grid grid-cols-3 items-center mt-2">
                        <div className="flex justify-start">
                            <button
                                onClick={() => navigate('/today')}
                                className="p-2 -ml-2 text-gray-500 hover:text-gray-800"
                                aria-label="Go back to today"
                            >
                                <ChevronLeftIcon />
                            </button>
                        </div>
                        <h1 className="text-lg font-bold text-center">Settings</h1>
                        <div />
                    </div>
                </header>

                <main className="flex-grow overflow-y-auto">
                    <div className="p-4">
                        <SectionHeader title="Account" />
                        <Link to="/profile" className="block">
                            <div className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm hover:bg-gray-50 transition-colors">
                                <img src={profile.avatar_url} alt="User Avatar" className="w-14 h-14 rounded-full object-cover" />
                                <div className="flex-grow">
                                    <p className="font-semibold text-lg text-gray-900">{profile.name}</p>
                                    <p className="text-gray-500">{profile.email}</p>
                                </div>
                                <ChevronRightIcon />
                            </div>
                        </Link>

                        <SectionHeader title="Preferences" />
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
                            <SettingsItem>
                                <span>Notifications</span>
                                <Toggle enabled={notificationsEnabled} setEnabled={setNotificationsEnabled} />
                            </SettingsItem>
                            <SettingsItem isLink>
                                 <span>Default List</span>
                                <div className="flex items-center gap-2 text-gray-500">
                                    <span>Personal</span>
                                    <ChevronRightIcon />
                                </div>
                            </SettingsItem>
                        </div>
                        
                        {syncError && (
                            <>
                                <SectionHeader title="Sync Error" />
                                <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                                    <p className="text-sm text-red-600">{syncError}</p>
                                    <Button variant="secondary" onClick={() => setIsClearConfirmOpen(true)}>Clear Queue & Retry</Button>
                                </div>
                            </>
                        )}

                        <SectionHeader title="Data Management" />
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
                            <SettingsItem>
                                <span>Sync Status</span>
                                <span className={syncStatusColor}>{syncStatusText}</span>
                            </SettingsItem>
                            <SettingsItem isLink onClick={handleSyncNow}>
                                <span className="text-blue-600">Sync Now</span>
                                {isSyncing ? <RefreshSpinnerIcon /> : <SyncIcon className="w-5 h-5 text-blue-600"/>}
                            </SettingsItem>
                            <SettingsItem isLink>
                                <span className="text-blue-600">Export Data</span>
                                <DownloadIcon className="w-5 h-5 text-blue-600" />
                            </SettingsItem>
                        </div>
                        
                        <SectionHeader title="About & Help" />
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
                            <SettingsItem>
                                <span>Version</span>
                                <span className="text-gray-500">1.0.0</span>
                            </SettingsItem>
                            <Link to="/settings/about">
                                <SettingsItem isLink>
                                    <span>Privacy Policy</span>
                                    <ChevronRightIcon />
                                </SettingsItem>
                            </Link>
                        </div>
                    </div>
                </main>
            </div>
            <ConfirmationModal
                isOpen={isClearConfirmOpen}
                onClose={() => setIsClearConfirmOpen(false)}
                onConfirm={handleClearQueue}
                title="Clear Pending Changes?"
                message="This will remove all unsynced changes. This action is useful if a bad operation is blocking the sync process. Are you sure?"
                confirmText="Clear & Retry"
            />
        </>
    );
};

export default SettingsScreen;
