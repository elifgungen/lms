import { AxiosInstance } from "axios";
import { QuestionBank } from "@lms/core";

const mapBank = (bank: any): QuestionBank => ({
    id: bank.id,
    title: bank.name || bank.title,
    description: bank.description,
    createdAt: bank.createdAt,
    questionCount: bank.questionCount || bank._count?.questions || 0,
    courseId: bank.courseId,
    tags: bank.tags
});

export const createQuestionBankService = (client: AxiosInstance) => ({
    getAll: async (): Promise<QuestionBank[]> => {
        const res = await client.get("/question-bank");
        return (res.data?.data || res.data || []).map(mapBank);
    },

    getById: async (id: string): Promise<QuestionBank | undefined> => {
        const res = await client.get(`/question-bank/${id}`);
        const payload = res.data?.data ?? res.data;
        return payload ? mapBank(payload) : undefined;
    },

    create: async (data: Partial<QuestionBank>): Promise<QuestionBank> => {
        const res = await client.post("/question-bank", {
            name: data.title || data.description || "Untitled Bank",
            courseId: (data as any)?.courseId
        });
        return mapBank(res.data?.data ?? res.data);
    }
});
