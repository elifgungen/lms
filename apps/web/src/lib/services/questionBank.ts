import { QuestionBank, mockQuestionBanks } from "@/lib/mockData";

const STORAGE_KEY = "mock_question_banks";

const getBanks = (): QuestionBank[] => {
    if (typeof window === "undefined") return mockQuestionBanks;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockQuestionBanks));
        return mockQuestionBanks;
    }
    return JSON.parse(stored);
};

const saveBanks = (banks: QuestionBank[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(banks));
};

export const questionBankService = {
    getAll: async (): Promise<QuestionBank[]> => {
        return new Promise((resolve) => {
            setTimeout(() => resolve(getBanks()), 600);
        });
    },

    getById: async (id: string): Promise<QuestionBank | undefined> => {
        return new Promise((resolve) => {
            setTimeout(() => resolve(getBanks().find(b => b.id === id)), 400);
        });
    },

    create: async (data: Partial<QuestionBank>): Promise<QuestionBank> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const newBank = {
                    ...data,
                    id: Math.random().toString(36).substr(2, 9),
                    createdAt: new Date().toISOString(),
                    questionCount: 0
                } as QuestionBank;

                const current = getBanks();
                const updated = [newBank, ...current];
                saveBanks(updated);

                resolve(newBank);
            }, 800);
        });
    }
};
