import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CloseIcon, ChevronRightIcon, SyncIcon, DownloadIcon, UploadIcon, RefreshSpinnerIcon, BellIcon, ListCheckIcon, PaletteIcon, InfoIcon, CheckIcon } from '../../components/icons/Icons';
import { useData } from '../../contexts/DataContext';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import Button from '../../components/common/Button';
import MainLayout from '../../components/layouts/MainLayout';
import useLocalStorage from '../../hooks/useLocalStorage';
import { TaskList } from '../../data/mockData';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <h2 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider px-4 pb-2 pt-6">
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
    const commonClasses = "flex items-center p-4 text-[var(--color-text-primary)]";
    const interactionClasses = isLink ? "hover:bg-[var(--color-surface-container-low)] transition-colors cursor-pointer" : "";
    
    return (
        <div className={`${commonClasses} ${interactionClasses}`} onClick={onClick}>
            {icon && (
                <div className="mr-4 w-7 h-7 flex items-center justify-center bg-[var(--color-surface-container-low)] rounded-lg text-[var(--color-text-secondary)]">
                    {icon}
                </div>
            )}
            <div className="flex-grow flex justify-between items-center">
                {children}
            </div>
        </div>
    );
}

const DefaultListSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  lists: TaskList[];
  current: string;
  onSelect: (listName: string) => void;
}> = ({ isOpen, onClose, lists, current, onSelect }) => {
  return (
    <div className={`fixed inset-0 z-50 flex items-end transition-all duration-300 ${isOpen ? 'visible' : 'invisible'}`}>
      <div className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} aria-hidden="true" />
      <div className={`w-full bg-[var(--color-surface-container)] rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out transform ${isOpen ? 'translate-y-0' : 'translate-y-full'}`} role="dialog" aria-modal="true" aria-labelledby="list-picker-title">
        <header className="pt-3 px-4 pb-3 border-b border-[var(--color-border)]">
          <div className="w-8 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-3" />
          <h2 id="list-picker-title" className="text-base font-bold text-[var(--color-text-primary)] text-center">Select Default List</h2>
        </header>
        <div className="p-4 space-y-2 overflow-y-auto max-h-[50vh]" style={{ paddingBottom: `calc(6rem + env(safe-area-inset-bottom))` }}>
          {lists.map(list => (
            <button key={list.id} onClick={() => onSelect(list.name)} className={`w-full text-left p-3 rounded-lg text-sm font-medium transition-colors flex justify-between items-center ${current === list.name ? 'bg-primary-100 text-[var(--color-primary-500)]' : 'hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-primary)]'}`}>
              <div className="flex items-center gap-3">
                <span className="text-lg">{list.icon}</span>
                <span>{list.name}</span>
              </div>
              {current === list.name && <CheckIcon className="w-5 h-5" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};


const SettingsScreen: React.FC = () => {
    const { 
        profile, isOnline, isSyncing, offlineQueue, syncData, syncError, clearOfflineQueue,
        tasks, lists, moments, setTasks, setLists, setMoments, setProfile
    } = useData();
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    
    // State for default list selection
    const [defaultList, setDefaultList] = useLocalStorage<string>('default-list', lists[0]?.name || 'Personal');
    const [isListPickerOpen, setIsListPickerOpen] = useState(false);
    
    // State for import functionality
    const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
    const [importFileData, setImportFileData] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Ensure default list exists, if not, reset it.
    useEffect(() => {
        if (lists.length > 0) {
            const listExists = lists.some(l => l.name === defaultList);
            if (!listExists) {
                setDefaultList(lists[0].name);
            }
        }
    }, [lists, defaultList, setDefaultList]);
    
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
    
    const handleExportData = async () => {
        try {
            const dataToExport = {
                profile,
                tasks,
                lists,
                moments,
                version: '1.0.0',
                exportedAt: new Date().toISOString(),
            };
            const fileName = `taskmaster_backup_${new Date().toISOString().split('T')[0]}.json`;
            const jsonString = JSON.stringify(dataToExport, null, 2);

            if (Capacitor.isNativePlatform()) {
                // Native platform: Use Filesystem API
                const result = await Filesystem.writeFile({
                    path: fileName,
                    data: jsonString,
                    directory: Directory.Documents,
                    encoding: Encoding.UTF8,
                });
                alert(`Data exported successfully! Saved to your Documents folder as ${fileName}`);
                console.log('File saved to:', result.uri);
            } else {
                // Web platform: Use existing download link method
                const dataUrl = `data:text/json;charset=utf-8,${encodeURIComponent(jsonString)}`;
                const link = document.createElement("a");
                link.href = dataUrl;
                link.download = fileName;
                link.click();
            }
        } catch (error) {
            console.error("Failed to export data:", error);
            alert(`An error occurred while exporting your data: ${error instanceof Error ? error.message : "Unknown error"}`);
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
                    <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Settings</h1>
                </header>
                <main className="overflow-y-auto">
                    <div className="p-4" style={{ paddingBottom: `calc(6rem + env(safe-area-inset-bottom))` }}>
                        <SectionHeader title="Account" />
                        <Link to="/profile" className="block">
                            <div className="bg-[var(--color-surface-container)] rounded-xl p-4 flex items-center gap-4 card-shadow hover:bg-[var(--color-surface-container-low)] transition-colors">
                                <img src={profile.avatar_url} alt="User Avatar" className="w-14 h-14 rounded-full object-cover" />
                                <div className="flex-grow">
                                    <p className="font-semibold text-lg text-[var(--color-text-primary)]">{profile.name}</p>
                                    <p className="text-[var(--color-text-secondary)]">{profile.email}</p>
                                </div>
                                <ChevronRightIcon />
                            </div>
                        </Link>

                        <SectionHeader title="Preferences" />
                        <div className="bg-[var(--color-surface-container)] rounded-xl card-shadow overflow-hidden divide-y divide-[var(--color-border)]">
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
                            <SettingsItem isLink onClick={() => setIsListPickerOpen(true)}>
                                <span className="flex items-center gap-4">
                                    <div className="w-7 h-7 flex items-center justify-center bg-[var(--color-surface-container-low)] rounded-lg text-[var(--color-text-secondary)]">
                                        <ListCheckIcon />
                                    </div>
                                    <span>Default List</span>
                                </span>
                                <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                                    <span>{defaultList}</span>
                                    <ChevronRightIcon />
                                </div>
                            </SettingsItem>
                        </div>
                        
                        {syncError && (
                            <>
                                <SectionHeader title="Sync Error" />
                                <div className="bg-[var(--color-surface-container)] rounded-xl card-shadow p-4 space-y-3">
                                    <p className="text-sm text-red-600 dark:text-red-400">{syncError}</p>
                                    <Button variant="secondary" onClick={() => setIsClearConfirmOpen(true)}>Clear Queue & Retry</Button>
                                </div>
                            </>
                        )}

                        <SectionHeader title="Data Management" />
                        <div className="bg-[var(--color-surface-container)] rounded-xl card-shadow overflow-hidden divide-y divide-[var(--color-border)]">
                            <SettingsItem icon={<InfoIcon />}>
                                <span>Sync Status</span>
                                <span className={syncStatusColor}>{syncStatusText}</span>
                            </SettingsItem>
                            <SettingsItem isLink onClick={handleSyncNow} icon={<SyncIcon className="w-5 h-5 text-[var(--color-text-secondary)]" />}>
                                <span className="text-blue-600 dark:text-blue-400">Sync Now</span>
                            </SettingsItem>
                            <SettingsItem isLink onClick={handleExportData} icon={<DownloadIcon className="w-5 h-5 text-[var(--color-text-secondary)]" />}>
                                <span className="text-blue-600 dark:text-blue-400">Export Data</span>
                            </SettingsItem>
                            <SettingsItem isLink onClick={handleImportClick} icon={<UploadIcon className="w-5 h-5 text-[var(--color-text-secondary)]" />}>
                                <span className="text-blue-600 dark:text-blue-400">Import Data</span>
                            </SettingsItem>
                        </div>
                        
                        <SectionHeader title="About & Help" />
                        <div className="bg-[var(--color-surface-container)] rounded-xl card-shadow overflow-hidden divide-y divide-[var(--color-border)]">
                            <SettingsItem icon={<InfoIcon />}>
                                <span>Version</span>
                                <span className="text-[var(--color-text-secondary)]">1.0.0</span>
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
            <DefaultListSheet
                isOpen={isListPickerOpen}
                onClose={() => setIsListPickerOpen(false)}
                lists={lists}
                current={defaultList}
                onSelect={(listName) => {
                    setDefaultList(listName);
                    setIsListPickerOpen(false);
                }}
            />
        </MainLayout>
    );
};

export default SettingsScreen;