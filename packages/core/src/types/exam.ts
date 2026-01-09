// Exam types
export interface Exam {
    id: string;
    title: string;
    description?: string;
    durationMinutes?: number;
    courseId?: string;
    questionBankIds?: string[];
    questions?: Question[];
    status?: 'draft' | 'published' | 'archived';
    createdAt?: string;
    // SEB fields
    sebEnabled?: boolean;
    sebBrowserKey?: string;
    sebQuitPassword?: string;
    sebConfig?: {
        allowedUrls?: string[];
        blockedUrls?: string[];
    };
}
import { Question } from "./questionBank";
