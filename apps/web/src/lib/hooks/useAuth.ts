import { create } from "zustand";
import { authService } from "@/lib/services/auth";
import { webTokenStorage } from "@lms/auth/storage/web";
import { AuthUser, normalizeRoles } from "@lms/core";

interface AuthState {
    user: AuthUser | null;
    accessToken: string | null;
    refreshToken: string | null;
    isLoading: boolean;
    login: (accessToken: string, refreshToken: string, user: AuthUser) => void;
    setTokens: (accessToken: string, refreshToken: string) => void;
    setUser: (user: AuthUser | null) => void;
    logout: () => Promise<void>;
    initialize: () => Promise<void>;
}

const normalizeUser = (user: AuthUser | null): AuthUser | null => {
    if (!user) return null;
    return { ...user, roles: normalizeRoles((user as any).roles) };
};

export const useAuth = create<AuthState>((set) => ({
    user: null,
    accessToken: null,
    refreshToken: null,
    isLoading: true,
    login: (accessToken: string, refreshToken: string, user: AuthUser) => {
        webTokenStorage.setAccessToken(accessToken);
        webTokenStorage.setRefreshToken(refreshToken);
        const normalizedUser = normalizeUser(user);
        webTokenStorage.setUser(normalizedUser);
        set({ accessToken, refreshToken, user: normalizedUser });
    },
    setTokens: (accessToken: string, refreshToken: string) => {
        webTokenStorage.setAccessToken(accessToken);
        webTokenStorage.setRefreshToken(refreshToken);
        set({ accessToken, refreshToken });
    },
    setUser: (user: AuthUser | null) => {
        const normalizedUser = normalizeUser(user);
        if (normalizedUser) {
            webTokenStorage.setUser(normalizedUser);
        } else {
            webTokenStorage.removeUser();
        }
        set({ user: normalizedUser });
    },
    logout: async () => {
        try {
            await authService.logout();
        } catch {
            // ignore logout failures in demo flow
        }
        webTokenStorage.clearSession();
        set({ accessToken: null, refreshToken: null, user: null });
    },
    initialize: async () => {
        const accessToken = webTokenStorage.getAccessToken();
        const refreshToken = webTokenStorage.getRefreshToken();
        const storedUser = normalizeUser(webTokenStorage.getUser());

        set({ accessToken, refreshToken, user: storedUser || null, isLoading: true });

        if (accessToken) {
            try {
                const me = storedUser || normalizeUser(await authService.getCurrentUser());
                webTokenStorage.setUser(me);
                set({ user: me });
            } catch {
                webTokenStorage.clearSession();
                set({ accessToken: null, refreshToken: null, user: null });
                if (typeof window !== "undefined" && window.location.pathname !== "/login") {
                    window.location.href = "/login";
                }
            }
        }

        set({ isLoading: false });
    },
}));
