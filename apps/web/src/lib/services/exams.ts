import { apiClient } from "@/lib/api/client";
import { createExamsService } from "@lms/api/services";

export type { Exam } from "@lms/core";

export const examsService = createExamsService(apiClient);
