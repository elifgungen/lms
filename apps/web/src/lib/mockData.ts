export interface Course {
    id: string;
    title: string;
    status?: 'published' | 'draft' | 'archived';
    createdAt: string;
    description?: string;
}

export const mockCourses: Course[] = [
    { id: '1', title: 'Introduction to React', status: 'published', createdAt: '2023-10-01T10:00:00Z', description: 'Learn React basics' },
    { id: '2', title: 'Advanced TypeScript', status: 'published', createdAt: '2023-10-05T14:30:00Z', description: 'Deep dive into TS' },
    { id: '3', title: 'Node.js Essentials', status: 'draft', createdAt: '2023-10-10T09:15:00Z', description: 'Server-side JS' },
    { id: '4', title: 'Database Design', status: 'archived', createdAt: '2023-09-01T11:20:00Z', description: 'SQL and NoSQL' },
    { id: '5', title: 'UX/UI Principles', status: 'published', createdAt: '2023-11-01T10:00:00Z' },
    { id: '6', title: 'DevOps 101', status: 'draft', createdAt: '2023-12-01T10:00:00Z' },
];

export interface Module {
    id: string;
    title: string;
    order: number;
}

export const mockModules: Module[] = [
    { id: 'm1', title: 'Getting Started', order: 0 },
    { id: 'm2', title: 'Core Concepts', order: 1 },
    { id: 'm3', title: 'Advanced Topics', order: 2 },
];

// Sprint 2 Data

export interface QuestionBank {
    id: string;
    title: string;
    description?: string;
    createdAt: string;
    questionCount: number;
}

export const mockQuestionBanks: QuestionBank[] = [
    { id: 'qb1', title: 'React Basics Bank', description: 'Pool of basic React questions', createdAt: '2023-11-01T10:00:00Z', questionCount: 15 },
    { id: 'qb2', title: 'TS Types Bank', description: 'Advanced type challenges', createdAt: '2023-11-05T14:00:00Z', questionCount: 20 },
    { id: 'qb3', title: 'General CS Knowledge', createdAt: '2023-11-10T09:00:00Z', questionCount: 50 },
];

export type QuestionType = 'multiple_choice_single' | 'multiple_choice_multi' | 'true_false' | 'fill_blank' | 'matching' | 'ordering';

export interface Question {
    id: string;
    bankId?: string;
    type: QuestionType;
    prompt?: string;
    points?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    tags?: string[];
    // Type specific fields (simplified)
    options?: { id: string, text: string }[];
    correctAnswer?: string | string[]; // ID(s) or text
    pairs?: { left: string, right: string }[];
    order?: string[];
    blanks?: string[];
}

export const mockQuestions: Question[] = [
    {
        id: 'q1', bankId: 'qb1', type: 'multiple_choice_single', pormpt: 'What is a hook in React?', points: 5, difficulty: 'easy',
        options: [
            { id: 'o1', text: 'A fishing tool' },
            { id: 'o2', text: 'A special function to use state/lifecycle' },
            { id: 'o3', text: 'A class component' }
        ],
        correctAnswer: 'o2'
    } as any, // Cast to avoid strict union check for quick mock
    {
        id: 'q2', bankId: 'qb1', type: 'true_false', prompt: 'React is a library, not a framework.', points: 2, difficulty: 'easy',
        correctAnswer: 'true'
    }
];

export interface Exam {
    id: string;
    title: string;
    description?: string;
    durationMinutes?: number;
    courseId?: string;
    questionBankIds?: string[];
    status?: 'draft' | 'published' | 'archived';
    createdAt?: string;
}

export const mockExams: Exam[] = [
    { id: 'e1', title: 'React Midterm', description: 'Covers modules 1-3', durationMinutes: 60, courseId: '1', questionBankIds: ['qb1'], status: 'published', createdAt: '2023-12-01T09:00:00Z' },
    { id: 'e2', title: 'TS Certification', durationMinutes: 90, courseId: '2', questionBankIds: ['qb2'], status: 'draft', createdAt: '2023-12-10T14:00:00Z' }
];

export interface Attempt {
    id: string;
    examId: string;
    studentId: string;
    studentName?: string;
    score?: number;
    totalPoints?: number;
    status?: 'in-progress' | 'submitted' | 'graded';
    startedAt?: string;
    submittedAt?: string;
}

export const mockAttempts: Attempt[] = [
    { id: 'a1', examId: 'e1', studentId: 's1', studentName: 'John Doe', score: 45, totalPoints: 50, status: 'submitted', startedAt: '2023-12-05T10:00:00Z', submittedAt: '2023-12-05T10:55:00Z' },
    { id: 'a2', examId: 'e1', studentId: 's2', studentName: 'Jane Smith', score: 0, totalPoints: 50, status: 'in-progress', startedAt: '2023-12-05T10:10:00Z' },
    { id: 'a3', examId: 'e2', studentId: 's1', studentName: 'John Doe', score: 80, totalPoints: 100, status: 'graded', startedAt: '2023-12-15T10:00:00Z', submittedAt: '2023-12-15T11:20:00Z' },
];

export interface ProctoringEvent {
    id: string;
    type: 'tab_switch' | 'face_missing' | 'multiple_faces' | 'noise_detected';
    timestamp: string;
    severity: 'low' | 'medium' | 'high';
}

export interface ProctoringSession {
    id: string;
    examId: string; // Linking to exam for simplicity
    studentId: string;
    studentName?: string;
    status?: 'active' | 'completed' | 'flagged';
    startedAt?: string;
    flagsCount?: number;
    events?: ProctoringEvent[];
}

export const mockProctoringSessions: ProctoringSession[] = [
    {
        id: 'ps1', examId: 'e1', studentId: 's1', studentName: 'John Doe', status: 'completed', startedAt: '2023-12-05T10:00:00Z', flagsCount: 2,
        events: [
            { id: 'ev1', type: 'tab_switch', timestamp: '2023-12-05T10:15:00Z', severity: 'low' },
            { id: 'ev2', type: 'face_missing', timestamp: '2023-12-05T10:40:00Z', severity: 'medium' }
        ]
    },
    {
        id: 'ps2', examId: 'e1', studentId: 's3', studentName: 'Bob Brown', status: 'flagged', startedAt: '2023-12-05T10:00:00Z', flagsCount: 15,
        events: []
    }
];
