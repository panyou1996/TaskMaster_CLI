// Types
export interface Subtask {
    id: number;
    text: string;
    completed: boolean;
}

export interface Task {
    id: number | string;
    user_id?: string;
    created_at?: string;
    updated_at?: string;
    status?: 'pending' | 'synced';
    time?: string;
    duration?: number;
    type?: 'Fixed' | 'Flexible';
    title: string;
    category: string;
    color?: string;
    completed: boolean;
    completed_at?: string;
    important?: boolean;
    today?: boolean;
    today_assigned_date?: string;
    dueDate?: string;
    startDate?: string;
    startTime?: string;
    notes?: string;
    subtasks?: Subtask[];
    reminder?: number | null; // Minutes before due time. null = no reminder, 0 = on time.
    calendar_event_id?: string;
    calendar_provider?: string;
}

export interface TaskList {
    id: number | string;
    user_id?: string;
    created_at?: string;
    updated_at?: string;
    status?: 'pending' | 'synced';
    name: string;
    icon: string;
    color: string;
    description?: string;
}

export interface Moment {
    id: number | string;
    user_id?: string;
    created_at?: string;
    updated_at?: string;
    status?: 'pending' | 'synced';
    title: string;
    date?: string;
    notes?: string;
    tags?: string[];
    description: string;
    imageUrl: string;
}

export interface Attachment {
    name: string;
    url: string;
    type: string;
}

export interface Note {
    id: number | string;
    user_id?: string;
    created_at?: string;
    updated_at?: string;
    status?: 'pending' | 'synced';
    title: string;
    content: string;
    attachments: Attachment[];
    tags?: string[];
    // For offline handling of new attachments
    localAttachmentsToUpload?: { name: string; type: string; data: string }[];
}


export interface UserProfile {
    id: string; // Corresponds to Supabase auth user ID
    updated_at?: string;
    avatar_url: string;
    name: string;
    email: string;
    username: string;
    bio: string;
}

export interface FocusSession {
    id?: number; // from supabase
    user_id?: string;
    created_at?: string;
    plant_id: number; // from Date.now() on client
    session_date: string; // YYYY-MM-DD
    plant_type: string;
    duration: number; // in minutes
    status?: 'pending' | 'synced';
}


// Initial Data (will be replaced by fetched data)
export const initialTasksData: Task[] = [];
export const initialListsData: TaskList[] = [];
export const initialMomentsData: Moment[] = [];
export const initialNotesData: Note[] = [];
export const initialFocusHistoryData: FocusSession[] = [];

// This will be used only if a profile doesn't exist in the database yet.
export const initialProfile: UserProfile = {
    id: '',
    avatar_url: 'https://i.pravatar.cc/150?u=default',
    name: 'New User',
    email: '',
    username: 'new_user',
    bio: 'Welcome to TaskMaster!',
};