import { createApiClient } from "@lms/api";
import { webTokenStorage } from "@lms/auth/storage/web";
import { unauthorizedEvent } from "@lms/events";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Detect if running in Electron
const isElectron = typeof window !== "undefined" && !!(window as any).electronAPI?.isElectron;

if (process.env.NODE_ENV !== "production") {
    // Log once in dev to confirm absolute API base is set (helps demo-lock)
    // eslint-disable-next-line no-console
    console.debug("[apiClient] baseURL:", API_URL, isElectron ? "(Electron)" : "(Browser)");
}

export const apiClient = createApiClient({
    baseURL: API_URL,
    tokenStorage: webTokenStorage,
    refreshEndpoint: "/auth/refresh"
});

apiClient.interceptors.request.use((config) => {
    // Add desktop app header for SEB detection
    if (isElectron) {
        config.headers["X-LMS-Desktop"] = "true";
    }
    return config;
});

unauthorizedEvent.on(() => {
    if (typeof window === "undefined") return;
    const currentPath = window.location.pathname;

    // Don't auto-redirect on seb-exam pages - they handle auth themselves
    if (currentPath.startsWith("/seb-exam")) {
        return;
    }

    if (currentPath !== "/login") {
        window.location.href = "/login";
    }
});
