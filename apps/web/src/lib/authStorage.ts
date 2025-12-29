export const authStorage = {
    getToken: () => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('accessToken');
    },
    setToken: (token: string) => {
        if (typeof window === 'undefined') return;
        localStorage.setItem('accessToken', token);
    },
    removeToken: () => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem('accessToken');
    },
    getUser: () => {
        if (typeof window === 'undefined') return null;
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },
    setUser: (user: any) => {
        if (typeof window === 'undefined') return;
        localStorage.setItem('user', JSON.stringify(user));
    },
    removeUser: () => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem('user');
    }
};
