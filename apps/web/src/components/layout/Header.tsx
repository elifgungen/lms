"use client"

import { useMemo, useState } from "react"
import { useTheme } from "next-themes"
import { useAuth } from "@/lib/hooks/useAuth"
import { useTranslation } from "@/i18n/LanguageContext"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Moon, Sun, LogOut, User, Settings, Bell, Search, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export function Header() {
    const { setTheme, theme } = useTheme()
    const { user, logout } = useAuth()
    const { locale, setLocale, t } = useTranslation()
    const router = useRouter()
    const [notifications, setNotifications] = useState(() => [
        { id: "n1", title: "Yeni sınav atandı", description: "Yapay Zeka Final Sınavı için 3 gün kaldı", read: false },
        { id: "n2", title: "Ödev notlandı", description: "Veri Mühendisliği ödevin notlandı", read: false },
        { id: "n3", title: "Duyuru", description: "Canlı ders bağlantısı güncellendi", read: true },
    ])

    const unreadCount = useMemo(
        () => notifications.filter((n) => !n.read).length,
        [notifications],
    )

    const handleLogout = async () => {
        await logout()
        router.push("/login")
    }

    const getInitials = (name?: string) => {
        if (!name) return "U"
        return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    }

    const markAllRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    }

    const handleNotificationClick = (id: string) => {
        setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
    }

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-black/5 dark:border-white/10 bg-[rgba(255,255,255,0.75)] dark:bg-[#0d1526]/80 backdrop-blur-xl px-6 text-[#0a0a0f] dark:text-white">
            {/* Search Bar */}
            <div className="flex-1 max-w-xl">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder={t('search_placeholder') || "Ders ara..."}
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-all text-sm"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Notifications */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="relative text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl"
                        >
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-4 px-1 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white">
                                    {unreadCount}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        className="w-80 bg-white dark:bg-[#1a1f3a] border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-200"
                    >
                        <DropdownMenuLabel className="flex items-center justify-between">
                            <span>{t('notifications') || "Bildirimler"}</span>
                            <button onClick={markAllRead} className="text-xs text-cyan-600 dark:text-cyan-300 hover:text-cyan-500 dark:hover:text-cyan-200">
                                {t('mark_all_read') || "Hepsini okundu yap"}
                            </button>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-gray-200 dark:bg-white/10" />
                        {notifications.length === 0 && (
                            <DropdownMenuItem className="text-gray-500 dark:text-gray-400 cursor-default">
                                {t('no_notifications') || "Bildirim yok"}
                            </DropdownMenuItem>
                        )}
                        {notifications.map((notif) => (
                            <DropdownMenuItem
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif.id)}
                                className="flex items-start gap-2 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10"
                            >
                                <div className="mt-0.5">
                                    {notif.read ? (
                                        <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
                                    ) : (
                                        <span className="h-2 w-2 rounded-full bg-red-500 dark:bg-red-400 inline-block" />
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{notif.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{notif.description}</p>
                                </div>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Language Switcher */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl px-3"
                        >
                            {locale.toUpperCase()}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        className="bg-white dark:bg-[#1a1f3a] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300"
                    >
                        <DropdownMenuItem
                            onClick={() => setLocale("en")}
                            className="hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer"
                        >
                            🇬🇧 English
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setLocale("tr")}
                            className="hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer"
                        >
                            🇹🇷 Türkçe
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Theme Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl"
                >
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">{t('theme_toggle')}</span>
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl px-3"
                        >
                            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-cyan-400 rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-purple-500/20">
                                {getInitials(user?.name)}
                            </div>
                            <div className="hidden md:block text-left">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name || "Kullanıcı"}</p>
                                <p className="text-xs text-gray-500">{user?.email}</p>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        className="w-56 bg-white dark:bg-[#1a1f3a] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300"
                    >
                        <DropdownMenuLabel className="text-gray-900 dark:text-white">Hesabım</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-gray-200 dark:bg-white/10" />
                        <DropdownMenuItem className="hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            Profil
                        </DropdownMenuItem>
                        <DropdownMenuItem className="hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            Ayarlar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-gray-200 dark:bg-white/10" />
                        <DropdownMenuItem
                            onClick={handleLogout}
                            className="hover:bg-red-500/20 text-red-600 dark:text-red-400 cursor-pointer"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>{t('logout') || 'Çıkış Yap'}</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}
