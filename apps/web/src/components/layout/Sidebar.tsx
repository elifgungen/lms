"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import {
    BookOpen,
    GraduationCap,
    LayoutDashboard,
    Library,
    Settings,
    FileText,
    BarChart,
    Users,
    ClipboardList,
    Eye,
    Video,
    ScanLine,
} from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"
import { useAuth } from "@/lib/hooks/useAuth"

interface SidebarItem {
    title: string
    href: string
    icon: React.ComponentType<{ className?: string }>
}

function getBasePath(roles: string[]): string {
    if (roles.includes("super_admin") || roles.includes("admin")) return "/admin"
    if (roles.includes("instructor") || roles.includes("assistant")) return "/instructor"
    if (roles.includes("student")) return "/student"
    return "/guest"
}

function getPanelTitle(roles: string[], t: (key: string) => string): string {
    if (roles.includes("super_admin") || roles.includes("admin")) return "Admin Panel"
    if (roles.includes("instructor") || roles.includes("assistant")) return t('instructor_panel') || "Eğitmen Paneli"
    if (roles.includes("student")) return t('student_portal') || "Öğrenci Portalı"
    return t('guest_portal') || "Misafir Portalı"
}

function getSidebarItems(t: (key: string) => string, roles: string[], basePath: string): SidebarItem[] {
    const isAdmin = roles.includes("super_admin") || roles.includes("admin")
    const isInstructor = roles.includes("instructor") || roles.includes("assistant")
    const isStudent = roles.includes("student")

    const items: SidebarItem[] = [
        {
            title: t('dashboard') || 'Panel',
            href: basePath,
            icon: LayoutDashboard,
        },
        {
            title: t('courses') || 'Dersler',
            href: `${basePath}/courses`,
            icon: BookOpen,
        },
        {
            title: t('exams') || 'Sınavlar',
            href: `${basePath}/exams`,
            icon: GraduationCap,
        },
    ]

    // Assignments for admin/instructor/student
    if (isAdmin || isInstructor || isStudent) {
        items.push({
            title: t('assignments') || 'Ödevler',
            href: `${basePath}/assignments`,
            icon: ClipboardList,
        })
    }

    // Live Classes
    items.push({
        title: t('live_classes') || 'Canlı Dersler',
        href: `${basePath}/live-classes`,
        icon: Video,
    })

    // Question bank only for admin/instructor
    if (isAdmin || isInstructor) {
        items.push({
            title: t('question_bank') || 'Soru Bankası',
            href: `${basePath}/question-bank`,
            icon: Library,
        })
    }

    // Gradebook for everyone
    items.push({
        title: t('gradebook') || 'Not Defteri',
        href: `${basePath}/gradebook`,
        icon: FileText,
    })

    // Reports only for admin/instructor
    if (isAdmin || isInstructor) {
        items.push({
            title: t('reports') || 'Raporlar',
            href: `${basePath}/reports`,
            icon: BarChart,
        })
        items.push({
            title: t('proctoring') || 'Gözetleme',
            href: `${basePath}/proctoring`,
            icon: Eye,
        })
        items.push({
            title: t('scanner') || 'Optik Okuyucu',
            href: `${basePath}/scanner`,
            icon: ScanLine,
        })
    }

    // User management only for admin
    if (isAdmin) {
        items.push({
            title: t('users') || 'Kullanıcılar',
            href: `${basePath}/users`,
            icon: Users,
        })
    }

    // Instructor roster view
    if (isInstructor && !isAdmin) {
        items.push({
            title: t('students') || 'Öğrenciler',
            href: `${basePath}/students`,
            icon: Users,
        })
    }

    // Settings for everyone
    items.push({
        title: t('settings') || 'Ayarlar',
        href: `${basePath}/settings`,
        icon: Settings,
    })

    return items
}

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname()
    const { t } = useTranslation()
    const { user } = useAuth()
    const { theme } = useTheme()
    const roles = user?.roles || []
    const basePath = getBasePath(roles)
    const panelTitle = getPanelTitle(roles, t as any)
    const sidebarItems = getSidebarItems(t as any, roles, basePath)

    const isDark = theme === 'dark'

    return (
        <div
            className={cn("min-h-screen border-r", className)}
            style={{
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'
            }}
        >
            <div className="space-y-4 py-4">
                {/* Logo Section */}
                <div className="px-6 py-4">
                    <Link href={basePath} className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <span className="text-white font-bold text-lg">📚</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-cyan-600 dark:from-purple-400 dark:to-cyan-400 bg-clip-text text-transparent">
                                LMS Web
                            </h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{panelTitle}</p>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <div className="px-3">
                    <div className="space-y-1">
                        {sidebarItems.map((item) => {
                            const isActive = pathname === item.href ||
                                (item.href !== basePath && pathname.startsWith(item.href))

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                                        isActive
                                            ? "bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30"
                                            : "text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                                    )}
                                >
                                    <item.icon className={cn(
                                        "h-5 w-5 transition-colors",
                                        isActive ? "text-cyan-600 dark:text-cyan-400" : "text-gray-500 dark:text-gray-500"
                                    )} />
                                    {item.title}
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
