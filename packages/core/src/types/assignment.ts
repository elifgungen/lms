export interface Assignment {
    id: string;
    courseId: string;
    title: string;
    description?: string;
    dueDate?: string;
    allowedFileTypes?: string;
    maxFileSizeMb?: number;
    createdById?: string;
    createdAt: string;
    updatedAt: string;
    course?: { id: string; title: string };
    _count?: { submissions: number };
}

export interface Submission {
    id: string;
    assignmentId: string;
    studentId: string;
    filePath: string;
    fileName: string;
    fileSize?: number;
    submittedAt: string;
    score?: number;
    feedback?: string;
    gradedAt?: string;
    gradedById?: string;
    student?: { id: string; name: string; email: string };
    assignment?: Assignment;
}
