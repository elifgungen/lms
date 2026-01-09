export interface AttemptGrade {
    totalScore?: number | null;
    [key: string]: unknown;
}

export interface Attempt {
    id: string;
    examId: string;
    studentId: string;
    studentName?: string;
    score?: number;
    totalPoints?: number;
    status?: string;
    startedAt?: string;
    submittedAt?: string | null;
    answers?: Record<string, any>;
    grade?: AttemptGrade;
    courseTitle?: string | null;
}

export interface AttemptResult {
    score: number;
    total: number;
}
