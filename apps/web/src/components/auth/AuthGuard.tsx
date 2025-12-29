"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/hooks/useAuth"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { token, isLoading, initialize } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        initialize()
    }, [initialize])

    useEffect(() => {
        if (!isLoading && !token && pathname !== "/login") {
            router.push("/login")
        }
    }, [token, isLoading, router, pathname])

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>
    }

    if (!token) {
        return null; // Will redirect
    }

    return <>{children}</>
}
