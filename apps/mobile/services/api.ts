import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Network from "expo-network";
import { createApiClient } from "@lms/api";
import {
  createAuthService,
  createCoursesService,
  createExamsService,
  createUsersService,
} from "@lms/api/services";
import { mobileTokenStorage } from "@lms/auth/storage/mobile";
import { AttemptResult, AuthUser, Course, Exam } from "@lms/core";
import { API_ENDPOINTS, API_URL } from "./config";

type Fetcher<T> = () => Promise<T>;

export const apiClient = createApiClient({
  baseURL: API_URL,
  tokenStorage: mobileTokenStorage,
  refreshEndpoint: "/auth/refresh",
});

export const authService = createAuthService(apiClient);
export const coursesService = createCoursesService(apiClient);
export const examsService = createExamsService(apiClient);
export const usersService = createUsersService(apiClient);

// Auth
export async function login(
  email: string,
  password: string,
): Promise<{ token: string; user: AuthUser } | null> {
  try {
    console.log('[Mobile Login] Attempting login for:', email);
    console.log('[Mobile Login] API URL:', API_URL);

    const result = await authService.login({ email, password });
    console.log('[Mobile Login] Response received:', JSON.stringify(result, null, 2));

    if ("twoFactorRequired" in result) {
      console.log('[Mobile Login] 2FA required');
      return null;
    }

    await mobileTokenStorage.setAccessToken(result.accessToken);
    await mobileTokenStorage.setRefreshToken(result.refreshToken);
    if (result.user) {
      await mobileTokenStorage.setUser(result.user);
    }
    console.log('[Mobile Login] Login successful, tokens stored');
    return { token: result.accessToken, user: result.user };
  } catch (error: any) {
    console.warn('[Mobile Login] Error:', error?.message || error);
    console.warn('[Mobile Login] Error details:', JSON.stringify(error?.response?.data || error, null, 2));
    throw error;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const user = await authService.getCurrentUser();
    if (user) {
      await mobileTokenStorage.setUser(user);
    }
    return user;
  } catch {
    return null;
  }
}

// Courses
export const getCourses = (): Promise<Course[]> => coursesService.getAll();

export const getCourseById = (id: string): Promise<Course | undefined> =>
  coursesService.getById(id);

// Exams
export const getExams = (): Promise<Exam[]> => examsService.getAll();

export const getExamById = (id: string): Promise<Exam | undefined> =>
  examsService.getById(id);

export const getExamQuestions = (id: string) =>
  examsService.getQuestions(id);

export type OmrAnswer = { question: number; answer?: string; status?: string; confidence?: number; correctAnswer?: string };
export type OmrProcessResult = {
  success: boolean;
  answers: OmrAnswer[];
  corners?: { x: number; y: number }[];
  previewImage?: string | null;
  errors?: string[];
  score?: { correct: number; wrong: number; empty: number; total: number; percentage: number };
};

export async function processOmrImage(
  fileUri: string,
  examId?: string,
  anchors?: Record<string, { x: number; y: number }>,
): Promise<OmrProcessResult> {
  const form = new FormData();
  form.append("image", {
    uri: fileUri,
    name: "capture.jpg",
    type: "image/jpeg",
  } as any);
  if (examId) form.append("examId", examId);
  if (anchors) form.append("anchors", JSON.stringify(anchors));

  const res = await apiClient.post("/omr/process", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data?.data ?? res.data;
}

export type OmrPreviewResult = {
  warpedImage?: string | null;
  anchors?: Record<string, { x: number; y: number } | [number, number]>;
  pageSize?: [number, number] | { width: number; height: number } | null;
};

export async function previewOmrImage(
  fileUri: string,
  examId?: string,
): Promise<OmrPreviewResult> {
  const form = new FormData();
  form.append("image", {
    uri: fileUri,
    name: "capture.jpg",
    type: "image/jpeg",
  } as any);
  if (examId) form.append("examId", examId);

  const res = await apiClient.post("/omr/preview", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data?.data ?? res.data;
}

export async function submitExamAttempt(
  attemptId: string,
  answers: Record<string, number>,
): Promise<AttemptResult> {
  const res = await apiClient.post(API_ENDPOINTS.submitAttempt(attemptId), {
    answers,
  });
  return res.data;
}

// Fetch with offline caching support
export async function fetchWithCache<T>(key: string, fetcher: Fetcher<T>) {
  const state = await Network.getNetworkStateAsync();
  const offline = !state.isConnected || !state.isInternetReachable;

  if (offline) {
    const cached = await AsyncStorage.getItem(key);
    return cached
      ? { data: JSON.parse(cached) as T, fromCache: true }
      : { data: null, fromCache: true };
  }

  try {
    const data = await fetcher();
    await AsyncStorage.setItem(key, JSON.stringify(data));
    return { data, fromCache: false };
  } catch (error) {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      return { data: JSON.parse(cached) as T, fromCache: true };
    }
    throw error;
  }
}

export type { AuthUser as User } from "@lms/core";
export type { Course, Exam } from "@lms/core";
