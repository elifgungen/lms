import { AxiosInstance } from "axios";
import { User, StudentWithCourses, StudentResults, InstructorWithCourses } from "@lms/core";

export const createUsersService = (client: AxiosInstance) => ({
    getAll: async (params?: { role?: string; search?: string }): Promise<User[]> => {
        const queryParams = new URLSearchParams();
        if (params?.role) queryParams.append("role", params.role);
        if (params?.search) queryParams.append("search", params.search);

        const query = queryParams.toString();
        const url = query ? `/users?${query}` : "/users";

        const res = await client.get(url);
        return res.data?.data ?? res.data ?? [];
    },

    getStudents: async (): Promise<StudentWithCourses[]> => {
        const res = await client.get("/users/students");
        return res.data?.data ?? res.data ?? [];
    },

    getStudentResults: async (id: string): Promise<StudentResults> => {
        const res = await client.get(`/users/${id}/results`);
        return res.data?.data ?? res.data;
    },

    getInstructors: async (): Promise<InstructorWithCourses[]> => {
        const res = await client.get("/users/instructors");
        return res.data?.data ?? res.data ?? [];
    },

    getById: async (id: string): Promise<User> => {
        const res = await client.get(`/users/${id}`);
        return res.data?.data ?? res.data;
    }
});
