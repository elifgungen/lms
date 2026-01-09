import { apiClient } from "@/lib/api/client";
import { createReportsService } from "@lms/api/services";

export type { ProctoringSession } from "@lms/core";

export const reportsService = createReportsService(apiClient);
