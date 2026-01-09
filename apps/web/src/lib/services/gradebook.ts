import { apiClient } from "@/lib/api/client";
import { createGradebookService } from "@lms/api/services";

export type { Attempt } from "@lms/core";

export const gradebookService = createGradebookService(apiClient);
