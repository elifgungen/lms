import { apiClient } from "@/lib/api/client";
import { createQuestionBankService } from "@lms/api/services";

export type { QuestionBank } from "@lms/core";

export const questionBankService = createQuestionBankService(apiClient);
