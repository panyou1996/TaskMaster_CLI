import React, { createContext, useContext, useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { Session, User } from '@supabase/supabase-js';
import { 
    Task, 
    TaskList, 
    Moment, 
    UserProfile,
    FocusSession,
    Note,
    Attachment,
    initialTasksData,
    initialListsData,
    initialMomentsData,
    initialFocusHistoryData,
    initialNotesData,
} from '../data/mockData';
import useLocalStorage from '../hooks/useLocalStorage';
import { LocalNotifications } from '@capacitor/local-notifications';
import { checkAndRequestNotificationPermission } from '../utils/permissions';
import { Capacitor } from '@capacitor/core';
import { type Theme, type FontSize } from '../screens/settings/ThemeSettingsScreen';
import { getLocalISOString } from '../utils/date';

type OperationType = 
    | 'ADD_TASK' | 'UPDATE_TASK' | 'DELETE_TASK'
    | 'ADD_LIST' | 'UPDATE_LIST' | 'DELETE_LIST'
    | 'ADD_MOMENT' | 'UPDATE_MOMENT' | 'DELETE_MOMENT'
    | 'ADD_FOCUS_SESSION'
    | 'ADD_NOTE' | 'UPDATE_NOTE' | 'DELETE_NOTE';

interface OfflineOperation {
    id: string; // Unique ID for the operation itself
    type: OperationType;
    payload: any;
    timestamp: number;
    tempId?: string; // For creation operations
}

// Define the shape of our context data
interface DataContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    login: (email: string, pass: string) => Promise<any>;
    signup: (email: string, pass: string, fullName: string, username: string) => Promise<any>;
    logout: () => Promise<any>;
    resetPassword: (email: string) => Promise<any>;
    
    tasks: Task[];
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    addTask: (taskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed' | 'status'>) => Promise<string | undefined>;
    updateTask: (taskId: number | string, updates: Partial<Task>) => Promise<void>;
    deleteTask: (taskId: number | string) => Promise<void>;

    lists: TaskList[];
    setLists: React.Dispatch<React.SetStateAction<TaskList[]>>;
    addList: (listData: Omit<TaskList, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status'>) => Promise<void>;
    updateList: (listId: number | string, updates: Partial<TaskList>) => Promise<void>;
    deleteList: (listId: number | string, listName: string) => Promise<void>;

    moments: Moment[];
    setMoments: React.Dispatch<React.SetStateAction<Moment[]>>;
    addMoment: (momentData: Omit<Moment, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status'>) => Promise<void>;
    updateMoment: (momentId: number | string, updates: Partial<Moment>) => Promise<void>;
    deleteMoment: (momentId: number | string) => Promise<void>;

    notes: Note[];
    setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
    addNote: (noteData: Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status'>, filesToUpload?: File[]) => Promise<void>;
    updateNote: (noteId: number | string, updates: Partial<Note>, filesToUpload?: File[]) => Promise<void>;
    deleteNote: (noteId: number | string) => Promise<void>;

    focusHistory: FocusSession[];
    addFocusSession: (sessionData: Omit<FocusSession, 'id' | 'user_id' | 'created_at' | 'status'>) => Promise<void>;

    profile: UserProfile | null;
    setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
    syncData: (userOverride?: User | null) => Promise<void>;
    
    isOnline: boolean;
    isSyncing: boolean;
    offlineQueue: OfflineOperation[];
    syncError: string | null;
    clearOfflineQueue: () => void;
    rescheduleAllNotifications: () => Promise<void>;
    
    tags: string[];
    addTag: (tag: string) => void;
    updateTag: (oldName: string, newName: string) => Promise<void>;
    deleteTag: (tag: string) => Promise<void>;

    theme: Theme;
    setTheme: React.Dispatch<React.SetStateAction<Theme>>;
    fontSize: FontSize;
    setFontSize: React.Dispatch<React.SetStateAction<FontSize>>;
    
    debugLog: string[];
    addDebugLog: (log: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const getErrorMessage = (error: unknown): string => {
    console.error("Supabase error object (raw):", error);

    if (!error) return "An unknown error occurred.";

    if (typeof error === 'object' && error !== null && 'message' in error) {
        return String((error as { message: unknown }).message);
    }

    if (error instanceof Error) {
        return error.message;
    }
    
    try {
        const str = JSON.stringify(error, null, 2);
        if (str !== '{}' && str !== '[]') return str;
    } catch {
        // Fallback for circular structures
    }

    return String(error);
};


const cleanTaskForSupabase = (task: Partial<Task>) => {
    const cleaned = { ...task };
    // Remove client-only or DB-generated fields
    delete cleaned.id;
    delete cleaned.user_id;
    delete cleaned.created_at;
    delete cleaned.updated_at;
    delete cleaned.status;
    delete cleaned.color;
    delete cleaned.time;
    delete cleaned.calendar_event_id;
    delete cleaned.calendar_provider;

    const cleanedPayload: { [key: string]: any } = { ...cleaned };

    if ('dueDate' in cleanedPayload && (cleanedPayload.dueDate === '' || cleanedPayload.dueDate === undefined)) cleanedPayload.dueDate = null;
    if ('startDate' in cleanedPayload && (cleanedPayload.startDate === '' || cleanedPayload.startDate === undefined)) cleanedPayload.startDate = null;
    if ('startTime' in cleanedPayload && (cleanedPayload.startTime === '' || cleanedPayload.startTime === undefined)) cleanedPayload.startTime = null;
    if ('notes' in cleanedPayload && (cleanedPayload.notes === '' || cleanedPayload.notes === undefined)) cleanedPayload.notes = null;
    if ('today_assigned_date' in cleanedPayload && (cleanedPayload.today_assigned_date === '' || cleanedPayload.today_assigned_date === undefined)) cleanedPayload.today_assigned_date = null;
    if ('reminder' in cleanedPayload && cleanedPayload.reminder === undefined) cleanedPayload.reminder = null;
    if ('completed_at' in cleanedPayload && (cleanedPayload.completed_at === '' || cleanedPayload.completed_at === undefined)) cleanedPayload.completed_at = null;
    
    if ('subtasks' in cleanedPayload && (cleanedPayload.subtasks === undefined || cleanedPayload.subtasks === null)) {
        cleanedPayload.subtasks = [];
    }

    Object.keys(cleanedPayload).forEach(key => {
        if (cleanedPayload[key] === undefined) {
            delete cleanedPayload[key];
        }
    });

    return cleanedPayload;
};

// --- Notification Helpers ---
const getNotificationId = (taskId: number | string): number => {
    if (typeof taskId === 'number') {
        return taskId;
    }
    // For temp string IDs like "temp_1678886400000"
    // Use a portion of the timestamp to create a unique 32-bit integer.
    const timestampPart = parseInt(taskId.substring(taskId.length - 9), 10);
    return timestampPart; 
};

const areNotificationsGloballyEnabled = () => {
    try {
        const item = window.localStorage.getItem('notifications_taskReminders');
        return item ? JSON.parse(item) : true; // Default to true
    } catch {
        return true;
    }
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', initialTasksData);
    const [lists, setLists] = useLocalStorage<TaskList[]>('lists', initialListsData);
    const [moments, setMoments] = useLocalStorage<Moment[]>('moments', initialMomentsData);
    const [notes, setNotes] = useLocalStorage<Note[]>('notes', initialNotesData);
    const [profile, setProfile] = useLocalStorage<UserProfile | null>('userProfile', null);
    const [tags, setTags] = useLocalStorage<string[]>('checkinTags', []);
    const [focusHistory, setFocusHistory] = useLocalStorage<FocusSession[]>('focusHistory', initialFocusHistoryData);

    const [theme, setTheme] = useLocalStorage<Theme>('app-theme', 'System');
    const [fontSize, setFontSize] = useLocalStorage<FontSize>('app-font-size', 'lg');

    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [offlineQueue, setOfflineQueue] = useLocalStorage<OfflineOperation[]>('offlineQueue', []);
    const [syncError, setSyncError] = useState<string | null>(null);
    const isProcessingQueue = useRef(false);
    const cleanupRun = useRef(false);
    // Keep a ref to the offline queue to avoid stale closures during sync
    const offlineQueueRef = useRef<OfflineOperation[]>(offlineQueue);

    // Keep the ref in sync whenever offlineQueue state changes so other callbacks can read latest pending ops
    useEffect(() => {
        offlineQueueRef.current = offlineQueue;
    }, [offlineQueue]);
    
    const [debugLog, setDebugLog] = useState<string[]>([]);
    const addDebugLog = useCallback((log: string) => {
        const timestamp = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        } as Intl.DateTimeFormatOptions);
        setDebugLog(prev => [`[${timestamp}] ${log}`, ...prev].slice(0, 20));
    }, []);

    const webNotificationTimeouts = useRef<Map<string | number, ReturnType<typeof setTimeout>>>(new Map());

    const cancelNotification = useCallback(async (taskId: number | string) => {
        try {
            if (Capacitor.isNativePlatform()) {
                const notificationId = getNotificationId(taskId);
                const pending = await LocalNotifications.getPending();
                if (pending.notifications.some(n => n.id === notificationId)) {
                    await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
                }
            } else {
                const timeoutId = webNotificationTimeouts.current.get(taskId);
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    webNotificationTimeouts.current.delete(taskId);
                }
            }
        } catch (e) {
            console.error("Failed to cancel notification:", e);
        }
    }, []);

    const scheduleNotification = useCallback(async (task: Task) => {
        await cancelNotification(task.id);

        if (!areNotificationsGloballyEnabled() || task.reminder === null || task.reminder === undefined || !task.startTime || task.completed) {
            return;
        }

        const permissionGranted = await checkAndRequestNotificationPermission();
        if (!permissionGranted) {
            return;
        }

        // Derive the event date: prefer startDate, then dueDate, then today's date when assigned to Today
        const eventDateStr = task.startDate || task.dueDate || (task.today ? getLocalISOString() : undefined);
        if (!eventDateStr) {
            // Cannot determine which date the startTime belongs to; skip scheduling
            addDebugLog(`Skipping scheduling for task ${task.id}: no event date available`);
            return;
        }
        const [year, month, day] = eventDateStr.split('-').map(Number);
        const [hour, minute] = task.startTime.split(':').map(Number);

        if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
            console.warn('Invalid date/time for notification scheduling:', task.dueDate, task.startTime);
            return;
        }

        const eventTime = new Date(year, month - 1, day, hour, minute);
        const notifyAt = new Date(eventTime.getTime() - task.reminder * 60 * 1000);

        if (notifyAt < new Date()) {
            addDebugLog(`Not scheduling notification for task ${task.id}: notifyAt ${notifyAt.toISOString()} is in the past`);
            return; // Don't schedule notifications for past events
        }

        try {
            if (Capacitor.isNativePlatform()) {
                await LocalNotifications.schedule({
                    notifications: [{
                        title: "Task Reminder",
                        body: task.title,
                        id: getNotificationId(task.id),
                        schedule: { at: notifyAt },
                        sound: 'default',
                    }]
                });
            } else {
                const delay = notifyAt.getTime() - Date.now();
                if (delay > 0) {
                    addDebugLog(`Scheduling web notification for task ${task.id} in ${Math.round(delay/1000)}s at ${notifyAt.toISOString()}`);
                    const timeoutId = setTimeout(() => {
                        addDebugLog(`Web notification timeout fired for task ${task.id} (showing now)`);
                        if ('serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype) {
                            navigator.serviceWorker.ready.then(registration => {
                                const options: NotificationOptions = {
                                    body: task.title,
                                    icon: `data:image/svg+xml,<svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' stroke='%236D55A6' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9' /><path d='m9 12 2 2 4-4' /></svg>`,
                                    tag: String(task.id), // Use tag to prevent duplicate notifications and for identification
                                    actions: [
                                        { action: 'snooze', title: 'Snooze 5min' },
                                        { action: 'complete', title: 'Complete' }
                                    ],
                                    data: { taskId: task.id }
                                };
                                registration.showNotification('Task Reminder', options);
                            });
                        } else if (Notification.permission === 'granted') {
                            // Fallback for browsers without SW support
                            new Notification("Task Reminder", {
                                body: task.title,
                                icon: `data:image/svg+xml,<svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' stroke='%236D55A6' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9' /><path d='m9 12 2 2 4-4' /></svg>`
                            });
                        }
                        webNotificationTimeouts.current.delete(task.id);
                    }, delay);
                    webNotificationTimeouts.current.set(task.id, timeoutId);
                }
            }
        } catch (e) {
            console.error("Failed to schedule notification:", e);
        }
    }, [cancelNotification, addDebugLog]);

    

    const rescheduleAllNotifications = useCallback(async () => {
        if (!areNotificationsGloballyEnabled()) return;
        
        const permissionGranted = await checkAndRequestNotificationPermission();
        if (!permissionGranted) return;

        try {
            if (Capacitor.isNativePlatform()) {
                const pending = await LocalNotifications.getPending();
                if (pending.notifications.length > 0) {
                    await LocalNotifications.cancel({ notifications: pending.notifications });
                }
            } else {
                webNotificationTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId));
                webNotificationTimeouts.current.clear();
            }
        } catch (e) {
            console.error("Error clearing notifications before rescheduling:", e);
        }

        for (const task of tasks) {
            if (!task.completed) {
                await scheduleNotification(task);
            }
        }
    }, [tasks, scheduleNotification]);
    
    const processOfflineQueueInternal = useCallback(async (targetUser: User) => {
        if (!isOnline || isProcessingQueue.current || offlineQueue.length === 0) {
            return;
        }
    
        isProcessingQueue.current = true;
        setSyncError(null);
    
        const queueToProcess = [...offlineQueue];
        const processedOperationIds = new Set<string>();
    
        for (const operation of queueToProcess) {
            try {
                let success = false;
                switch (operation.type) {
                     case 'ADD_TASK': {
                        const { data: synced, error } = await supabase.from('tasks').insert({ ...operation.payload.taskData, user_id: targetUser.id }).select().single();
                        if (error) throw error;
                        await cancelNotification(operation.tempId!);
                        await scheduleNotification({ ...synced, status: 'synced' });
                        setTasks(current => current.map(t => t.id === operation.tempId ? { ...synced, status: 'synced' } : t));
                        success = true;
                        break;
                    }
                    case 'UPDATE_TASK': {
                        const { error } = await supabase.from('tasks').update(operation.payload.updates).eq('id', operation.payload.taskId);
                        if (error) throw error;
                        setTasks(current => current.map(t => t.id === operation.payload.taskId ? { ...t, status: 'synced' } : t));
                        success = true;
                        break;
                    }
                    case 'DELETE_TASK': {
                        const { error } = await supabase.from('tasks').delete().eq('id', operation.payload.taskId);
                        if (error) throw error;
                        success = true;
                        break;
                    }
                     case 'ADD_LIST': {
                        const { data: synced, error } = await supabase.from('lists').insert({ ...operation.payload.listData, user_id: targetUser.id }).select().single();
                        if (error) throw error;
                        setLists(current => current.map(l => l.id === operation.tempId ? { ...synced, status: 'synced' } : l));
                        success = true;
                        break;
                    }
                    case 'UPDATE_LIST': {
                         const { updates, listId, oldName } = operation.payload;
                         if (updates.name && oldName && oldName !== updates.name) {
                             await supabase.from('tasks').update({ category: updates.name }).eq('category', oldName);
                         }
                         const { error } = await supabase.from('lists').update(updates).eq('id', listId);
                         if (error) throw error;
                         setLists(current => current.map(l => l.id === listId ? { ...l, status: 'synced' } : l));
                         success = true;
                         break;
                    }
                    case 'DELETE_LIST': {
                        const { listId, listName, defaultListCategory, defaultListColor } = operation.payload;
                        if (defaultListCategory) {
                            await supabase.from('tasks').update({ category: defaultListCategory, color: defaultListColor }).eq('category', listName);
                        }
                        const { error } = await supabase.from('lists').delete().eq('id', listId);
                        if (error) throw error;
                        success = true;
                        break;
                    }
                    case 'ADD_MOMENT': {
                        const { data: synced, error } = await supabase.from('moments').insert({ ...operation.payload.momentData, user_id: targetUser.id }).select().single();
                        if (error) throw error;
                        setMoments(current => current.map(m => m.id === operation.tempId ? { ...synced, status: 'synced' } : m));
                        success = true;
                        break;
                    }
                    case 'UPDATE_MOMENT': {
                        const { error } = await supabase.from('moments').update(operation.payload.updates).eq('id', operation.payload.momentId);
                        if (error) throw error;
                        setMoments(current => current.map(m => m.id === operation.payload.momentId ? { ...m, status: 'synced' } : m));
                        success = true;
                        break;
                    }
                    case 'DELETE_MOMENT': {
                        const { error } = await supabase.from('moments').delete().eq('id', operation.payload.momentId);
                        if (error) throw error;
                        success = true;
                        break;
                    }
                    case 'ADD_NOTE': {
                        const payload = operation.payload.noteData;
                        const noteDataForInsert: any = {
                            title: payload.title,
                            content: payload.content,
                            tags: payload.tags,
                            attachments: payload.attachments || [],
                            user_id: targetUser.id,
                        };
                        
                        if (payload.localAttachmentsToUpload) {
                            for (const attachmentToUpload of payload.localAttachmentsToUpload) {
                                const filePath = `${targetUser.id}/notes/${operation.tempId}/${attachmentToUpload.name}`;
                                const fileBody = Uint8Array.from(atob(attachmentToUpload.data), c => c.charCodeAt(0));
                                
                                const { error: uploadError } = await supabase.storage
                                    .from('note_attachments')
                                    .upload(filePath, fileBody, { contentType: attachmentToUpload.type, upsert: true });
                                if (uploadError) throw uploadError;

                                const { data: { publicUrl } } = supabase.storage.from('note_attachments').getPublicUrl(filePath);
                                noteDataForInsert.attachments.push({ name: attachmentToUpload.name, url: publicUrl, type: attachmentToUpload.type });
                            }
                        }
                        
                        const { data: synced, error } = await supabase.from('notes').insert(noteDataForInsert).select().single();
                        if (error) throw error;
                        
                        setNotes(current => current.map(n => n.id === operation.tempId ? { ...synced, status: 'synced' } : n));
                        success = true;
                        break;
                    }
                    case 'UPDATE_NOTE': {
                        const { noteId, updates } = operation.payload;
                        
                        const { data: serverNote } = await supabase.from('notes').select('attachments').eq('id', noteId).single();
                        const serverAttachments = serverNote?.attachments || [];

                        const finalUpdates: any = { ...updates };
                        let newAttachments: Attachment[] = updates.attachments !== undefined ? updates.attachments : [...serverAttachments];

                        // Upload new files
                        if (updates.localAttachmentsToUpload) {
                            for (const attachmentToUpload of updates.localAttachmentsToUpload) {
                                const filePath = `${targetUser.id}/notes/${noteId}/${attachmentToUpload.name}`;
                                const fileBody = Uint8Array.from(atob(attachmentToUpload.data), c => c.charCodeAt(0));
                                
                                const { error: uploadError } = await supabase.storage.from('note_attachments').upload(filePath, fileBody, { contentType: attachmentToUpload.type, upsert: true });
                                if (uploadError) throw uploadError;

                                const { data: { publicUrl } } = supabase.storage.from('note_attachments').getPublicUrl(filePath);
                                newAttachments.push({ name: attachmentToUpload.name, url: publicUrl, type: attachmentToUpload.type });
                            }
                        }
                        finalUpdates.attachments = newAttachments;
                        delete finalUpdates.localAttachmentsToUpload;

                        // Delete attachments that are no longer in the list
                        const clientAttachmentUrls = new Set(newAttachments.map((a: Attachment) => a.url));
                        const attachmentsToDelete = serverAttachments.filter((att: Attachment) => !clientAttachmentUrls.has(att.url));
                        if (attachmentsToDelete.length > 0) {
                            const pathsToRemove = attachmentsToDelete.map((att: Attachment) => new URL(att.url).pathname.split(`/storage/v1/object/public/note_attachments/`)[1]);
                            await supabase.storage.from('note_attachments').remove(pathsToRemove);
                        }

                        const { error } = await supabase.from('notes').update(finalUpdates).eq('id', noteId);
                        if (error) throw error;

                        setNotes(current => current.map(n => n.id === noteId ? { ...n, ...finalUpdates, status: 'synced', localAttachmentsToUpload: [] } : n));
                        success = true;
                        break;
                    }
                    case 'DELETE_NOTE': {
                        const { noteId } = operation.payload;
                        // Delete attachments folder from storage
                        const { data: files } = await supabase.storage.from('note_attachments').list(`${targetUser.id}/notes/${noteId}`);
                        if (files && files.length > 0) {
                            const pathsToRemove = files.map(file => `${targetUser.id}/notes/${noteId}/${file.name}`);
                            await supabase.storage.from('note_attachments').remove(pathsToRemove);
                        }

                        const { error } = await supabase.from('notes').delete().eq('id', noteId);
                        if (error) throw error;
                        success = true;
                        break;
                    }
                    case 'ADD_FOCUS_SESSION': {
                        const { data: synced, error } = await supabase.from('focus_sessions').insert({ ...operation.payload.sessionData, user_id: targetUser.id }).select().single();
                        if (error) throw error;
                        setFocusHistory(current => current.map(s => s.plant_id.toString() === operation.tempId ? { ...synced, status: 'synced' } : s));
                        success = true;
                        break;
                    }
                }
                if (success) {
                    processedOperationIds.add(operation.id);
                }
            } catch (error: any) {
                console.error(`Failed to process offline operation "${operation.type}":`, error);
                const errorMessage = getErrorMessage(error);
                setSyncError(`Failed to process offline operation "${operation.type}": ${errorMessage}`);
                if (processedOperationIds.size > 0) {
                    setOfflineQueue(current => {
                        const next = current.filter(op => !processedOperationIds.has(op.id));
                        offlineQueueRef.current = next;
                        return next;
                    });
                }
                isProcessingQueue.current = false;
                return;
            }
        }
    
        if (processedOperationIds.size > 0) {
            setOfflineQueue(current => {
                const next = current.filter(op => !processedOperationIds.has(op.id));
                offlineQueueRef.current = next;
                return next;
            });
        }
        isProcessingQueue.current = false;
    }, [isOnline, offlineQueue, setOfflineQueue, setTasks, setLists, setMoments, setFocusHistory, setNotes, scheduleNotification, cancelNotification]);
    
    const syncData = useCallback(async (userOverride?: User | null) => {
        const targetUser = userOverride !== undefined ? userOverride : user;
        console.log('[DataContext] syncData invoked', { targetUserId: targetUser?.id, isOnline, isSyncing, offlineQueueLength: offlineQueue.length });
        if (!targetUser) {
            console.log('[DataContext] syncData aborted: no target user');
            return;
        }
        if (!isOnline) {
            console.log('[DataContext] syncData aborted: offline');
            return;
        }
        if (isSyncing) {
            console.log('[DataContext] syncData aborted: already syncing');
            return;
        }
    
    console.log('[DataContext] syncData starting upload/process');
    setIsSyncing(true);
        setSyncError(null);
    
        try {
            await processOfflineQueueInternal(targetUser);
            // allow React state (offlineQueue) to settle before fetching server data to avoid races
            await new Promise(resolve => setTimeout(resolve, 0));

            const [{ data: profileData, error: profileError }, { data: listsData, error: listsError }, { data: tasksData, error: tasksError }, { data: momentsData, error: momentsError }, { data: notesData, error: notesError }, { data: focusData, error: focusError }] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', targetUser.id).single(),
                supabase.from('lists').select('*').eq('user_id', targetUser.id),
                supabase.from('tasks').select('*').eq('user_id', targetUser.id),
                supabase.from('moments').select('*').eq('user_id', targetUser.id),
                supabase.from('notes').select('*').eq('user_id', targetUser.id),
                supabase.from('focus_sessions').select('*').eq('user_id', targetUser.id)
            ]);
    
            if (profileError && profileError.code !== 'PGRST116') throw profileError;
            if (listsError) throw listsError;
            if (tasksError) throw tasksError;
            if (momentsError) throw momentsError;
            if (notesError) throw notesError;
            if (focusError) throw focusError;
    
            if (profileData) setProfile(profileData);
            
            if (listsData) {
                setLists(currentLocalLists => {
                    const pendingDeletionIds = new Set(offlineQueue.filter(op => op.type === 'DELETE_LIST').map(op => op.payload.listId));
                    const serverDataFiltered = listsData.filter(l => !pendingDeletionIds.has(l.id));

                    const localUpdates = new Map(currentLocalLists.filter(l => l.status === 'pending').map(l => [l.id, l]));
                    const syncedData = serverDataFiltered.map(serverList => localUpdates.get(serverList.id) || serverList);
                    const syncedIds = new Set(syncedData.map(l => l.id));
                    const newItems = currentLocalLists.filter(l => l.status === 'pending' && !syncedIds.has(l.id));
                    return [...syncedData, ...newItems];
                });
            }

            if (tasksData) {
                setTasks(currentLocalTasks => {
                    // Use offlineQueueRef.current to avoid stale closure
                    const pendingOps = offlineQueueRef.current || [];

                    const pendingDeletionIds = new Set(pendingOps.filter(op => op.type === 'DELETE_TASK').map(op => op.payload.taskId));
                    const pendingCreates = new Map(pendingOps.filter(op => op.type === 'ADD_TASK').map(op => [op.tempId, op.payload.taskData]));
                    const pendingUpdates = new Map(pendingOps.filter(op => op.type === 'UPDATE_TASK').map(op => [String(op.payload.taskId), op.payload.updates]));

                    const merged: Task[] = [];

                    // Apply server data, but skip items deleted locally and apply pending updates on top
                    for (const serverTask of tasksData) {
                        if (pendingDeletionIds.has(serverTask.id)) continue;

                        const serverIdStr = String(serverTask.id);
                        const pendingUpdate = pendingUpdates.get(serverIdStr);

                        // If there's a local pending version of the same id (status === 'pending'), prefer it
                        const localPending = currentLocalTasks.find(t => String(t.id) === serverIdStr && t.status === 'pending');
                        if (localPending) {
                            merged.push(localPending);
                            continue;
                        }

                        if (pendingUpdate) {
                            const mergedObj = Object.assign({}, serverTask, pendingUpdate, { status: 'pending' }) as Task;
                            merged.push(mergedObj);
                        } else {
                            merged.push(serverTask);
                        }
                    }

                    // Include local pending creations (temp ids) that are not present on server yet
                    const existingIds = new Set(merged.map(t => String(t.id)));
                    const localPendingCreates = currentLocalTasks.filter(t => t.status === 'pending' && typeof t.id === 'string' && t.id.startsWith('temp_'));
                    for (const p of localPendingCreates) {
                        if (!existingIds.has(String(p.id))) {
                            merged.push(p);
                        }
                    }

                    return merged;
                });
            }

            if (momentsData) {
                setMoments(currentLocalMoments => {
                    const pendingDeletionIds = new Set(offlineQueue.filter(op => op.type === 'DELETE_MOMENT').map(op => op.payload.momentId));
                    const serverDataFiltered = momentsData.filter(m => !pendingDeletionIds.has(m.id));
                    
                    const localUpdates = new Map(currentLocalMoments.filter(m => m.status === 'pending').map(m => [m.id, m]));
                    const syncedData = serverDataFiltered.map(serverMoment => localUpdates.get(serverMoment.id) || serverMoment);
                    const syncedIds = new Set(syncedData.map(m => m.id));
                    const newItems = currentLocalMoments.filter(m => m.status === 'pending' && !syncedIds.has(m.id));
                    return [...syncedData, ...newItems];
                });
            }
            
            if (notesData) {
                setNotes(currentLocalNotes => {
                    const pendingDeletionIds = new Set(offlineQueue.filter(op => op.type === 'DELETE_NOTE').map(op => op.payload.noteId));
                    const serverDataFiltered = notesData.filter(n => !pendingDeletionIds.has(n.id));

                    const localUpdates = new Map(currentLocalNotes.filter(n => n.status === 'pending').map(n => [n.id, n]));
                    const syncedData = serverDataFiltered.map(serverNote => localUpdates.get(serverNote.id) || serverNote);
                    const syncedIds = new Set(syncedData.map(n => n.id));
                    const newItems = currentLocalNotes.filter(n => n.status === 'pending' && !syncedIds.has(n.id));
                    return [...syncedData, ...newItems];
                });
            }
            
            if (focusData) {
                setFocusHistory(currentLocal => {
                    const localPending = currentLocal.filter(s => s.status === 'pending');
                    const localPendingIds = new Set(localPending.map(s => s.plant_id));
                    const serverDataFiltered = focusData.filter(s => !localPendingIds.has(s.plant_id));
                    return [...serverDataFiltered, ...localPending];
                });
            }

        } catch (error) {
            console.error("A critical error occurred during data sync:");
            console.dir(error); // Use console.dir for better object inspection
            const errorMessage = getErrorMessage(error);
            setSyncError(`Data sync failed: ${errorMessage}`);
        } finally {
            setIsSyncing(false);
        }
    }, [user, isOnline, isSyncing, offlineQueue, processOfflineQueueInternal, setProfile, setLists, setTasks, setMoments, setNotes, setFocusHistory]);

    const syncDataRef = useRef(syncData);
    useEffect(() => {
        syncDataRef.current = syncData;
    }, [syncData]);
    
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        if (isOnline && !isSyncing && offlineQueue.length > 0) {
            syncDataRef.current();
        }
    }, [isOnline, isSyncing, offlineQueue.length]);

    // Ensure notifications are (re)scheduled when the app loads or tasks change
    useEffect(() => {
        // Run asynchronously and don't block render
        (async () => {
            try {
                await rescheduleAllNotifications();
            } catch (e) {
                console.error('Failed to reschedule notifications on tasks change', e);
            }
        })();
    }, [rescheduleAllNotifications, tasks.length]);
    
    useEffect(() => {
        setLoading(true);
        supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session);
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          setLoading(false);
          if (currentUser) {
            syncDataRef.current(currentUser);
          }
        }).catch(err => {
            console.error("Error getting session:", err);
            setLoading(false);
        });
    
        const { data: authListener } = supabase.auth.onAuthStateChange(
          (event, session) => {
            const currentUser = session?.user ?? null;
            setSession(session);
            setUser(currentUser);
    
            if (event === 'SIGNED_IN' && currentUser) {
              syncDataRef.current(currentUser);
            }
    
            if (event === 'SIGNED_OUT') {
              cleanupRun.current = false;
              setProfile(null);
              setTasks([]);
              setLists([]);
              setMoments([]);
              setNotes([]);
              setFocusHistory([]);
              setOfflineQueue([]);
              offlineQueueRef.current = [];
              setSyncError(null);
            }
          }
        );
    
        return () => authListener.subscription.unsubscribe();
    }, [setOfflineQueue, setFocusHistory]);

    const addToQueue = useCallback((operation: Omit<OfflineOperation, 'id' | 'timestamp'>) => {
        const newOperation: OfflineOperation = {
            ...operation,
            id: `op_${Date.now()}_${Math.random()}`,
            timestamp: Date.now(),
        };
        setSyncError(null);
        setOfflineQueue(current => [...current, newOperation]);
    }, [setOfflineQueue]);

    const clearOfflineQueue = useCallback(() => {
        setOfflineQueue([]);
        setSyncError(null);
    }, [setOfflineQueue]);
    
    const addList = useCallback(async (listData: Omit<TaskList, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status'>) => {
        if (!user) throw new Error("User not logged in");
        const tempId = `temp_${Date.now()}`;
        const newList: TaskList = { ...listData, id: tempId, user_id: user.id, status: 'pending' };
        setLists(current => [...current, newList]);
        addToQueue({ type: 'ADD_LIST', payload: { listData }, tempId });
    }, [user, setLists, addToQueue]);

    // This effect ensures the 'Google Calendar' list exists if tasks from it are pulled,
    // without creating it prematurely or creating duplicates.
    useEffect(() => {
        if (user && !loading) {
            // 1. Check if there are any tasks that need the 'Google Calendar' list.
            const hasGoogleCalendarTasks = tasks.some(t => t.category === 'Google Calendar');

            if (hasGoogleCalendarTasks) {
                // 2. If tasks exist, check if the list is already present (synced or local).
                const hasGoogleCalendarList = lists.some(list => list.name === 'Google Calendar');
                
                if (!hasGoogleCalendarList) {
                    // 3. To prevent race conditions, also check if it's already in the offline queue.
                    const isPendingCreation = offlineQueue.some(op => 
                        op.type === 'ADD_LIST' && op.payload.listData.name === 'Google Calendar'
                    );

                    if (!isPendingCreation) {
                        // 4. If all checks pass, create the list.
                        addList({ name: 'Google Calendar', icon: '🗓️', color: 'blue' });
                    }
                }
            }
        }
    }, [user, lists, tasks, loading, offlineQueue, addList]);

    const addTask = useCallback(async (taskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed' | 'status'>): Promise<string | undefined> => {
        if (!user) {
            console.error("User not logged in");
            return;
        }
        const tempId = `temp_${Date.now()}`;

        const dataForSupabase = { ...taskData, completed: false };
        if (dataForSupabase.today) {
            (dataForSupabase as Partial<Task>).today_assigned_date = getLocalISOString();
        }

        const newTask: Task = { ...dataForSupabase, id: tempId, user_id: user.id, status: 'pending' };
        setTasks(current => [...current, newTask]);
        
        await scheduleNotification(newTask);

        const supabaseTaskData = cleanTaskForSupabase(dataForSupabase);
        addToQueue({ type: 'ADD_TASK', payload: { taskData: supabaseTaskData }, tempId });
        return tempId;
    }, [user, setTasks, addToQueue, scheduleNotification]);

    const updateTask = useCallback(async (taskId: string | number, updates: Partial<Task>) => {
        let updatedTask: Task | undefined;
        const fullUpdates = { ...updates };
        if (fullUpdates.today === true) {
            fullUpdates.today_assigned_date = getLocalISOString();
        } else if (fullUpdates.today === false) {
            fullUpdates.today_assigned_date = undefined;
        }

        if (fullUpdates.completed === true) {
            fullUpdates.completed_at = new Date().toISOString();
        } else if (fullUpdates.completed === false) {
            fullUpdates.completed_at = undefined;
        }

        setTasks(current => current.map(t => {
            if (t.id === taskId) {
                updatedTask = { ...t, ...fullUpdates, status: 'pending' };
                return updatedTask;
            }
            return t;
        }));
        
        if (updatedTask) {
             if (updatedTask.completed) {
                await cancelNotification(updatedTask.id);
            } else {
                await scheduleNotification(updatedTask);
            }
        }

        if (typeof taskId === 'string' && taskId.startsWith('temp_')) {
            setOfflineQueue(currentQueue => currentQueue.map(op => {
                if (op.tempId === taskId && op.type === 'ADD_TASK') {
                    const updatedPayloadData = { ...op.payload.taskData, ...cleanTaskForSupabase(fullUpdates) };
                    return { ...op, payload: { taskData: updatedPayloadData } };
                }
                return op;
            }));
        } else {
            const supabaseUpdates = cleanTaskForSupabase(fullUpdates);
            addToQueue({ type: 'UPDATE_TASK', payload: { taskId, updates: supabaseUpdates } });
        }
    }, [setTasks, setOfflineQueue, addToQueue, scheduleNotification, cancelNotification]);

    const deleteTask = useCallback(async (taskId: string | number) => {
        await cancelNotification(taskId);
        setTasks(current => current.filter(t => t.id !== taskId));
        if (typeof taskId === 'string' && taskId.startsWith('temp_')) {
            setOfflineQueue(currentQueue => currentQueue.filter(op => op.tempId !== taskId));
        } else {
            addToQueue({ type: 'DELETE_TASK', payload: { taskId } });
        }
    }, [setTasks, setOfflineQueue, addToQueue, cancelNotification]);
    
    const updateList = useCallback(async (listId: string | number, updates: Partial<TaskList>) => {
        const cleanUpdates = { ...updates };
        delete cleanUpdates.id;
        delete cleanUpdates.user_id;
        delete cleanUpdates.created_at;
        delete cleanUpdates.updated_at;
        delete cleanUpdates.status;

        const oldList = lists.find(l => l.id === listId);
        const oldName = oldList?.name;
        if (updates.name && oldName && oldName !== updates.name) {
            setTasks(current => current.map(t => t.category === oldName ? { ...t, category: updates.name!, status: 'pending' } : t));
        }
        setLists(current => current.map(l => l.id === listId ? { ...l, ...updates, status: 'pending' } : l));
        
        if (typeof listId === 'string' && listId.startsWith('temp_')) {
            setOfflineQueue(currentQueue => {
                return currentQueue.map(op => {
                    if (op.tempId === listId && op.type === 'ADD_LIST') {
                        const newOp = { ...op, payload: { listData: { ...op.payload.listData, ...cleanUpdates } } };
                        if (updates.name && oldName && oldName !== updates.name) {
                            currentQueue.forEach(taskOp => {
                                if (taskOp.type === 'ADD_TASK' && taskOp.payload.taskData.category === oldName) {
                                    taskOp.payload.taskData.category = updates.name;
                                }
                            });
                        }
                        return newOp;
                    }
                    return op;
                });
            });
        } else {
            addToQueue({ type: 'UPDATE_LIST', payload: { listId, updates: cleanUpdates, oldName } });
        }
    }, [lists, setLists, setTasks, setOfflineQueue, addToQueue]);

    const deleteList = useCallback(async (listId: string | number, listName: string) => {
        const defaultList = lists.find(l => l.name.toLowerCase() === 'personal') || lists.find(l => l.id !== listId);
        if (defaultList && defaultList.id !== listId) {
            setTasks(current => current.map(t => t.category === listName ? {...t, category: defaultList.name, color: defaultList.color, status: 'pending' } : t));
        }
        setLists(current => current.filter(l => l.id !== listId));

        if (typeof listId === 'string' && listId.startsWith('temp_')) {
            setOfflineQueue(currentQueue => currentQueue.filter(op => op.tempId !== listId));
        } else {
            addToQueue({ type: 'DELETE_LIST', payload: { listId, listName, defaultListCategory: defaultList?.name, defaultListColor: defaultList?.color } });
        }
    }, [lists, setLists, setTasks, setOfflineQueue, addToQueue]);

    // Listen for notification action messages from the service worker
    useEffect(() => {
        const handler = (event: MessageEvent) => {
            try {
                const data = event.data;
                if (data && data.type === 'NOTIFICATION_ACTION') {
                    if (data.action === 'complete' && data.taskId) {
                        // mark complete if the task still exists locally
                        updateTask(data.taskId, { completed: true }).catch(err => console.error('Failed to mark task complete from SW message', err));
                    }
                }
            } catch (e) {
                console.error('Error handling SW message in DataProvider', e);
            }
        };

        navigator.serviceWorker?.addEventListener('message', handler);
        return () => navigator.serviceWorker?.removeEventListener('message', handler);
    }, [updateTask]);

    const addMoment = useCallback(async (momentData: Omit<Moment, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status'>) => {
        if (!user) throw new Error("User not logged in");
        const tempId = `temp_${Date.now()}`;
        const newMoment: Moment = { ...momentData, id: tempId, user_id: user.id, status: 'pending', created_at: new Date().toISOString() };
        setMoments(current => [newMoment, ...current]);
        addToQueue({ type: 'ADD_MOMENT', payload: { momentData }, tempId });
    }, [user, setMoments, addToQueue]);

    const updateMoment = useCallback(async (momentId: string | number, updates: Partial<Moment>) => {
        const cleanUpdates = { ...updates };
        delete cleanUpdates.id;
        delete cleanUpdates.user_id;
        delete cleanUpdates.created_at;
        delete cleanUpdates.updated_at;
        delete cleanUpdates.status;

        setMoments(current => current.map(m => m.id === momentId ? { ...m, ...updates, status: 'pending' } : m));

        if (typeof momentId === 'string' && momentId.startsWith('temp_')) {
            setOfflineQueue(currentQueue => {
                return currentQueue.map(op => {
                    if (op.tempId === momentId && op.type === 'ADD_MOMENT') {
                        return { ...op, payload: { momentData: { ...op.payload.momentData, ...cleanUpdates } } };
                    }
                    return op;
                });
            });
        } else {
            addToQueue({ type: 'UPDATE_MOMENT', payload: { momentId, updates: cleanUpdates } });
        }
    }, [setMoments, setOfflineQueue, addToQueue]);

    const deleteMoment = useCallback(async (momentId: string | number) => {
        setMoments(current => current.filter(m => m.id !== momentId));
        if (typeof momentId === 'string' && momentId.startsWith('temp_')) {
            setOfflineQueue(currentQueue => currentQueue.filter(op => op.tempId !== momentId));
        } else {
            addToQueue({ type: 'DELETE_MOMENT', payload: { momentId } });
        }
    }, [setMoments, setOfflineQueue, addToQueue]);

    const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
    
    const addNote = useCallback(async (
        noteData: Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status'>,
        filesToUpload: File[] = []
    ) => {
        if (!user) throw new Error("User not logged in");
        const tempId = `temp_note_${Date.now()}`;
        
        const localAttachmentsToUpload = await Promise.all(filesToUpload.map(async file => ({
            name: file.name,
            type: file.type,
            data: await fileToBase64(file),
        })));
        
        const newNote: Note = { 
            ...noteData, 
            id: tempId, 
            user_id: user.id, 
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            attachments: [],
            localAttachmentsToUpload: localAttachmentsToUpload.length > 0 ? localAttachmentsToUpload : undefined
        };

        const payloadForQueue = { ...noteData, attachments: [], localAttachmentsToUpload: localAttachmentsToUpload.length > 0 ? localAttachmentsToUpload : undefined };
        
        addToQueue({ type: 'ADD_NOTE', payload: { noteData: payloadForQueue }, tempId });
        setNotes(current => [newNote, ...current]);
    }, [user, addToQueue, setNotes]);

    const updateNote = useCallback(async (
        noteId: number | string, 
        updates: Partial<Note>,
        filesToUpload: File[] = []
    ) => {
        const localAttachmentsToUpload = await Promise.all(filesToUpload.map(async file => ({
            name: file.name,
            type: file.type,
            data: await fileToBase64(file),
        })));

        setNotes(current => current.map(n => {
            if (n.id === noteId) {
                return { 
                    ...n, 
                    ...updates, 
                    localAttachmentsToUpload: [...(n.localAttachmentsToUpload || []), ...localAttachmentsToUpload],
                    status: 'pending',
                    updated_at: new Date().toISOString(),
                };
            }
            return n;
        }));
        
        const payloadForQueue = { ...updates, updated_at: new Date().toISOString() };
        if (localAttachmentsToUpload.length > 0) {
            (payloadForQueue as any).localAttachmentsToUpload = localAttachmentsToUpload;
        }

        if (typeof noteId === 'string' && noteId.startsWith('temp_')) {
            setOfflineQueue(currentQueue => currentQueue.map(op => {
                if (op.tempId === noteId && op.type === 'ADD_NOTE') {
                    return {
                        ...op,
                        payload: {
                            noteData: {
                                ...op.payload.noteData,
                                ...payloadForQueue,
                                localAttachmentsToUpload: [
                                    ...(op.payload.noteData.localAttachmentsToUpload || []),
                                    ...localAttachmentsToUpload,
                                ],
                            }
                        }
                    };
                }
                return op;
            }));
        } else {
            addToQueue({ type: 'UPDATE_NOTE', payload: { noteId, updates: payloadForQueue } });
        }
    }, [setNotes, setOfflineQueue, addToQueue]);

    const deleteNote = useCallback(async (noteId: string | number) => {
        setNotes(current => current.filter(n => n.id !== noteId));
        if (typeof noteId === 'string' && noteId.startsWith('temp_')) {
            setOfflineQueue(currentQueue => currentQueue.filter(op => op.tempId !== noteId));
        } else {
            addToQueue({ type: 'DELETE_NOTE', payload: { noteId } });
        }
    }, [setNotes, setOfflineQueue, addToQueue]);

    const addFocusSession = useCallback(async (sessionData: Omit<FocusSession, 'id' | 'user_id' | 'created_at' | 'status'>) => {
        if (!user) throw new Error("User not logged in");
        const newSession: FocusSession = { ...sessionData, user_id: user.id, status: 'pending' };
        setFocusHistory(current => [...current, newSession]);
        
        const { status, user_id, id, created_at, ...payloadForSupabase } = newSession;
        
        addToQueue({ type: 'ADD_FOCUS_SESSION', payload: { sessionData: payloadForSupabase }, tempId: String(sessionData.plant_id) });
    }, [user, setFocusHistory, addToQueue]);
    
    useEffect(() => {
        if (user && tasks.length > 0 && !cleanupRun.current) {
            const todayStr = getLocalISOString();
            
            tasks.forEach(task => {
                // If a task was assigned to 'Today' on a previous day, reset its 'today' status.
                // This applies to both completed and uncompleted tasks, cleaning up the Today view for the new day.
                if (task.today && task.today_assigned_date && task.today_assigned_date !== todayStr) {
                    updateTask(task.id, { today: false });
                }
            });
            
            cleanupRun.current = true;
        }
    }, [user, tasks, updateTask]);

    const addTag = useCallback((newTag: string) => {
        const trimmedTag = newTag.trim();
        if (trimmedTag && !tags.find(t => t.toLowerCase() === trimmedTag.toLowerCase())) {
            setTags(current => [...current, trimmedTag].sort());
        }
    }, [tags, setTags]);
    
    const updateTag = useCallback(async (oldName: string, newName: string) => {
        if (tags.some(t => t.toLowerCase() === newName.trim().toLowerCase() && t.toLowerCase() !== oldName.toLowerCase())) {
            throw new Error(`Tag "${newName.trim()}" already exists.`);
        }
        
        const trimmedNewName = newName.trim();

        setTags(current => {
            const newTags = current.map(t => t === oldName ? trimmedNewName : t);
            return [...new Set(newTags)].sort();
        });

        const momentsToUpdate = moments.filter(m => m.tags?.includes(oldName));
        const updatePromises = momentsToUpdate.map(moment => {
            const newTags = moment.tags?.map(t => t === oldName ? trimmedNewName : t);
            return updateMoment(moment.id, { tags: newTags });
        });
        
        await Promise.all(updatePromises);
    }, [tags, moments, setTags, updateMoment]);

    const deleteTag = useCallback(async (tagToDelete: string) => {
        setTags(current => current.filter(t => t !== tagToDelete));
    
        const momentsToUpdate = moments.filter(m => m.tags?.includes(tagToDelete));
        const updatePromises = momentsToUpdate.map(moment => {
            const newTags = moment.tags?.filter(t => t !== tagToDelete);
            return updateMoment(moment.id, { tags: newTags });
        });
        
        await Promise.all(updatePromises);
    }, [moments, setTags, updateMoment]);

    const value = useMemo(() => ({
        session, user, loading,
        login: (email, pass) => supabase.auth.signInWithPassword({ email, password: pass }),
        signup: (email, pass, fullName, username) => supabase.auth.signUp({ email, password: pass, options: { data: { full_name: fullName, username, avatar_url: `https://i.pravatar.cc/150?u=${username}` } } }),
        logout: () => supabase.auth.signOut(),
        resetPassword: (email) => supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin }),
        tasks, setTasks,
        lists, setLists,
        moments, setMoments,
        notes, setNotes,
        focusHistory,
        profile, setProfile,
        syncData,
        isOnline, isSyncing, offlineQueue, syncError, clearOfflineQueue, rescheduleAllNotifications,
        addTask, updateTask, deleteTask,
        addList, updateList, deleteList,
        addMoment, updateMoment, deleteMoment,
        addNote, updateNote, deleteNote,
        addFocusSession,
        tags, addTag, updateTag, deleteTag,
        theme, setTheme,
        fontSize, setFontSize,
        debugLog, addDebugLog,
    }), [session, user, loading, tasks, lists, moments, notes, focusHistory, profile, isOnline, isSyncing, offlineQueue, syncError, syncData, setTasks, setLists, setMoments, setNotes, setProfile, clearOfflineQueue, rescheduleAllNotifications, addTask, updateTask, deleteTask, addList, updateList, deleteList, addMoment, updateMoment, deleteMoment, addNote, updateNote, deleteNote, addFocusSession, tags, addTag, updateTag, deleteTag, theme, setTheme, fontSize, setFontSize, debugLog, addDebugLog]);

    // Stable window helper so users can call it in console: window.__debugNotifyNow('taskId')
    useEffect(() => {
        // attach once
        (window as any).__debugNotifyNow = async (taskId?: string | number) => {
            try {
                const t = taskId ? tasks.find(x => x.id === taskId) : tasks.find(x => !x.completed && x.today);
                if (!t) return console.warn('window.__debugNotifyNow: no matching task');
                console.log('[DataContext] window.__debugNotifyNow ->', t.id);
                if ('serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype) {
                    const registration = await navigator.serviceWorker.ready;
                    const options: NotificationOptions = {
                        body: t.title,
                        icon: `data:image/svg+xml,<svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' stroke='%236D55A6' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9' /><path d='m9 12 2 2 4-4' /></svg>`,
                        tag: String(t.id),
                        actions: [ { action: 'snooze_5', title: 'Snooze 5min' }, { action: 'snooze_15', title: 'Snooze 15min' }, { action: 'complete', title: 'Complete' } ],
                        data: { taskId: t.id, url: `/task/${t.id}` }
                    };
                    await registration.showNotification('Task Reminder', options);
                } else if (Notification.permission === 'granted') {
                    new Notification('Task Reminder', { body: t.title });
                } else {
                    console.warn('Notifications not permitted');
                }
            } catch (e) {
                console.error('window.__debugNotifyNow failed', e);
            }
        };
        return () => { try { delete (window as any).__debugNotifyNow; } catch {} };
    }, [tasks]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
