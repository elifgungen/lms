import { AxiosInstance } from "axios";
import { LoginRequest, LoginResponse, LoginResult, AuthUser } from "@lms/core";

export const createAuthService = (client: AxiosInstance) => ({
    login: async (credentials: LoginRequest): Promise<LoginResult> => {
        const res = await client.post("/auth/login", credentials);
        return res.data;
    },
    getCurrentUser: async (): Promise<AuthUser> => {
        const res = await client.get("/me");
        return res.data.user;
    },
    logout: async () => {
        await client.post("/auth/logout");
    },
    verifyTwoFactor: async (payload: { token: string; code: string }) => {
        const res = await client.post("/auth/2fa/verify", payload);
        return res.data as LoginResponse & { user: AuthUser };
    },
    getTwoFactorStatus: async () => {
        const res = await client.get("/auth/2fa/status");
        return res.data as { enabled: boolean };
    },
    startTwoFactorSetup: async () => {
        const res = await client.post("/auth/2fa/setup");
        return res.data as { secret: string; otpauthUrl: string; qrDataUrl?: string };
    },
    enableTwoFactor: async (code: string) => {
        const res = await client.post("/auth/2fa/enable", { code });
        return res.data as { enabled: boolean };
    },
    disableTwoFactor: async (code: string) => {
        const res = await client.post("/auth/2fa/disable", { code });
        return res.data as { enabled: boolean };
    }
});
