import { apiClient } from "@/lib/api/client";
import { createAssignmentsService } from "@lms/api/services";

export type { Assignment, Submission } from "@lms/core";

export const assignmentsService = createAssignmentsService(apiClient);
