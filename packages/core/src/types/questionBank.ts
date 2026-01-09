export interface QuestionOption {
    id?: string;
    text?: string;
    value?: unknown;
    isCorrect?: boolean;
}

export interface Question {
    id: string;
    bankId?: string;
    examId?: string;
    type: string;
    prompt?: string;
    text?: string;
    points?: number;
    difficulty?: string;
    options?: QuestionOption[] | string[] | Record<string, unknown>;
    correctAnswer?: any;
    answerIndex?: number;
    createdAt?: string;
}

export interface QuestionBank {
    id: string;
    title: string;
    description?: string;
    createdAt?: string;
    questionCount?: number;
    courseId?: string;
    tags?: string[];
}
