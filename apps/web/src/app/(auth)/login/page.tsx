"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/hooks/useAuth"
import { authService, AuthUser } from "@/lib/services/auth"
import { useState, useEffect, FormEvent } from "react"
import { useTranslation } from "@/i18n/LanguageContext"

const formSchema = (t: (key: string) => string) => z.object({
    email: z.string().email({
        message: t("error_invalid_email") || "Please enter a valid email",
    }),
    password: z.string().min(1, {
        message: t("error_password_required") || "Password is required",
    }),
})

export default function LoginPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectTo = searchParams.get("redirect")
    const { login, accessToken, user, isLoading: authLoading, initialize, setTokens } = useAuth()
    const { t } = useTranslation()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [twoFactorToken, setTwoFactorToken] = useState("")
    const [twoFactorUser, setTwoFactorUser] = useState<AuthUser | null>(null)
    const [otpCode, setOtpCode] = useState("")

    useEffect(() => {
        initialize()
    }, [initialize])

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<z.infer<ReturnType<typeof formSchema>>>({
        resolver: zodResolver(formSchema(t as any)),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    const resolveRedirectByRole = (roles: string[]) => {
        if (roles.includes("super_admin") || roles.includes("admin")) return "/admin"
        if (roles.includes("instructor") || roles.includes("assistant")) return "/instructor"
        if (roles.includes("student")) return "/student"
        throw new Error("User has no role for redirect")
    }

    useEffect(() => {
        if (accessToken && user) {
            try {
                const targetUrl = redirectTo || resolveRedirectByRole(user.roles || [])
                router.push(targetUrl)
            } catch (err) {
                const message = (err as Error)?.message || t("message_invalid_credentials")
                setError(message)
            }
        }
    }, [accessToken, router, t, user])

    async function onSubmit(values: z.infer<ReturnType<typeof formSchema>>) {
        setIsLoading(true)
        setError("")
        setOtpCode("")

        try {
            const result = await authService.login(values)

            if ((result as any).twoFactorRequired) {
                const r = result as { twoFactorToken: string; user?: AuthUser }
                setTwoFactorToken(r.twoFactorToken)
                setTwoFactorUser(r.user || null)
                return
            }

            const success = result as { accessToken: string; refreshToken: string; user?: AuthUser }
            const currentUser = success.user || (await authService.getCurrentUser())

            setTokens(success.accessToken, success.refreshToken)
            login(success.accessToken, success.refreshToken, currentUser)

            const targetUrl = redirectTo || resolveRedirectByRole(currentUser.roles || [])
            router.push(targetUrl)
        } catch (err) {
            const message =
                (err as any)?.response?.data?.error ||
                (err as Error)?.message ||
                t("message_invalid_credentials")
            setError(message)
        } finally {
            setIsLoading(false)
        }
    }

    async function handleTwoFactorSubmit(event: FormEvent) {
        event.preventDefault()
        if (!twoFactorToken) return
        setIsLoading(true)
        setError("")

        try {
            const result = await authService.verifyTwoFactor({ token: twoFactorToken, code: otpCode })
            const currentUser = result.user || (await authService.getCurrentUser())

            setTokens(result.accessToken, result.refreshToken)
            login(result.accessToken, result.refreshToken, currentUser)

            const targetUrl = redirectTo || resolveRedirectByRole(currentUser.roles || [])
            router.push(targetUrl)
        } catch (err) {
            const message =
                (err as any)?.response?.data?.error ||
                (err as Error)?.message ||
                t("message_invalid_credentials")
            setError(message)
        } finally {
            setIsLoading(false)
        }
    }

    if (authLoading) {
        return (
            <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            </div>
        )
    }

    if (accessToken && !user) {
        return (
            <div className="flex items-center justify-center">
                <div className="text-cyan-400">{t("signing_in")}</div>
            </div>
        )
    }

    if (twoFactorToken) {
        return (
            <div className="w-full max-w-md">
                <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 blur-xl -z-10" />

                    <div className="text-center mb-6">
                        <h1 className="text-3xl font-bold text-white mb-2">2 Adımlı Doğrulama</h1>
                        <p className="text-gray-400">Authenticator uygulamasındaki 6 haneli kodu girin.</p>
                        {twoFactorUser?.email && (
                            <p className="text-gray-500 text-sm mt-2">{twoFactorUser.email}</p>
                        )}
                    </div>

                    <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="otp" className="block text-sm font-medium text-gray-300 mb-2">
                                Doğrulama Kodu
                            </label>
                            <input
                                id="otp"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="123456"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all tracking-widest text-center text-lg"
                            />
                        </div>

                        {error && (
                            <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 px-4 rounded-lg">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || otpCode.length < 4}
                            className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-cyan-400 text-gray-900 font-semibold rounded-lg hover:from-cyan-400 hover:to-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isLoading ? "Doğrulanıyor..." : "Giriş Yap"}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setTwoFactorToken("")
                                setOtpCode("")
                                setError("")
                            }}
                            className="w-full py-3 px-4 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/10 transition-all"
                        >
                            Geri Dön
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full max-w-md">
            {/* Card with glassmorphism effect */}
            <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 blur-xl -z-10" />

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">LMS Web</h1>
                    <p className="text-gray-400">Öğrenme Yönetim Sistemi</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                            Kullanıcı Adı
                        </label>
                        <input
                            id="email"
                            type="email"
                            placeholder="Kullanıcı Adınızı giriniz"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                            {...register("email")}
                        />
                        {errors.email && (
                            <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                            Şifre
                        </label>
                        <input
                            id="password"
                            type="password"
                            placeholder="Şifrenizi giriniz"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                            {...register("password")}
                        />
                        {errors.password && (
                            <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
                        )}
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 px-4 rounded-lg">
                            {error}
                        </p>
                    )}

                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-cyan-400 text-gray-900 font-semibold rounded-lg hover:from-cyan-400 hover:to-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
                                Giriş yapılıyor...
                            </span>
                        ) : (
                            "Giriş Yap"
                        )}
                    </button>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-transparent text-gray-500">veya</span>
                        </div>
                    </div>

                    {/* OAuth Buttons */}
                    <div className="space-y-3">
                        <button
                            type="button"
                            className="w-full py-3 px-4 bg-gradient-to-r from-red-500 to-orange-500 text-white font-medium rounded-lg hover:from-red-400 hover:to-orange-400 transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Google ile Giriş Yap
                        </button>

                        <button
                            type="button"
                            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium rounded-lg hover:from-blue-500 hover:to-blue-400 transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
                            </svg>
                            Microsoft ile Giriş Yap
                        </button>
                    </div>

                    {/* Links */}
                    <div className="flex justify-between items-center text-sm pt-4">
                        <Link
                            href="/forgot-password"
                            className="text-gray-400 hover:text-cyan-400 transition-colors"
                        >
                            Şifremi Unuttum
                        </Link>
                        <Link
                            href="/register"
                            className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                        >
                            Yeni Hesap Oluştur
                        </Link>
                    </div>

                    {/* Guest Link */}
                    <div className="text-center pt-2">
                        <Link
                            href="/guest"
                            className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
                        >
                            Misafir Girişi
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}
