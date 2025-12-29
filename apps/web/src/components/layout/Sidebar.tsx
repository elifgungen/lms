"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    BookOpen,
    GraduationCap,
    LayoutDashboard,
    Library,
    Settings,
    FileText,
    BarChart,
} from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname()
    const { t } = useTranslation()

    const sidebarItems = [
        {
            title: t('dashboard'),
            href: "/app",
            icon: LayoutDashboard,
        },
        {
            title: t('courses'),
            href: "/app/courses",
            icon: BookOpen,
        },
        {
            title: t('exams'),
            href: "/app/exams",
            icon: GraduationCap,
        },
        {
            title: t('question_bank'),
            href: "/app/question-bank",
            icon: Library,
        },
        {
            title: t('gradebook'),
            href: "/app/gradebook",
            icon: FileText,
        },
        {
            title: t('reports'),
            href: "/app/reports",
            icon: BarChart,
        },
        {
            title: t('settings'),
            href: "/app/settings",
            icon: Settings,
        },
    ]

    return (
        <div className={cn("pb-12 min-h-screen border-r bg-background", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        Admin Panel
                    </h2>
                    <div className="space-y-1">
                        {sidebarItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                                    pathname.startsWith(item.href)
                                        ? "bg-accent text-accent-foreground"
                                        : "transparent"
                                )}
                            >
                                <item.icon className="mr-2 h-4 w-4" />
                                {item.title}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
