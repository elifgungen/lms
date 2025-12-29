import { Attempt, mockAttempts } from "@/lib/mockData";

const STORAGE_KEY = "mock_attempts";

const getAttempts = (): Attempt[] => {
    if (typeof window === "undefined") return mockAttempts;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockAttempts));
        return mockAttempts;
    }
    return JSON.parse(stored);
};

export const gradebookService = {
    getAll: async (): Promise<Attempt[]> => {
        return new Promise((resolve) => {
            setTimeout(() => resolve(getAttempts()), 600);
        });
    },

    getById: async (id: string): Promise<Attempt | undefined> => {
        return new Promise((resolve) => {
            setTimeout(() => resolve(getAttempts().find(a => a.id === id)), 400);
        });
    }
};
