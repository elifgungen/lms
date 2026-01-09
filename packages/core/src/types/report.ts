import { ProctoringEvent } from "./proctoring";

export interface Report {
    id: string;
    examId?: string;
    attemptId?: string;
    generatedAt?: string;
    summary?: string;
    events?: ProctoringEvent[];
    data?: any;
}
