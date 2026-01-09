"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { apiClient } from "@/lib/api/client"

export default function VerifyEmailPage() {
    const searchParams = useSearchParams()
    const token = searchParams.get("token")

    const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
    const [message, setMessage] = useState("")

    useEffect(() => {
        async function verifyEmail() {
            if (!token) {
                setStatus("error")
                setMessage("Geçersiz doğrulama bağlantısı")
                return
            }

            try {
                const response = await apiClient.get(`/auth/verify-email/${token}`)
                setStatus("success")
                setMessage(response.data.message || "Email başarıyla doğrulandı!")
            } catch (err: any) {
                setStatus("error")
                setMessage(err?.response?.data?.error || "Doğrulama başarısız. Bağlantının süresi dolmuş olabilir.")
            }
        }

        verifyEmail()
    }, [token])

    return (
        <div className="w-full max-w-md">
            <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
                {status === "loading" && (
                    <>
                        <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-6" />
                        <h1 className="text-2xl font-bold text-white mb-2">Doğrulanıyor...</h1>
                        <p className="text-gray-400">Lütfen bekleyin</p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Email Doğrulandı! ✓</h1>
                        <p className="text-gray-400 mb-6">{message}</p>
                        <Link
                            href="/login"
                            className="inline-block w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-cyan-400 text-gray-900 font-semibold rounded-lg hover:from-cyan-400 hover:to-cyan-300 transition-all"
                        >
                            Giriş Yap
                        </Link>
                    </>
                )}

                {status === "error" && (
                    <>
                        <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Doğrulama Başarısız</h1>
                        <p className="text-gray-400 mb-6">{message}</p>
                        <Link
                            href="/login"
                            className="inline-block w-full py-3 px-4 bg-white/10 border border-white/20 text-white font-medium rounded-lg hover:bg-white/20 transition-all"
                        >
                            Giriş Sayfasına Dön
                        </Link>
                    </>
                )}
            </div>
        </div>
    )
}
