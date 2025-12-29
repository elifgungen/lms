import { ProctoringSession, mockProctoringSessions } from "@/lib/mockData";

const STORAGE_KEY = "mock_reports";

const getSessions = (): ProctoringSession[] => {
    if (typeof window === "undefined") return mockProctoringSessions;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockProctoringSessions));
        return mockProctoringSessions;
    }
    return JSON.parse(stored);
};

export const reportsService = {
    getAll: async (): Promise<ProctoringSession[]> => {
        return new Promise((resolve) => {
            setTimeout(() => resolve(getSessions()), 600);
        });
    },

    getById: async (id: string): Promise<ProctoringSession | undefined> => {
        return new Promise((resolve) => {
            setTimeout(() => resolve(getSessions().find(s => s.id === id)), 400);
        });
    }
};
