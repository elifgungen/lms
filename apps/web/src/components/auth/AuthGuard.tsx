"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/hooks/useAuth"

interface AuthGuardProps {
    children: React.ReactNode
    allowedRoles?: string[]
}

function getHomePathForRole(roles: string[]): string {
    if (roles.includes("super_admin") || roles.includes("admin")) return "/admin"
    if (roles.includes("instructor") || roles.includes("assistant")) return "/instructor"
    if (roles.includes("student")) return "/student"
    return "/guest"
}

export default function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
    const { accessToken, user, isLoading, initialize } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        initialize()
    }, [initialize])

    useEffect(() => {
        if (isLoading) return

        // If no token, redirect to login
        if (!accessToken) {
            if (pathname !== "/login") {
                router.push("/login")
            }
            return
        }

        // If we have a token but allowedRoles specified, check role access
        if (allowedRoles && user) {
            const hasAccess = user.roles?.some(role => allowedRoles.includes(role))
            if (!hasAccess) {
                // Redirect to home based on actual role
                const homePath = getHomePathForRole(user.roles || [])
                router.push(homePath)
            }
        }

        // If allowedRoles not specified (generic layout), normalize user to their home path
        if (!allowedRoles && user) {
            const homePath = getHomePathForRole(user.roles || [])
            if (pathname.startsWith("/app") || pathname === "/" || pathname === "/guest") {
                router.push(homePath)
            }
        }
    }, [accessToken, isLoading, router, pathname, allowedRoles, user])

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>
    }

    if (!accessToken) {
        return null // Will redirect
    }

    // If allowedRoles is specified, check access
    if (allowedRoles && user) {
        const hasAccess = user.roles?.some(role => allowedRoles.includes(role))
        if (!hasAccess) {
            return null // Will redirect
        }
    }

    return <>{children}</>
}
