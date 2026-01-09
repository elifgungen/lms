// Auth types
export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthUser {
    id: string;
    email: string;
    name?: string | null;
    roles: string[];
    twoFactorEnabled?: boolean;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    user?: AuthUser;
}

export type LoginResult =
    | { twoFactorRequired: true; twoFactorToken: string; user?: AuthUser }
    | { accessToken: string; refreshToken: string; user: AuthUser };

export interface TwoFactorVerifyRequest {
    token: string;
    code: string;
}

export interface TwoFactorSetupResponse {
    secret: string;
    otpauthUrl: string;
    qrDataUrl?: string;
}
