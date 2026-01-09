import { AxiosInstance } from "axios";
import { ProctoringSession } from "@lms/core";

const mapSession = (attempt: any): ProctoringSession => ({
    id: attempt.proctoringSession?.id || attempt.id,
    examId: attempt.examId,
    studentId: attempt.userId,
    studentName: attempt.user?.name || attempt.user?.email || "Student",
    status: attempt.proctoringSession?.status || attempt.status || "active",
    startedAt: attempt.proctoringSession?.startedAt || attempt.startedAt,
    flagsCount: attempt.proctoringSession?.events?.length || 0,
    events: attempt.proctoringSession?.events || []
});

export const createReportsService = (client: AxiosInstance) => ({
    getAll: async (): Promise<ProctoringSession[]> => {
        const res = await client.get("/attempts");
        return (res.data?.data || res.data || []).map(mapSession);
    },

    getById: async (id: string): Promise<ProctoringSession | undefined> => {
        const res = await client.get(`/attempts/${id}/report`);
        const payload = res.data?.data ?? res.data;
        return payload ? mapSession(payload) : undefined;
    }
});
