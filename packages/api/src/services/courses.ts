import { AxiosInstance } from "axios";
import { Course } from "@lms/core";

const mapCourse = (course: any): Course => ({
    id: course.id,
    title: course.title,
    description: course.description,
    status: course.status,
    createdAt: course.createdAt,
    instructor: course.instructor,
    instructorId: course.instructorId,
    videoUrl: course.videoUrl,
    pdfUrl: course.pdfUrl,
    progress: course.progress,
    downloadable: course.downloadable
});

export const createCoursesService = (client: AxiosInstance) => ({
    getAll: async (): Promise<Course[]> => {
        const res = await client.get("/courses");
        return (res.data?.data || res.data || []).map(mapCourse);
    },
    getMine: async (): Promise<Course[]> => {
        const res = await client.get("/courses/my");
        return (res.data?.data || res.data || []).map(mapCourse);
    },
    getById: async (id: string): Promise<Course | undefined> => {
        const res = await client.get(`/courses/${id}`);
        const payload = res.data?.data ?? res.data;
        return payload ? mapCourse(payload) : undefined;
    },
    create: async (data: Partial<Course>): Promise<Course> => {
        const res = await client.post("/courses", {
            title: data.title,
            description: data.description
        });
        return mapCourse(res.data?.data ?? res.data);
    },
    enroll: async (id: string): Promise<Course> => {
        const res = await client.post(`/courses/${id}/enroll`);
        const payload = res.data?.data ?? res.data;
        const course = payload?.course || payload;
        return mapCourse(course);
    },
    getRoster: async (id: string) => {
        const res = await client.get(`/courses/${id}/roster`);
        return res.data?.data ?? res.data ?? [];
    }
});
