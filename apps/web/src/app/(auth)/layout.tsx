"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useTranslation } from "@/i18n/LanguageContext"

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [mounted, setMounted] = useState(false)
    const { locale, setLocale } = useTranslation()

    useEffect(() => {
        setMounted(true)
    }, [])

    const languages = [
        { code: "tr", label: "TR" },
        { code: "en", label: "EN" },
    ]

    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0b1224] via-[#1a1f3a] to-[#2d1b4e]" />

            {/* Animated gradient orbs */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
            <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "2s" }} />

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-8 py-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-cyan-400 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">📚</span>
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                        LMS WEB
                    </span>
                </Link>

                {/* Language Switcher */}
                {mounted && (
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-sm">
                            {languages.map((lang, index) => (
                                <span key={lang.code} className="flex items-center">
                                    <button
                                        onClick={() => setLocale(lang.code as "tr" | "en")}
                                        className={`px-2 py-1 rounded transition-colors ${locale === lang.code
                                                ? "text-cyan-400 font-semibold"
                                                : "text-gray-400 hover:text-white"
                                            }`}
                                    >
                                        {lang.label}
                                    </button>
                                    {index < languages.length - 1 && (
                                        <span className="text-gray-600">|</span>
                                    )}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex min-h-[calc(100vh-80px)] items-center justify-center p-4">
                {children}
            </main>
        </div>
    )
}
