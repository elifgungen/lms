import { apiClient } from "@/lib/api/client";
import { createUsersService } from "@lms/api/services";

export type { User, StudentWithCourses, StudentResults, InstructorWithCourses } from "@lms/core";

export const usersService = createUsersService(apiClient);
