import React, { createContext, useContext, useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { Session, User } from '@supabase/supabase-js';
import { 
    Task, 
    TaskList, 
    Moment, 
    UserProfile,
    initialTasksData,
    initialListsData,
    initialMomentsData,
} from '../data/mockData';
import useLocalStorage from '../hooks/useLocalStorage';

type OperationType = 
    | 'ADD_TASK' | 'UPDATE_TASK' | 'DELETE_TASK'
    | 'ADD_LIST' | 'UPDATE_LIST' | 'DELETE_LIST'
    | 'ADD_MOMENT' | 'UPDATE_MOMENT' | 'DELETE_MOMENT';

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
    addTask: (taskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed' | 'status'>) => Promise<void>;
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

    profile: UserProfile | null;
    setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
    syncData: (userOverride?: User | null) => Promise<void>;
    
    isOnline: boolean;
    isSyncing: boolean;
    offlineQueue: OfflineOperation[];
    syncError: string | null;
    clearOfflineQueue: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const getErrorMessage = (error: unknown): string => {
    // Log the full error for debugging purposes
    console.error("Supabase error object:", error);

    if (!error) {
        return "An unknown error occurred.";
    }
    
    // Check for nested error object (common in Supabase responses)
    if (typeof error === 'object' && error !== null && 'error' in error && error.error && typeof error.error === 'object' && 'message' in error.error) {
        const nestedError = error.error as { message: string, details?: string, hint?: string };
        let msg = nestedError.message;
        if (nestedError.details) msg += ` Details: ${nestedError.details}`;
        if (nestedError.hint) msg += ` Hint: ${nestedError.hint}`;
        return msg;
    }

    // Handle top-level Supabase PostgrestError objects
    if (typeof error === 'object' && error !== null && 'message' in error) {
        const errObj = error as { message: string, details?: string, hint?: string, code?: string };
        let msg = errObj.message;
        if (errObj.details) msg += ` Details: ${errObj.details}`;
        if (errObj.hint) msg += ` Hint: ${errObj.hint}`;
        return msg;
    }

    if (error instanceof Error) {
        return error.message;
    }

    // Fallback for other types of errors
    try {
        const str = JSON.stringify(error);
        if (str !== '{}' && str !== '[]') return str;
    } catch {
        // Fallback for circular structures or other stringify errors
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

    const cleanedPayload: { [key: string]: any } = { ...cleaned };

    // Ensure nullable fields that might be empty strings are sent as null,
    // only if the key exists in the update object.
    if ('dueDate' in cleanedPayload && (cleanedPayload.dueDate === '' || cleanedPayload.dueDate === undefined)) cleanedPayload.dueDate = null;
    if ('startDate' in cleanedPayload && (cleanedPayload.startDate === '' || cleanedPayload.startDate === undefined)) cleanedPayload.startDate = null;
    if ('startTime' in cleanedPayload && (cleanedPayload.startTime === '' || cleanedPayload.startTime === undefined)) cleanedPayload.startTime = null;
    if ('notes' in cleanedPayload && (cleanedPayload.notes === '' || cleanedPayload.notes === undefined)) cleanedPayload.notes = null;
    if ('today_assigned_date' in cleanedPayload && (cleanedPayload.today_assigned_date === '' || cleanedPayload.today_assigned_date === undefined)) cleanedPayload.today_assigned_date = null;
    
    // Ensure subtasks is an array if it's provided as part of the update.
    if ('subtasks' in cleanedPayload && (cleanedPayload.subtasks === undefined || cleanedPayload.subtasks === null)) {
        cleanedPayload.subtasks = [];
    }

    return cleanedPayload;
};


export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', initialTasksData);
    const [lists, setLists] = useLocalStorage<TaskList[]>('lists', initialListsData);
    const [moments, setMoments] = useLocalStorage<Moment[]>('moments', initialMomentsData);
    const [profile, setProfile] = useLocalStorage<UserProfile | null>('userProfile', null);

    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [offlineQueue, setOfflineQueue] = useLocalStorage<OfflineOperation[]>('offlineQueue', []);
    const [syncError, setSyncError] = useState<string | null>(null);
    const isProcessingQueue = useRef(false);
    const cleanupRun = useRef(false);

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
                }
                if (success) {
                    processedOperationIds.add(operation.id);
                }
            } catch (error: any) {
                console.error(`Failed to process offline operation "${operation.type}":`, error);
                const errorMessage = getErrorMessage(error);
                setSyncError(`Failed to process offline operation "${operation.type}": ${errorMessage}`);
                if (processedOperationIds.size > 0) {
                    setOfflineQueue(current => current.filter(op => !processedOperationIds.has(op.id)));
                }
                isProcessingQueue.current = false;
                return;
            }
        }
    
        if (processedOperationIds.size > 0) {
            setOfflineQueue(current => current.filter(op => !processedOperationIds.has(op.id)));
        }
        isProcessingQueue.current = false;
    }, [isOnline, offlineQueue, setOfflineQueue, setTasks, setLists, setMoments]);
    
    const syncData = useCallback(async (userOverride?: User | null) => {
        const targetUser = userOverride !== undefined ? userOverride : user;
        if (!targetUser || !isOnline || isSyncing) {
            return;
        }
    
        setIsSyncing(true);
        setSyncError(null);
    
        try {
            await processOfflineQueueInternal(targetUser);

            const [{ data: profileData, error: profileError }, { data: listsData, error: listsError }, { data: tasksData, error: tasksError }, { data: momentsData, error: momentsError }] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', targetUser.id).single(),
                supabase.from('lists').select('*').eq('user_id', targetUser.id),
                supabase.from('tasks').select('*').eq('user_id', targetUser.id),
                supabase.from('moments').select('*').eq('user_id', targetUser.id)
            ]);
    
            if (profileError && profileError.code !== 'PGRST116') throw profileError;
            if (listsError) throw listsError;
            if (tasksError) throw tasksError;
            if (momentsError) throw momentsError;
    
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
                    const pendingDeletionIds = new Set(offlineQueue.filter(op => op.type === 'DELETE_TASK').map(op => op.payload.taskId));
                    const serverDataFiltered = tasksData.filter(t => !pendingDeletionIds.has(t.id));

                    const localUpdates = new Map(currentLocalTasks.filter(t => t.status === 'pending').map(t => [t.id, t]));
                    const syncedData = serverDataFiltered.map(serverTask => localUpdates.get(serverTask.id) || serverTask);
                    const syncedIds = new Set(syncedData.map(t => t.id));
                    const newItems = currentLocalTasks.filter(t => t.status === 'pending' && !syncedIds.has(t.id));
                    return [...syncedData, ...newItems];
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
        } catch (error) {
            console.error("A critical error occurred during data sync:", error);
            const errorMessage = getErrorMessage(error);
            setSyncError(`A critical error occurred during data sync: ${errorMessage}`);
        } finally {
            setIsSyncing(false);
        }
    }, [user, isOnline, isSyncing, offlineQueue, processOfflineQueueInternal, setProfile, setLists, setTasks, setMoments]);

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
              setOfflineQueue([]);
              setSyncError(null);
            }
          }
        );
    
        return () => authListener.subscription.unsubscribe();
    }, [setOfflineQueue]);

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

    const addTask = useCallback(async (taskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed' | 'status'>) => {
        if (!user) throw new Error("User not logged in");
        const tempId = `temp_${Date.now()}`;

        // Ensure all required fields for DB insert are present.
        const dataForSupabase = { ...taskData, completed: false };
        if (dataForSupabase.today) {
            (dataForSupabase as Partial<Task>).today_assigned_date = new Date().toISOString().split('T')[0];
        }

        // Create the full local task object
        const newTask: Task = { ...dataForSupabase, id: tempId, user_id: user.id, status: 'pending' };
        setTasks(current => [...current, newTask]);

        // Clean the data and add to offline queue
        const supabaseTaskData = cleanTaskForSupabase(dataForSupabase);
        addToQueue({ type: 'ADD_TASK', payload: { taskData: supabaseTaskData }, tempId });
    }, [user, setTasks, addToQueue]);

    const updateTask = useCallback(async (taskId: string | number, updates: Partial<Task>) => {
        const fullUpdates = { ...updates };
        if (fullUpdates.today === true) {
            fullUpdates.today_assigned_date = new Date().toISOString().split('T')[0];
        } else if (fullUpdates.today === false) {
            fullUpdates.today_assigned_date = undefined;
        }

        // Apply updates locally first, marking as pending
        setTasks(current => current.map(t => t.id === taskId ? { ...t, ...fullUpdates, status: 'pending' } : t));

        if (typeof taskId === 'string' && taskId.startsWith('temp_')) {
            // The task is not yet synced, so we find its 'ADD_TASK' operation in the queue and merge the updates.
            setOfflineQueue(currentQueue => currentQueue.map(op => {
                if (op.tempId === taskId && op.type === 'ADD_TASK') {
                    const updatedPayloadData = { ...op.payload.taskData, ...cleanTaskForSupabase(fullUpdates) };
                    return { ...op, payload: { taskData: updatedPayloadData } };
                }
                return op;
            }));
        } else {
            // The task is synced, queue an UPDATE_TASK operation.
            const supabaseUpdates = cleanTaskForSupabase(fullUpdates);
            addToQueue({ type: 'UPDATE_TASK', payload: { taskId, updates: supabaseUpdates } });
        }
    }, [setTasks, setOfflineQueue, addToQueue]);

    const deleteTask = useCallback(async (taskId: string | number) => {
        setTasks(current => current.filter(t => t.id !== taskId));
        if (typeof taskId === 'string' && taskId.startsWith('temp_')) {
            setOfflineQueue(currentQueue => currentQueue.filter(op => op.tempId !== taskId));
        } else {
            addToQueue({ type: 'DELETE_TASK', payload: { taskId } });
        }
    }, [setTasks, setOfflineQueue, addToQueue]);

    const addList = useCallback(async (listData: Omit<TaskList, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status'>) => {
        if (!user) throw new Error("User not logged in");
        const tempId = `temp_${Date.now()}`;
        const newList: TaskList = { ...listData, id: tempId, user_id: user.id, status: 'pending' };
        setLists(current => [...current, newList]);
        addToQueue({ type: 'ADD_LIST', payload: { listData }, tempId });
    }, [user, setLists, addToQueue]);
    
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

    const addMoment = useCallback(async (momentData: Omit<Moment, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status'>) => {
        if (!user) throw new Error("User not logged in");
        const tempId = `temp_${Date.now()}`;
        const newMoment: Moment = { ...momentData, id: tempId, user_id: user.id, status: 'pending' };
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

    useEffect(() => {
        if (user && tasks.length > 0 && !cleanupRun.current) {
            const todayStr = new Date().toISOString().split('T')[0];
            
            tasks.forEach(task => {
                if (task.today && !task.completed && task.today_assigned_date && task.today_assigned_date !== todayStr) {
                    updateTask(task.id, { today: false });
                }
            });
            
            cleanupRun.current = true;
        }
    }, [user, tasks, updateTask]);

    const value = useMemo(() => ({
        session, user, loading,
        login: (email, pass) => supabase.auth.signInWithPassword({ email, password: pass }),
        signup: (email, pass, fullName, username) => supabase.auth.signUp({ email, password: pass, options: { data: { full_name: fullName, username, avatar_url: `https://i.pravatar.cc/150?u=${username}` } } }),
        logout: () => supabase.auth.signOut(),
        resetPassword: (email) => supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin }),
        tasks, setTasks,
        lists, setLists,
        moments, setMoments,
        profile, setProfile,
        syncData,
        isOnline, isSyncing, offlineQueue, syncError, clearOfflineQueue,
        addTask, updateTask, deleteTask,
        addList, updateList, deleteList,
        addMoment, updateMoment, deleteMoment,
    }), [session, user, loading, tasks, lists, moments, profile, isOnline, isSyncing, offlineQueue, syncError, syncData, setTasks, setLists, setMoments, setProfile, clearOfflineQueue, addTask, updateTask, deleteTask, addList, updateList, deleteList, addMoment, updateMoment, deleteMoment]);

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