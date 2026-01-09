import { AxiosInstance } from "axios";
import { Assignment, Submission } from "@lms/core";

const mapAssignment = (assignment: any): Assignment => ({
    id: assignment.id,
    courseId: assignment.courseId,
    title: assignment.title,
    description: assignment.description,
    dueDate: assignment.dueDate,
    allowedFileTypes: assignment.allowedFileTypes,
    maxFileSizeMb: assignment.maxFileSizeMb,
    createdById: assignment.createdById,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
    course: assignment.course,
    _count: assignment._count
});

const mapSubmission = (submission: any): Submission => ({
    id: submission.id,
    assignmentId: submission.assignmentId,
    studentId: submission.studentId,
    filePath: submission.filePath,
    fileName: submission.fileName,
    fileSize: submission.fileSize,
    submittedAt: submission.submittedAt,
    score: submission.score,
    feedback: submission.feedback,
    gradedAt: submission.gradedAt,
    gradedById: submission.gradedById,
    student: submission.student,
    assignment: submission.assignment
});

export const createAssignmentsService = (client: AxiosInstance) => ({
    getAll: async (courseId?: string): Promise<Assignment[]> => {
        const params = courseId ? `?courseId=${courseId}` : "";
        const res = await client.get(`/assignments${params}`);
        return (res.data?.data || res.data || []).map(mapAssignment);
    },

    getById: async (id: string): Promise<Assignment | undefined> => {
        const res = await client.get(`/assignments/${id}`);
        const payload = res.data?.data ?? res.data;
        return payload ? mapAssignment(payload) : undefined;
    },

    create: async (data: Partial<Assignment>): Promise<Assignment> => {
        const res = await client.post("/assignments", {
            courseId: data.courseId,
            title: data.title,
            description: data.description,
            dueDate: data.dueDate,
            allowedFileTypes: data.allowedFileTypes,
            maxFileSizeMb: data.maxFileSizeMb
        });
        return mapAssignment(res.data?.data ?? res.data);
    },

    update: async (id: string, data: Partial<Assignment>): Promise<Assignment> => {
        const res = await client.put(`/assignments/${id}`, {
            courseId: data.courseId,
            title: data.title,
            description: data.description,
            dueDate: data.dueDate,
            allowedFileTypes: data.allowedFileTypes,
            maxFileSizeMb: data.maxFileSizeMb
        });
        return mapAssignment(res.data?.data ?? res.data);
    },

    delete: async (id: string): Promise<void> => {
        await client.delete(`/assignments/${id}`);
    },

    getSubmissions: async (assignmentId: string): Promise<Submission[]> => {
        const res = await client.get(`/assignments/${assignmentId}/submissions`);
        return (res.data?.data || res.data || []).map(mapSubmission);
    },

    getMySubmission: async (assignmentId: string): Promise<Submission | null> => {
        const res = await client.get(`/assignments/${assignmentId}/my-submission`);
        return (res.data?.data ?? res.data) || null;
    },

    submitFile: async (assignmentId: string, file: Blob): Promise<Submission> => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await client.post(`/assignments/${assignmentId}/submit`, formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });
        return mapSubmission(res.data?.data ?? res.data);
    },

    gradeSubmission: async (submissionId: string, score: number, feedback?: string): Promise<Submission> => {
        const res = await client.put(`/assignments/submissions/${submissionId}/grade`, {
            score,
            feedback
        });
        return mapSubmission(res.data?.data ?? res.data);
    },

    getDownloadUrl: (submissionId: string, baseUrl?: string): string => {
        const resolvedBase = baseUrl || client.defaults.baseURL || (typeof window !== "undefined" ? window.location.origin : "");
        return `${resolvedBase}/assignments/submissions/${submissionId}/download`;
    }
});
