
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CloseIcon, ChevronRightIcon, SyncIcon, DownloadIcon, RefreshSpinnerIcon, BellIcon, ListCheckIcon, PaletteIcon, InfoIcon } from '../../components/icons/Icons';
import { useData } from '../../contexts/DataContext';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import Button from '../../components/common/Button';

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 pb-2 pt-6">
        {title}
    </h2>
);

interface SettingsItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  isLink?: boolean;
  icon?: React.ReactNode;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ children, onClick, isLink = false, icon }) => {
    const commonClasses = "flex items-center p-4 text-gray-800";
    const interactionClasses = isLink ? "hover:bg-gray-50 transition-colors cursor-pointer" : "";
    
    const content = (
        <>
            {icon && (
                <div className="mr-4 w-7 h-7 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600">
                    {icon}
                </div>
            )}
            <div className="flex-grow flex justify-between items-center">
                {children}
            </div>
        </>
    );

    return (
        <div className={`${commonClasses} ${interactionClasses}`} onClick={onClick}>
            {content}
        </div>
    );
}

interface SettingsScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ isOpen, onClose }) => {
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
    
    const handleLinkClick = () => {
        onClose();
    };


    if (!profile) {
        return null; // The parent component should handle loading state
    }

    return (
        <>
            <div className={`fixed inset-0 z-50 flex items-end transition-all duration-300 ${isOpen ? 'visible' : 'invisible'}`}>
                <div
                    className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={onClose}
                    aria-hidden="true"
                />
                <div
                    className={`w-full bg-gray-50 rounded-t-3xl modal-shadow transition-transform duration-300 ease-out transform ${isOpen ? 'translate-y-0' : 'translate-y-full'} flex flex-col`}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="settings-title"
                >
                    <header
                        className="pt-3 px-4 pb-3 border-b border-gray-200 bg-white rounded-t-3xl sticky top-0 z-10 flex-shrink-0"
                    >
                        <div className="w-8 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
                         <div className="grid grid-cols-3 items-center h-8">
                            <div className="flex justify-start">
                                <button
                                    onClick={onClose}
                                    className="p-1 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100"
                                    aria-label="Close settings"
                                >
                                    <CloseIcon />
                                </button>
                            </div>
                            <h1 id="settings-title" className="text-xl font-bold text-gray-900 text-center">Settings</h1>
                            <div />
                        </div>
                    </header>

                    <main className="overflow-y-auto max-h-[75vh]">
                        <div className="p-4" style={{ paddingBottom: `calc(1rem + env(safe-area-inset-bottom))` }}>
                            <SectionHeader title="Account" />
                            <Link to="/profile" className="block" onClick={handleLinkClick}>
                                <div className="bg-white rounded-xl p-4 flex items-center gap-4 card-shadow hover:bg-gray-50 transition-colors">
                                    <img src={profile.avatar_url} alt="User Avatar" className="w-14 h-14 rounded-full object-cover" />
                                    <div className="flex-grow">
                                        <p className="font-semibold text-lg text-gray-900">{profile.name}</p>
                                        <p className="text-gray-500">{profile.email}</p>
                                    </div>
                                    <ChevronRightIcon />
                                </div>
                            </Link>

                            <SectionHeader title="Preferences" />
                            <div className="bg-white rounded-xl card-shadow overflow-hidden divide-y divide-gray-100">
                                <Link to="/settings/notifications" onClick={handleLinkClick}>
                                    <SettingsItem isLink icon={<BellIcon />}>
                                        <span>Notifications</span>
                                        <ChevronRightIcon />
                                    </SettingsItem>
                                </Link>
                                 <Link to="/settings/theme" onClick={handleLinkClick}>
                                    <SettingsItem isLink icon={<PaletteIcon />}>
                                        <span>App Theme</span>
                                        <ChevronRightIcon />
                                    </SettingsItem>
                                </Link>
                                <SettingsItem isLink>
                                    <span className="flex items-center gap-4">
                                        <div className="w-7 h-7 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600">
                                            <ListCheckIcon />
                                        </div>
                                        <span>Default List</span>
                                    </span>
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <span>Personal</span>
                                        <ChevronRightIcon />
                                    </div>
                                </SettingsItem>
                            </div>
                            
                            {syncError && (
                                <>
                                    <SectionHeader title="Sync Error" />
                                    <div className="bg-white rounded-xl card-shadow p-4 space-y-3">
                                        <p className="text-sm text-red-600">{syncError}</p>
                                        <Button variant="secondary" onClick={() => setIsClearConfirmOpen(true)}>Clear Queue & Retry</Button>
                                    </div>
                                </>
                            )}

                            <SectionHeader title="Data Management" />
                            <div className="bg-white rounded-xl card-shadow overflow-hidden divide-y divide-gray-100">
                                <SettingsItem icon={<SyncIcon className="w-5 h-5 text-gray-600" />}>
                                    <span>Sync Status</span>
                                    <span className={syncStatusColor}>{syncStatusText}</span>
                                </SettingsItem>
                                <SettingsItem isLink onClick={handleSyncNow} icon={<RefreshSpinnerIcon />}>
                                    <span className="text-blue-600">Sync Now</span>
                                </SettingsItem>
                                <SettingsItem isLink icon={<DownloadIcon className="w-5 h-5 text-gray-600" />}>
                                    <span className="text-blue-600">Export Data</span>
                                </SettingsItem>
                            </div>
                            
                            <SectionHeader title="About & Help" />
                            <div className="bg-white rounded-xl card-shadow overflow-hidden divide-y divide-gray-100">
                                <SettingsItem icon={<InfoIcon />}>
                                    <span>Version</span>
                                    <span className="text-gray-500">1.0.0</span>
                                </SettingsItem>
                                <Link to="/settings/about" onClick={handleLinkClick}>
                                    <SettingsItem isLink>
                                        <span className="ml-11">Privacy Policy</span>
                                        <ChevronRightIcon />
                                    </SettingsItem>
                                </Link>
                            </div>
                        </div>
                    </main>
                </div>
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
