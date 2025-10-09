
import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CloseIcon, ChevronRightIcon, SyncIcon, DownloadIcon, UploadIcon, RefreshSpinnerIcon, BellIcon, ListCheckIcon, PaletteIcon, InfoIcon } from '../../components/icons/Icons';
import { useData } from '../../contexts/DataContext';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import Button from '../../components/common/Button';
import MainLayout from '../../components/layouts/MainLayout';

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 pb-2 pt-6">
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
    const commonClasses = "flex items-center p-4 text-gray-800 dark:text-gray-200";
    const interactionClasses = isLink ? "hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer" : "";
    
    const content = (
        <>
            {icon && (
                <div className="mr-4 w-7 h-7 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300">
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

const SettingsScreen: React.FC = () => {
    const { 
        profile, isOnline, isSyncing, offlineQueue, syncData, syncError, clearOfflineQueue,
        tasks, lists, moments, setTasks, setLists, setMoments, setProfile
    } = useData();
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    
    // State for import functionality
    const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
    const [importFileData, setImportFileData] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const hasPendingChanges = offlineQueue.length > 0;

    let syncStatusText = "Synced";
    let syncStatusColor = "text-green-600 dark:text-green-400";
    
    if (syncError) {
        syncStatusText = "Sync Failed";
        syncStatusColor = "text-red-600 dark:text-red-400";
    } else if (!isOnline) {
        syncStatusText = "Offline";
        syncStatusColor = "text-red-600 dark:text-red-400";
    } else if (isSyncing) {
        syncStatusText = "Syncing...";
        syncStatusColor = "text-blue-600 dark:text-blue-400";
    } else if (hasPendingChanges) {
        syncStatusText = `${offlineQueue.length} pending change${offlineQueue.length > 1 ? 's' : ''}`;
        syncStatusColor = "text-yellow-600 dark:text-yellow-400";
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
    
    const handleExportData = () => {
        try {
            const dataToExport = {
                profile,
                tasks,
                lists,
                moments,
                version: '1.0.0',
                exportedAt: new Date().toISOString(),
            };

            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
                JSON.stringify(dataToExport, null, 2)
            )}`;
            
            const link = document.createElement("a");
            link.href = jsonString;
            link.download = `taskmaster_backup_${new Date().toISOString().split('T')[0]}.json`;

            link.click();
        } catch (error) {
            console.error("Failed to export data:", error);
            alert("An error occurred while exporting your data.");
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result;
                if (typeof text === 'string') {
                    setImportFileData(text);
                    setIsImportConfirmOpen(true);
                } else {
                    alert("Could not read file content.");
                }
            };
            reader.onerror = () => {
                alert("Failed to read the file.");
            };
            reader.readAsText(file);
        }
        if (event.target) {
            event.target.value = ''; // Reset file input to allow selecting the same file again
        }
    };

    const handleConfirmImport = () => {
        if (!importFileData) return;

        try {
            const importedData = JSON.parse(importFileData);
            
            if (!Array.isArray(importedData.tasks) || !Array.isArray(importedData.lists) || !Array.isArray(importedData.moments) || !importedData.profile) {
                throw new Error("Invalid backup file format. Missing required data keys.");
            }
            
            clearOfflineQueue();
            setTasks(importedData.tasks);
            setLists(importedData.lists);
            setMoments(importedData.moments);
            setProfile(importedData.profile);
            
            setIsImportConfirmOpen(false);
            setImportFileData(null);
            alert("Data imported successfully! Your data will now be synced with the server.");
            
            syncData(); // Trigger sync to upload imported data

        } catch (error) {
            console.error("Failed to import data:", error);
            alert(`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`);
            setIsImportConfirmOpen(false);
            setImportFileData(null);
        }
    };


    if (!profile) {
        return (
             <MainLayout>
                <div className="h-full w-full flex items-center justify-center">
                    <RefreshSpinnerIcon />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json,application/json"
                className="hidden"
            />
            <div className="flex flex-col h-full">
                <header
                    className="px-6 pt-6 pb-4 flex justify-center items-center flex-shrink-0"
                    style={{ paddingTop: `calc(1.5rem + env(safe-area-inset-top))` }}
                >
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
                </header>
                <main className="overflow-y-auto">
                    <div className="p-4" style={{ paddingBottom: `calc(6rem + env(safe-area-inset-bottom))` }}>
                        <SectionHeader title="Account" />
                        <Link to="/profile" className="block">
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 flex items-center gap-4 card-shadow hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <img src={profile.avatar_url} alt="User Avatar" className="w-14 h-14 rounded-full object-cover" />
                                <div className="flex-grow">
                                    <p className="font-semibold text-lg text-gray-900 dark:text-gray-100">{profile.name}</p>
                                    <p className="text-gray-500 dark:text-gray-400">{profile.email}</p>
                                </div>
                                <ChevronRightIcon />
                            </div>
                        </Link>

                        <SectionHeader title="Preferences" />
                        <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                            <Link to="/settings/notifications">
                                <SettingsItem isLink icon={<BellIcon />}>
                                    <span>Notifications</span>
                                    <ChevronRightIcon />
                                </SettingsItem>
                            </Link>
                                <Link to="/settings/theme">
                                <SettingsItem isLink icon={<PaletteIcon />}>
                                    <span>App Theme</span>
                                    <ChevronRightIcon />
                                </SettingsItem>
                            </Link>
                            <SettingsItem isLink>
                                <span className="flex items-center gap-4">
                                    <div className="w-7 h-7 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300">
                                        <ListCheckIcon />
                                    </div>
                                    <span>Default List</span>
                                </span>
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                    <span>Personal</span>
                                    <ChevronRightIcon />
                                </div>
                            </SettingsItem>
                        </div>
                        
                        {syncError && (
                            <>
                                <SectionHeader title="Sync Error" />
                                <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow p-4 space-y-3">
                                    <p className="text-sm text-red-600 dark:text-red-400">{syncError}</p>
                                    <Button variant="secondary" onClick={() => setIsClearConfirmOpen(true)}>Clear Queue & Retry</Button>
                                </div>
                            </>
                        )}

                        <SectionHeader title="Data Management" />
                        <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                            <SettingsItem icon={<InfoIcon />}>
                                <span>Sync Status</span>
                                <span className={syncStatusColor}>{syncStatusText}</span>
                            </SettingsItem>
                            <SettingsItem isLink onClick={handleSyncNow} icon={<SyncIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />}>
                                <span className="text-blue-600 dark:text-blue-400">Sync Now</span>
                            </SettingsItem>
                            <SettingsItem isLink onClick={handleExportData} icon={<DownloadIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />}>
                                <span className="text-blue-600 dark:text-blue-400">Export Data</span>
                            </SettingsItem>
                            <SettingsItem isLink onClick={handleImportClick} icon={<UploadIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />}>
                                <span className="text-blue-600 dark:text-blue-400">Import Data</span>
                            </SettingsItem>
                        </div>
                        
                        <SectionHeader title="About & Help" />
                        <div className="bg-white dark:bg-gray-800 rounded-xl card-shadow overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                            <SettingsItem icon={<InfoIcon />}>
                                <span>Version</span>
                                <span className="text-gray-500 dark:text-gray-400">1.0.0</span>
                            </SettingsItem>
                            <Link to="/settings/about">
                                <SettingsItem isLink>
                                    <span className="ml-11">Privacy Policy</span>
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
                <ConfirmationModal
                isOpen={isImportConfirmOpen}
                onClose={() => setIsImportConfirmOpen(false)}
                onConfirm={handleConfirmImport}
                title="Import Data?"
                message="This will overwrite all your current local data. This action cannot be undone. Are you sure you want to proceed?"
                confirmText="Overwrite & Import"
                confirmVariant="primary"
            />
        </MainLayout>
    );
};

export default SettingsScreen;