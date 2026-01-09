// User types
export interface User {
    id: string;
    name: string;
    email: string;
    status: 'active' | 'disabled';
    roles: string[];
    emailVerified?: boolean;
    createdAt?: string;
}

export interface StudentWithCourses {
    id: string;
    name: string;
    email: string;
    status: string;
    courses: { id: string; title: string }[];
    enrollmentCount: number;
    pendingExams: number;
    pendingAssignments: number;
}

export interface StudentResults {
    student: {
        id: string;
        name?: string | null;
        email: string;
        status?: string | null;
    };
    courses: { id: string; title: string }[];
    attempts: Array<{
        id: string;
        examId?: string;
        status?: string | null;
        startedAt?: string;
        submittedAt?: string | null;
        grade?: { totalScore?: number | null };
        exam?: { id: string; title?: string | null; courseId?: string | null };
        courseTitle?: string | null;
    }>;
    submissions: Array<{
        id: string;
        assignmentId?: string;
        submittedAt?: string;
        score?: number | null;
        feedback?: string | null;
        assignment?: { id: string; title?: string | null; courseId?: string | null };
        courseTitle?: string | null;
    }>;
}

export interface InstructorWithCourses {
    id: string;
    name: string;
    email: string;
    status: string;
    roles: string[];
    coursesCount: number;
    courses: { id: string; title: string }[];
}

// Role type
export type UserRole = 'super_admin' | 'admin' | 'instructor' | 'assistant' | 'student' | 'guest';
