import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { TokenStorage } from "@lms/auth";
import { unauthorizedEvent, tokenRefreshedEvent } from "@lms/events";

export interface ApiClientConfig {
    baseURL: string;
    tokenStorage: TokenStorage;
    refreshEndpoint?: string;
}

export function createApiClient(config: ApiClientConfig): AxiosInstance {
    const client = axios.create({
        baseURL: config.baseURL,
        headers: { "Content-Type": "application/json" }
    });

    client.interceptors.request.use(async (req) => {
        const token = await Promise.resolve(config.tokenStorage.getAccessToken());
        if (token) req.headers.Authorization = `Bearer ${token}`;
        return req;
    });

    let isRefreshing = false;
    let pending: Array<(token: string | null) => void> = [];

    const runPending = (token: string | null) => {
        pending.forEach((cb) => cb(token));
        pending = [];
    };

    client.interceptors.response.use(
        (res) => res,
        async (error) => {
            const status = error?.response?.status;
            const original: AxiosRequestConfig & { _retry?: boolean } = error.config || {};

            if (status !== 401) return Promise.reject(error);

            // no refresh flow configured
            if (!config.refreshEndpoint) {
                await Promise.resolve(config.tokenStorage.clearSession());
                unauthorizedEvent.emit();
                return Promise.reject(error);
            }

            if (original._retry) {
                await Promise.resolve(config.tokenStorage.clearSession());
                unauthorizedEvent.emit();
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    pending.push((token) => {
                        if (!token) return reject(error);
                        original.headers = { ...(original.headers || {}), Authorization: `Bearer ${token}` };
                        resolve(client(original));
                    });
                });
            }

            isRefreshing = true;
            original._retry = true;

            try {
                const refreshToken = await Promise.resolve(config.tokenStorage.getRefreshToken());
                if (!refreshToken) throw new Error("No refresh token");

                const refreshRes = await client.post(config.refreshEndpoint, { refreshToken });
                const newAccessToken = refreshRes.data?.accessToken as string | undefined;
                const newRefreshToken = refreshRes.data?.refreshToken as string | undefined;

                if (!newAccessToken) throw new Error("Refresh failed");

                await Promise.resolve(config.tokenStorage.setAccessToken(newAccessToken));
                if (newRefreshToken) await Promise.resolve(config.tokenStorage.setRefreshToken(newRefreshToken));

                tokenRefreshedEvent.emit(newAccessToken);
                runPending(newAccessToken);
                original.headers = { ...(original.headers || {}), Authorization: `Bearer ${newAccessToken}` };
                return client(original);
            } catch (err) {
                runPending(null);
                await Promise.resolve(config.tokenStorage.clearSession());
                unauthorizedEvent.emit();
                return Promise.reject(error);
            } finally {
                isRefreshing = false;
            }
        }
    );

    return client;
}
