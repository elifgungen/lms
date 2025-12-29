import { Exam, mockExams } from "@/lib/mockData";

const STORAGE_KEY = "mock_exams";

const getExams = (): Exam[] => {
    if (typeof window === "undefined") return mockExams;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockExams));
        return mockExams;
    }
    return JSON.parse(stored);
};

const saveExams = (exams: Exam[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(exams));
};

export const examsService = {
    getAll: async (): Promise<Exam[]> => {
        return new Promise((resolve) => {
            setTimeout(() => resolve(getExams()), 600);
        });
    },

    getById: async (id: string): Promise<Exam | undefined> => {
        return new Promise((resolve) => {
            setTimeout(() => resolve(getExams().find(e => e.id === id)), 400);
        });
    },

    create: async (data: Partial<Exam>): Promise<Exam> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const newExam = {
                    ...data,
                    id: Math.random().toString(36).substr(2, 9),
                    createdAt: new Date().toISOString(),
                    status: data.status || 'draft'
                } as Exam;

                const current = getExams();
                const updated = [newExam, ...current];
                saveExams(updated);

                resolve(newExam);
            }, 800);
        });
    },

    update: async (id: string, data: Partial<Exam>): Promise<Exam> => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const current = getExams();
                const index = current.findIndex(e => e.id === id);
                if (index === -1) {
                    reject(new Error("Exam not found"));
                    return;
                }
                const updatedExam = { ...current[index], ...data };
                current[index] = updatedExam;
                saveExams(current);
                resolve(updatedExam);
            }, 600);
        });
    }
};
