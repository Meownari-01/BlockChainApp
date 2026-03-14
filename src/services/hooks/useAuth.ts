// src/hooks/useAuth.ts
import { useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthSession, UserRole } from '../../types';
import { auth } from '../../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

const AUTH_KEY = 'chaindeliver_session';

// Storage helper to handle web fallback
const storage = {
    async getItem(key: string): Promise<string | null> {
        if (Platform.OS === 'web') {
            return localStorage.getItem(key);
        }
        return await SecureStore.getItemAsync(key);
    },
    async setItem(key: string, value: string): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.setItem(key, value);
            return;
        }
        await SecureStore.setItemAsync(key, value);
    },
    async deleteItem(key: string): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.removeItem(key);
            return;
        }
        await SecureStore.deleteItemAsync(key);
    }
};

export function useAuth() {
    const [session, setSession] = useState<AuthSession | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            console.log(`[useAuth] Auth state changed. User: ${user?.email || 'null'} (UID: ${user?.uid || 'null'})`);
            
            if (user) {
                // If Firebase user exists, we might need to load the role from storage or Firestore
                const stored = await getStoredSession();
                console.log(`[useAuth] Stored session found:`, stored?.email || 'none');
                
                if (stored && (stored.email === user.email || stored.address === user.uid)) {
                    console.log(`[useAuth] Stored session matches user. Setting session.`);
                    setSession(stored);
                } else {
                    console.log(`[useAuth] Session mismatch or missing. Fetching from Firestore...`);
                    // Try to fetch from Firestore before defaulting
                    try {
                        const { ApiService } = require('../api');
                        const { role, user: userData } = await ApiService.getUserRole(user.uid);
                        const newSession: AuthSession = {
                            address: user.uid,
                            role: role,
                            name: userData.name || user.displayName || undefined,
                            email: user.email || undefined
                        };
                        console.log(`[useAuth] Fetched role: ${role}. Saving session.`);
                        setSession(newSession);
                        await saveStoredSession(newSession);
                    } catch (error) {
                        console.error("useAuth Profile Fetch Error:", error);
                        // Default for Firebase users if no stored session and fetch fails
                        const newSession: AuthSession = {
                            address: user.uid,
                            role: 'AGENT', // Default role for email login
                            name: user.displayName || undefined,
                            email: user.email || undefined
                        };
                        setSession(newSession);
                        await saveStoredSession(newSession);
                    }
                }
            } else {
                // Check if there's a wallet session even without Firebase user
                const stored = await getStoredSession();
                if (stored && !stored.email) {
                    console.log(`[useAuth] Wallet session detected (no email). Setting session.`);
                    setSession(stored);
                } else if (stored && stored.email) {
                     console.log(`[useAuth] Stored session has email but Firebase user is null. Waiting...`);
                     // IMPORTANT: Instead of setting session(null) immediately, which causes redirection,
                     // we wait for loading=false to handle the ultimate source of truth.
                     // But if we're definitely sure no user is coming, we should clear it.
                     // However, clearing here is what causes the redirect loop on refresh.
                } else {
                    setSession(null);
                }
            }
            setLoading(false);
            console.log(`[useAuth] Loading finished. Session role: ${session?.role || 'null'}`);
        });

        return () => unsubscribe();
    }, []);

    const saveSession = useCallback(async (data: AuthSession) => {
        await storage.setItem(AUTH_KEY, JSON.stringify(data));
        setSession(data);
    }, []);

    const loadSession = useCallback(async (): Promise<AuthSession | null> => {
        const raw = await storage.getItem(AUTH_KEY);
        if (raw) {
            const data = JSON.parse(raw) as AuthSession;
            setSession(data);
            return data;
        }
        return null;
    }, []);

    const clearSession = useCallback(async () => {
        await storage.deleteItem(AUTH_KEY);
        setSession(null);
    }, []);

    return { session, loading, saveSession, loadSession, clearSession };
}

export async function getStoredSession(): Promise<AuthSession | null> {
    try {
        const raw = await storage.getItem(AUTH_KEY);
        if (raw) return JSON.parse(raw) as AuthSession;
        return null;
    } catch {
        return null;
    }
}

export async function saveStoredSession(data: AuthSession): Promise<void> {
    await storage.setItem(AUTH_KEY, JSON.stringify(data));
}

export async function clearStoredSession(): Promise<void> {
    await storage.deleteItem(AUTH_KEY);
}

export function getRolePath(role: UserRole): string {
    switch (role) {
        case 'ADMIN': return '/(admin)/dashboard';
        case 'SHIPPER': return '/(shipper)/dashboard';
        case 'AGENT': return '/(agent)/dashboard';
        default: return '/(public)/track';
    }
}
