// Course types
export interface Course {
    id: string;
    title: string;
    description?: string;
    status?: 'published' | 'draft' | 'archived';
    createdAt?: string;
    instructor?: string;
    instructorId?: string;
    videoUrl?: string;
    pdfUrl?: string;
    progress?: number;
    downloadable?: boolean;
}

export interface CourseWithDetails extends Course {
    enrollmentCount?: number;
    contentCount?: number;
    modules?: CourseModule[];
}

export interface CourseModule {
    id: string;
    title: string;
    order: number;
    contents?: CourseContent[];
}

export interface CourseContent {
    id: string;
    title: string;
    type: 'video' | 'pdf' | 'document' | 'quiz';
    url?: string;
    order: number;
}
