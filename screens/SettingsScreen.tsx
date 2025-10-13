import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CloseIcon, ChevronRightIcon, SyncIcon, DownloadIcon, UploadIcon, RefreshSpinnerIcon, BellIcon, ListCheckIcon, PaletteIcon, InfoIcon, CheckIcon, GoogleCalendarIcon, OutlookCalendarIcon } from '../../components/icons/Icons';
import { useData } from '../../contexts/DataContext';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import Button from '../../components/common/Button';
import MainLayout from '../../components/layouts/MainLayout';
import useLocalStorage from '../../hooks/useLocalStorage';
import { TaskList } from '../../data/mockData';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { supabase } from '../../utils/supabase';

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
  disabled?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ children, onClick, isLink = false, icon, disabled = false }) => {
    const commonClasses = "flex items-center p-4 text-[var(--color-text-primary)]";
    const interactionClasses = isLink && !disabled ? "hover:bg-[var(--color-surface-container-low)] transition-colors cursor-pointer" : "";
    const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "";
    
    return (
        <div className={`${commonClasses} ${interactionClasses} ${disabledClasses}`} onClick={disabled ? undefined : onClick}>
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
        <div className="p-4 space-y-2 overflow-y-auto max-h-[50vh]" style={{ paddingBottom: `calc(6rem + env(safe-area-inset-bottom, 0px))` }}>
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
        session, profile, isOnline, isSyncing, offlineQueue, syncData, syncError, clearOfflineQueue,
        tasks, lists, moments, setTasks, setLists, setMoments, setProfile
    } = useData();
    const location = useLocation();
    const navigate = useNavigate();

    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    
    // State for default list selection
    const [defaultList, setDefaultList] = useLocalStorage<string>('default-list', lists[0]?.name || 'Personal');
    const [isListPickerOpen, setIsListPickerOpen] = useState(false);
    
    // State for import functionality
    const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
    const [importFileData, setImportFileData] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for Calendar Sync
    const [googleConnected, setGoogleConnected] = useState(false);
    const [loadingGoogle, setLoadingGoogle] = useState(false);
    const [errorGoogle, setErrorGoogle] = useState<string | null>(null);
    const [isDisconnectConfirmOpen, setIsDisconnectConfirmOpen] = useState(false);
    const [isCalendarPushing, setIsCalendarPushing] = useState(false);
    const [isCalendarPulling, setIsCalendarPulling] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string | null>(null);

    // Check for calendar connection status on mount
    useEffect(() => {
        const checkConnections = async () => {
            const { data, error } = await supabase.from('calendar_connections').select('provider');
            if (error) {
                console.error("Error fetching calendar connections:", error);
                return;
            }
            if (data) {
                setGoogleConnected(data.some(conn => conn.provider === 'google'));
            }
        };
        
        if (session) {
            checkConnections();
        }
    }, [session]);

    // Check for auth callback errors in URL
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const errorParam = params.get('error');
        if (errorParam === 'calendar_connection_failed') {
            setErrorGoogle("Failed to connect to Google Calendar. Please try again.");
            // Clean up the URL
            navigate('/settings', { replace: true });
        }
    }, [location, navigate]);

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
            console.log('[SettingsScreen] Sync Now clicked');
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
                const result = await Filesystem.writeFile({
                    path: fileName,
                    data: jsonString,
                    directory: Directory.Documents,
                    encoding: Encoding.UTF8,
                });
                alert(`Data exported successfully! Saved to your Documents folder as ${fileName}`);
            } else {
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

    const handleImportClick = () => fileInputRef.current?.click();

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
            reader.readAsText(file);
        }
        if (event.target) event.target.value = '';
    };

    const handleConfirmImport = () => {
        if (!importFileData) return;
        try {
            const importedData = JSON.parse(importFileData);
            if (!Array.isArray(importedData.tasks) || !Array.isArray(importedData.lists) || !Array.isArray(importedData.moments) || !importedData.profile) {
                throw new Error("Invalid backup file format.");
            }
            clearOfflineQueue();
            setTasks(importedData.tasks);
            setLists(importedData.lists);
            setMoments(importedData.moments);
            setProfile(importedData.profile);
            setIsImportConfirmOpen(false);
            setImportFileData(null);
            alert("Data imported successfully! Your data will now be synced.");
            syncData();
        } catch (error) {
            console.error("Failed to import data:", error);
            alert(`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`);
            setIsImportConfirmOpen(false);
            setImportFileData(null);
        }
    };
    
    const handleConnectGoogle = async () => {
        if (!session) {
            alert("You must be logged in to connect your calendar.");
            return;
        }
        setLoadingGoogle(true);
        setErrorGoogle(null);

        try {
            const { data, error } = await supabase.functions.invoke('calendar-auth-start', {
                body: { provider: 'google' },
            });
            if (error) throw error;
            if (data.authUrl) {
                window.location.href = data.authUrl;
            } else {
                throw new Error("Could not get authorization URL.");
            }
        } catch (err: any) {
            console.error("Error starting Google Calendar auth:", err);
            setErrorGoogle(err.message || "An unknown error occurred.");
            setLoadingGoogle(false);
        }
    };

    const handleDisconnectGoogle = async () => {
        setIsDisconnectConfirmOpen(false);
        setLoadingGoogle(true);
        setErrorGoogle(null);
        try {
            const { error } = await supabase.from('calendar_connections').delete().eq('provider', 'google');
            if (error) throw error;
            setGoogleConnected(false);
        } catch (err: any) {
            console.error("Error disconnecting Google Calendar:", err);
            setErrorGoogle(err.message || "Could not disconnect.");
        } finally {
            setLoadingGoogle(false);
        }
    };

    const handleCalendarPush = async () => {
        setIsCalendarPushing(true);
        setSyncMessage(null);
        setErrorGoogle(null);
    
        try {
            const { error } = await supabase.functions.invoke('calendar-sync', {
                body: { provider: 'google' },
            });
    
            if (error) throw error;
            
            setSyncMessage("Push completed successfully!");
            syncData(); // Re-fetch all data to get latest changes from sync
        } catch (err: any) {
            console.error("Error pushing to calendar:", err);
            setErrorGoogle(err.message || "An unknown error occurred during push.");
        } finally {
            setIsCalendarPushing(false);
            setTimeout(() => setSyncMessage(null), 3000);
        }
    };

    const handleCalendarPull = async () => {
        setIsCalendarPulling(true);
        setSyncMessage(null);
        setErrorGoogle(null);
    
        try {
            const { data, error } = await supabase.functions.invoke('calendar-pull');
    
            if (error) throw error;
            
            setSyncMessage(data.message || "Pull completed successfully! Refreshing data...");
            await syncData(); // Re-fetch all data to get latest tasks
        } catch (err: any) {
            console.error("Error pulling from calendar:", err);
            setErrorGoogle(err.message || "An unknown error occurred during pull.");
        } finally {
            setIsCalendarPulling(false);
            setTimeout(() => setSyncMessage(null), 3000);
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
                    className="px-6 pt-6 pb-4 flex justify-center items-center flex-shrink-0 bg-[var(--color-surface-container)] border-b border-[var(--color-border)]"
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
                        
                        <SectionHeader title="Integrations" />
                        {errorGoogle && <p className="text-[var(--color-functional-red)] text-sm px-4 -mt-2 mb-2">{errorGoogle}</p>}
                        {syncMessage && <p className="text-green-600 dark:text-green-400 text-sm px-4 -mt-2 mb-2">{syncMessage}</p>}
                        <div className="bg-[var(--color-surface-container)] rounded-xl card-shadow overflow-hidden divide-y divide-[var(--color-border)]">
                            <SettingsItem isLink icon={<GoogleCalendarIcon />} onClick={googleConnected ? () => setIsDisconnectConfirmOpen(true) : handleConnectGoogle} disabled={loadingGoogle}>
                                <span>Google Calendar</span>
                                <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                                    {loadingGoogle ? (
                                        <RefreshSpinnerIcon />
                                    ) : (
                                        <span className={googleConnected ? 'text-green-600 dark:text-green-400' : ''}>
                                            {googleConnected ? 'Connected' : 'Not Connected'}
                                        </span>
                                    )}
                                    <ChevronRightIcon />
                                </div>
                            </SettingsItem>
                            <SettingsItem isLink icon={<OutlookCalendarIcon />} onClick={() => alert('Outlook Calendar sync coming soon!')}>
                                <span>Outlook Calendar</span>
                                 <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                                    <span>Not Connected</span>
                                    <ChevronRightIcon />
                                </div>
                            </SettingsItem>
                        </div>
                        {googleConnected && (
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <Button variant="secondary" onClick={handleCalendarPull} disabled={isCalendarPulling || isCalendarPushing}>
                                    {isCalendarPulling ? 'Pulling...' : 'Pull from Calendar'}
                                </Button>
                                <Button variant="secondary" onClick={handleCalendarPush} disabled={isCalendarPushing || isCalendarPulling}>
                                    {isCalendarPushing ? 'Pushing...' : 'Push to Calendar'}
                                </Button>
                            </div>
                        )}

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
            <ConfirmationModal
                isOpen={isDisconnectConfirmOpen}
                onClose={() => setIsDisconnectConfirmOpen(false)}
                onConfirm={handleDisconnectGoogle}
                title="Disconnect Google Calendar?"
                message="Are you sure you want to disconnect? Your tasks will no longer be synced with Google Calendar."
                confirmText="Disconnect"
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