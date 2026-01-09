import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Resolve API URL with env + Expo extras for simulator or device use
const deriveApiUrlFromHost = () => {
    const expoConfig = Constants.expoConfig as any;
    const hostUri =
        expoConfig?.hostUri ||
        expoConfig?.debuggerHost ||
        expoConfig?.extra?.expoGo?.debuggerHost;

    if (!hostUri) return null;

    const host = String(hostUri).split(':')[0];

    if (host === 'localhost' || host === '127.0.0.1') {
        return Platform.OS === 'android'
            ? 'http://10.0.2.2:4000' // Android emulator -> host machine
            : 'http://127.0.0.1:4000'; // iOS simulator shares host network
    }

    return `http://${host}:4000`; // LAN IP derived from Expo host
};

const getApiUrl = (): string => {
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    const extraUrl = (Constants.expoConfig?.extra as any)?.apiUrl;
    // Fallback to specific LAN IP for physical device testing
    return envUrl || extraUrl || deriveApiUrlFromHost() || 'http://10.122.248.59:4000';
};

export const API_URL = getApiUrl();

export const API_ENDPOINTS = {
    // Auth
    login: '/auth/login',
    register: '/auth/register',
    me: '/auth/me',
    logout: '/auth/logout',

    // Courses
    courses: '/courses',
    courseById: (id: string) => `/courses/${id}`,
    enrollments: '/enrollments',

    // Exams
    exams: '/exams',
    examById: (id: string) => `/exams/${id}`,
    examAttempts: (examId: string) => `/exams/${examId}/attempts`,
    submitAttempt: (attemptId: string) => `/attempts/${attemptId}/submit`,

    // Content
    content: '/content',
    contentById: (id: string) => `/content/${id}`,
};
