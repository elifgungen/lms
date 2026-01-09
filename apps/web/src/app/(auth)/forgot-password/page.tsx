"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import { useState } from "react"
import { apiClient } from "@/lib/api/client"

const formSchema = z.object({
    email: z.string().email("Geçerli bir email adresi giriniz"),
})

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { email: "" },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            await apiClient.post("/auth/forgot-password", { email: values.email })
        } catch (err) {
            // Always show success to prevent email enumeration
        }
        setSuccess(true)
        setIsLoading(false)
    }

    if (success) {
        return (
            <div className="w-full max-w-md">
                <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">E-postanızı Kontrol Edin</h1>
                    <p className="text-gray-400 mb-6">
                        Eğer bu e-posta ile bir hesap varsa, şifre sıfırlama bağlantısı gönderdik.
                    </p>
                    <Link
                        href="/login"
                        className="inline-block w-full py-3 px-4 bg-white/10 border border-white/20 text-white font-medium rounded-lg hover:bg-white/20 transition-all"
                    >
                        Giriş Sayfasına Dön
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
                    <h1 className="text-3xl font-bold text-white mb-2">Şifremi Unuttum</h1>
                    <p className="text-gray-400">Şifre sıfırlama bağlantısı için e-posta adresinizi girin</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">E-posta</label>
                        <input
                            type="email"
                            placeholder="ornek@email.com"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                            {...register("email")}
                        />
                        {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-cyan-400 text-gray-900 font-semibold rounded-lg hover:from-cyan-400 hover:to-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isLoading ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
                    </button>

                    <Link
                        href="/login"
                        className="block text-center text-gray-400 hover:text-cyan-400 text-sm transition-colors"
                    >
                        ← Giriş sayfasına dön
                    </Link>
                </form>
            </div>
        </div>
    )
}
