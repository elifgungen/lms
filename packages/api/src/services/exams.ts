import { AxiosInstance } from "axios";
import { Exam, Question } from "@lms/core";

const mapExam = (exam: any): Exam => ({
    id: exam.id,
    title: exam.title,
    description: exam.description,
    durationMinutes: exam.durationMinutes,
    courseId: exam.courseId,
    questionBankIds: exam.questionBanks?.map((qb: any) => qb.id) || exam.questionBankIds || [],
    questions: exam.questions,
    status: exam.status,
    createdAt: exam.createdAt,
    sebEnabled: exam.sebEnabled || false,
    sebBrowserKey: exam.sebBrowserKey,
    sebQuitPassword: exam.sebQuitPassword,
    sebConfig: exam.sebConfig
});

const mapQuestion = (q: any): Question => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    text: q.prompt || q.text,
    points: q.points,
    difficulty: q.difficulty,
    options: q.options?.items || q.options,
    correctAnswer: q.answer?.value,
    createdAt: q.createdAt
});

export const createExamsService = (client: AxiosInstance) => ({
    getAll: async (): Promise<Exam[]> => {
        const res = await client.get("/exams");
        return (res.data?.data || res.data || []).map(mapExam);
    },
    getById: async (id: string): Promise<Exam | undefined> => {
        const res = await client.get(`/exams/${id}`);
        const payload = res.data?.data ?? res.data;
        return payload ? mapExam(payload) : undefined;
    },
    getQuestions: async (id: string): Promise<Question[]> => {
        const res = await client.get(`/exams/${id}/questions`);
        return (res.data?.data || res.data || []).map(mapQuestion);
    },
    create: async (data: Partial<Exam> & { sebConfig?: any }): Promise<Exam> => {
        const res = await client.post("/exams", {
            title: data.title,
            description: data.description,
            durationMinutes: data.durationMinutes,
            courseId: data.courseId,
            sebEnabled: data.sebEnabled,
            sebQuitPassword: data.sebQuitPassword,
            sebConfig: data.sebConfig
        });
        return mapExam(res.data?.data ?? res.data);
    },
    update: async (id: string, data: Partial<Exam> & { sebConfig?: any }): Promise<Exam> => {
        const res = await client.put(`/exams/${id}`, {
            title: data.title,
            description: data.description,
            durationMinutes: data.durationMinutes,
            courseId: data.courseId,
            sebEnabled: data.sebEnabled,
            sebQuitPassword: data.sebQuitPassword,
            sebConfig: data.sebConfig
        });
        return mapExam(res.data?.data ?? res.data);
    }
});

