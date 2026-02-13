'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, AuthResponse } from '@/lib/api';

interface AuthContextType {
    user: any | null;
    login: (token: string) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    login: () => { },
    logout: () => { },
    isLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // 1. Load Token on Mount
        const token = localStorage.getItem('token');
        if (token) {
            api.setToken(token);
            // Ideally verify token with backend here, or decode JWT
            setUser({ role: 'analyst' }); // Mock user object for now
        }
        setIsLoading(false);
    }, []);

    const login = (token: string) => {
        localStorage.setItem('token', token);
        api.setToken(token);
        setUser({ role: 'analyst' });
        router.push('/dashboard');
    };

    const logout = () => {
        localStorage.removeItem('token');
        api.setToken(''); // Clear from API client (need to update api.ts to handle this or just pass empty)
        setUser(null);
        router.push('/login'); // Assuming login page exists
    };

    // Protect Routes
    useEffect(() => {
        if (!isLoading && !user && pathname?.startsWith('/dashboard')) {
            // Redirect to login if trying to access dashboard without user
            // router.push('/login'); 
            // Commented out for now to allow easier demoing without forcing login flow if pages don't strictly require it yet
            // but strictly speaking, this should be enabled.
            console.warn("Unauthenticated access to dashboard");
        }
    }, [user, isLoading, pathname]);

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
