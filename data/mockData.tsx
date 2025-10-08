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
    important?: boolean;
    today?: boolean;
    today_assigned_date?: string;
    dueDate?: string;
    startDate?: string;
    startTime?: string;
    notes?: string;
    subtasks?: Subtask[];
    reminder?: number | null; // Minutes before due time. null = no reminder, 0 = on time.
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

export interface UserProfile {
    id: string; // Corresponds to Supabase auth user ID
    updated_at?: string;
    avatar_url: string;
    name: string;
    email: string;
    username: string;
    bio: string;
}


// Initial Data (will be replaced by fetched data)
export const initialTasksData: Task[] = [];
export const initialListsData: TaskList[] = [];
export const initialMomentsData: Moment[] = [];

// This will be used only if a profile doesn't exist in the database yet.
export const initialProfile: UserProfile = {
    id: '',
    avatar_url: 'https://i.pravatar.cc/150?u=default',
    name: 'New User',
    email: '',
    username: 'new_user',
    bio: 'Welcome to TaskMaster!',
};