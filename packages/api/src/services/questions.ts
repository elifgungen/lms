import { AxiosInstance } from "axios";
import { Question } from "@lms/core";

const mapQuestion = (question: any): Question => ({
    id: question.id,
    bankId: question.questionBankId ?? question.bankId,
    examId: question.examId,
    type: question.type,
    prompt: question.prompt,
    text: question.text,
    points: question.points,
    difficulty: question.difficulty,
    options: question.options,
    correctAnswer: question.answer ?? question.correctAnswer,
    answerIndex: question.answerIndex,
    createdAt: question.createdAt
});

export const createQuestionsService = (client: AxiosInstance) => ({
    getByBankId: async (bankId: string): Promise<Question[]> => {
        const res = await client.get("/questions");
        const questions: Question[] = (res.data?.data || res.data || []).map(mapQuestion);
        return questions.filter((q) => q.bankId === bankId);
    },

    create: async (data: Partial<Question>): Promise<Question> => {
        const res = await client.post("/questions", {
            prompt: data.prompt,
            type: data.type || "multiple_choice_single",
            options: { items: data.options },
            answer: { value: data.correctAnswer || (data as any)?.answer },
            questionBankId: data.bankId
        });
        return mapQuestion(res.data?.data ?? res.data);
    }
});
