import { apiClient } from "@/lib/api/client";
import { createQuestionsService } from "@lms/api/services";

export type { Question } from "@lms/core";

export const questionsService = createQuestionsService(apiClient);
