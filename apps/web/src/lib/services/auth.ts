import { apiClient } from "@/lib/api/client";

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
    };
}

export const authService = {
    login: async (credentials: LoginRequest): Promise<AuthResponse> => {
        // Mock implementation
        // return apiClient.post('/auth/login', credentials);

        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    token: "mock-jwt-token",
                    user: {
                        id: "1",
                        email: credentials.email,
                        name: "Admin User",
                        role: "admin"
                    }
                });
            }, 1000);
        });
    },

    logout: async () => {
        // return apiClient.post('/auth/logout');
        return Promise.resolve();
    }
};
