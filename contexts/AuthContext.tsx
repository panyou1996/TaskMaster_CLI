import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { Session, User } from '@supabase/supabase-js';
import useLocalStorage from '../hooks/useLocalStorage';
import { UserProfile } from '../data/mockData';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    login: (email: string, pass: string) => Promise<any>;
    signup: (email: string, pass: string, fullName: string, username: string) => Promise<any>;
    logout: () => Promise<any>;
    resetPassword: (email: string) => Promise<any>;
    setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useLocalStorage<UserProfile | null>('userProfile', null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            setLoading(false);
        }).catch(err => {
            console.error("Error getting session:", err);
            setLoading(false);
        });

        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                const currentUser = session?.user ?? null;
                setSession(session);
                setUser(currentUser);
                if (event === 'SIGNED_OUT') {
                    setProfile(null);
                }
            }
        );

        return () => authListener.subscription.unsubscribe();
    }, [setProfile]);

    const login = (email: string, pass: string) => supabase.auth.signInWithPassword({ email, password: pass });
    const signup = (email: string, pass: string, fullName: string, username: string) => supabase.auth.signUp({ email, password: pass, options: { data: { full_name: fullName, username, avatar_url: `https://i.pravatar.cc/150?u=${username}` } } });
    const logout = () => supabase.auth.signOut();
    const resetPassword = (email: string) => supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });

    const value = {
        session,
        user,
        profile,
        loading,
        login,
        signup,
        logout,
        resetPassword,
        setProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
