import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
    onAuthStateChanged,
    type User,
    signOut
} from 'firebase/auth';
import toast from 'react-hot-toast';
import { auth } from '../lib/firebase';

export const LAST_ACTIVITY_KEY = 'sontech_last_activity';
// Tiempo máximo de inactividad: 30 minutos
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_THROTTLE_MS = 5 * 1000;
const CHECK_INTERVAL_MS = 30 * 1000;

interface AuthContextType {
    user: User | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const lastWriteRef = useRef<number>(0);
    const isLoggingOutRef = useRef<boolean>(false);

    const logout = useCallback(async () => {
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        await signOut(auth);
    }, []);

    const handleInactivityLogout = useCallback(async () => {
        if (isLoggingOutRef.current) return;
        isLoggingOutRef.current = true;
        try {
            localStorage.removeItem(LAST_ACTIVITY_KEY);
            await signOut(auth);
            toast('Sesión cerrada por inactividad', { icon: '🔒' });
        } finally {
            isLoggingOutRef.current = false;
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const savedActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
                const now = Date.now();

                if (savedActivity && now - Number(savedActivity) > INACTIVITY_TIMEOUT_MS) {
                    await handleInactivityLogout();
                    setUser(null);
                    setLoading(false);
                    return;
                }

                localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
                lastWriteRef.current = now;
                setUser(currentUser);
            } else {
                localStorage.removeItem(LAST_ACTIVITY_KEY);
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [handleInactivityLogout]);

    useEffect(() => {
        if (!user) return;

        let timeoutId: ReturnType<typeof setTimeout>;

        const resetInactivityTimer = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                handleInactivityLogout();
            }, INACTIVITY_TIMEOUT_MS);
        };

        const checkAndRecordActivity = () => {
            const now = Date.now();
            const savedActivity = localStorage.getItem(LAST_ACTIVITY_KEY);

            if (savedActivity && now - Number(savedActivity) > INACTIVITY_TIMEOUT_MS) {
                handleInactivityLogout();
                return;
            }

            if (now - lastWriteRef.current >= ACTIVITY_THROTTLE_MS) {
                localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
                lastWriteRef.current = now;
            }

            resetInactivityTimer();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkAndRecordActivity();
            }
        };

        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === LAST_ACTIVITY_KEY && event.newValue) {
                resetInactivityTimer();
            }
        };

        const activityEvents: (keyof WindowEventMap)[] = [
            'mousemove',
            'mousedown',
            'keydown',
            'touchstart',
            'scroll',
            'click',
        ];

        activityEvents.forEach((eventName) => {
            window.addEventListener(eventName, checkAndRecordActivity, { passive: true });
        });
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('storage', handleStorageChange);

        resetInactivityTimer();

        const intervalId = setInterval(() => {
            const savedActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
            if (savedActivity && Date.now() - Number(savedActivity) > INACTIVITY_TIMEOUT_MS) {
                handleInactivityLogout();
            }
        }, CHECK_INTERVAL_MS);

        return () => {
            clearTimeout(timeoutId);
            clearInterval(intervalId);
            activityEvents.forEach((eventName) => {
                window.removeEventListener(eventName, checkAndRecordActivity);
            });
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [user, handleInactivityLogout]);

    return (
        <AuthContext.Provider value={{ user, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

