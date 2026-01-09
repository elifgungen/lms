import { apiClient } from "@/lib/api/client";
import { createAuthService } from "@lms/api/services";

export type { LoginRequest, LoginResponse, LoginResult, AuthUser } from "@lms/core";

export const authService = createAuthService(apiClient);
