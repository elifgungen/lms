import { Course, mockCourses } from "@/lib/mockData";

const STORAGE_KEY = "mock_courses";

const getCourses = (): Course[] => {
    if (typeof window === "undefined") return mockCourses;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockCourses));
        return mockCourses;
    }
    return JSON.parse(stored);
};

const saveCourses = (courses: Course[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
};

export const coursesService = {
    getAll: async (): Promise<Course[]> => {
        return new Promise((resolve) => {
            setTimeout(() => resolve(getCourses()), 800);
        });
    },

    getById: async (id: string): Promise<Course | undefined> => {
        return new Promise((resolve) => {
            setTimeout(() => resolve(getCourses().find(c => c.id === id)), 500);
        });
    },

    create: async (data: Partial<Course>): Promise<Course> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const newCourse = {
                    ...data,
                    id: Math.random().toString(36).substr(2, 9),
                    createdAt: new Date().toISOString(),
                    status: data.status || 'draft'
                } as Course;

                const currentCourses = getCourses();
                const updatedCourses = [newCourse, ...currentCourses];
                saveCourses(updatedCourses);

                resolve(newCourse);
            }, 1000);
        });
    }
};
