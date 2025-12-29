import { create } from 'zustand'
import { authStorage } from '@/lib/authStorage'

interface User {
    id: string
    name: string
    email: string
    role: 'admin' | 'instructor' | 'student'
}

interface AuthState {
    user: User | null
    token: string | null
    isLoading: boolean
    login: (token: string, user: User) => void
    logout: () => void
    initialize: () => void
}

export const useAuth = create<AuthState>((set) => ({
    user: null,
    token: null,
    isLoading: true,
    login: (token: string, user: User) => {
        authStorage.setToken(token)
        authStorage.setUser(user)
        set({ token, user })
    },
    logout: () => {
        authStorage.removeToken()
        authStorage.removeUser()
        set({ token: null, user: null })
    },
    initialize: () => {
        const token = authStorage.getToken()
        const user = authStorage.getUser()
        set({ token, user, isLoading: false })
    }
}))
