export interface ProctoringEvent {
    id?: string;
    type: string;
    timestamp: string;
    data?: any;
}

export interface ProctoringSession {
    id: string;
    examId: string;
    studentId: string;
    studentName?: string;
    status?: string;
    startedAt?: string;
    flagsCount?: number;
    events?: ProctoringEvent[];
    sebEnabled?: boolean;
    sebBrowserKey?: string;
    sebQuitPassword?: string;
    sebConfig?: {
        allowedUrls?: string[];
        blockedUrls?: string[];
    };
}
