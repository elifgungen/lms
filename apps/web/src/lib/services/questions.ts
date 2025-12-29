import { Question, mockQuestions } from "@/lib/mockData";

const STORAGE_KEY = "mock_questions";

const getQuestions = (): Question[] => {
    if (typeof window === "undefined") return mockQuestions;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockQuestions));
        return mockQuestions;
    }
    return JSON.parse(stored);
};

const saveQuestions = (questions: Question[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
};

export const questionsService = {
    getByBankId: async (bankId: string): Promise<Question[]> => {
        return new Promise((resolve) => {
            setTimeout(() => resolve(getQuestions().filter(q => q.bankId === bankId)), 600);
        });
    },

    create: async (data: Partial<Question>): Promise<Question> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const newQuestion = {
                    ...data,
                    id: Math.random().toString(36).substr(2, 9),
                } as Question;

                const current = getQuestions();
                const updated = [...current, newQuestion];
                saveQuestions(updated);

                resolve(newQuestion);
            }, 800);
        });
    }
};
