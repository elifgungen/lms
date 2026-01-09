"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { apiClient } from "@/lib/api/client"

const formSchema = z.object({
    password: z.string().min(8, "Şifre en az 8 karakter olmalıdır"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Şifreler eşleşmiyor",
    path: ["confirmPassword"],
})

export default function ResetPasswordPage() {
    const searchParams = useSearchParams()
    const token = searchParams.get("token")

    const [isLoading, setIsLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState("")

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { password: "", confirmPassword: "" },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!token) {
            setError("Geçersiz sıfırlama bağlantısı")
            return
        }

        setIsLoading(true)
        setError("")

        try {
            await apiClient.post("/auth/reset-password", {
                token,
                password: values.password,
            })
            setSuccess(true)
        } catch (err: any) {
            setError(err?.response?.data?.error || "Şifre sıfırlama başarısız")
        } finally {
            setIsLoading(false)
        }
    }

    if (!token) {
        return (
            <div className="w-full max-w-md">
                <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Geçersiz Bağlantı</h1>
                    <p className="text-gray-400 mb-6">Bu şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.</p>
                    <Link
                        href="/forgot-password"
                        className="inline-block w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-cyan-400 text-gray-900 font-semibold rounded-lg hover:from-cyan-400 hover:to-cyan-300 transition-all"
                    >
                        Yeni Bağlantı İste
                    </Link>
                </div>
            </div>
        )
    }

    if (success) {
        return (
            <div className="w-full max-w-md">
                <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Şifre Sıfırlandı! ✓</h1>
                    <p className="text-gray-400 mb-6">Yeni şifrenizle giriş yapabilirsiniz.</p>
                    <Link
                        href="/login"
                        className="inline-block w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-cyan-400 text-gray-900 font-semibold rounded-lg hover:from-cyan-400 hover:to-cyan-300 transition-all"
                    >
                        Giriş Yap
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full max-w-md">
            <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 blur-xl -z-10" />

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Şifre Sıfırla</h1>
                    <p className="text-gray-400">Yeni şifrenizi belirleyin</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Yeni Şifre</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                            {...register("password")}
                        />
                        {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Şifre Tekrar</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                            {...register("confirmPassword")}
                        />
                        {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>}
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 px-4 rounded-lg">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-cyan-400 text-gray-900 font-semibold rounded-lg hover:from-cyan-400 hover:to-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isLoading ? "Sıfırlanıyor..." : "Şifreyi Sıfırla"}
                    </button>
                </form>
            </div>
        </div>
    )
}
