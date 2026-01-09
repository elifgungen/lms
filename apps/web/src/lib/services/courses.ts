import { apiClient } from "@/lib/api/client";
import { createCoursesService } from "@lms/api/services";

export type { Course } from "@lms/core";

export const coursesService = createCoursesService(apiClient);
