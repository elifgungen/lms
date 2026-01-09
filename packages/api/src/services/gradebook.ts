import { AxiosInstance } from "axios";
import { Attempt } from "@lms/core";

const mapAttempt = (attempt: any): Attempt => ({
    id: attempt.id,
    examId: attempt.examId,
    studentId: attempt.userId,
    studentName: attempt.user?.name || attempt.user?.email,
    score: attempt.grade?.totalScore ?? attempt.score,
    totalPoints: attempt.grade?.totalScore ?? attempt.totalPoints,
    status: attempt.status || "in-progress",
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    grade: attempt.grade,
    courseTitle: attempt.courseTitle
});

export const createGradebookService = (client: AxiosInstance) => ({
    getAll: async (): Promise<Attempt[]> => {
        const res = await client.get("/attempts");
        return (res.data?.data || res.data || []).map(mapAttempt);
    },

    getById: async (id: string): Promise<Attempt | undefined> => {
        const res = await client.get(`/attempts/${id}/report`);
        const payload = res.data?.data ?? res.data;
        return payload ? mapAttempt(payload) : undefined;
    }
});
