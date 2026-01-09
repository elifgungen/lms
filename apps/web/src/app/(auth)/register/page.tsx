"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import { useState } from "react"
import { useTranslation } from "@/i18n/LanguageContext"
import { apiClient } from "@/lib/api/client"
import { GraduationCap, BookOpen } from "lucide-react"

const formSchema = z.object({
    name: z.string().min(2, "Ad en az 2 karakter olmalıdır"),
    email: z.string().email("Geçerli bir email adresi giriniz"),
    password: z.string().min(8, "Şifre en az 8 karakter olmalıdır"),
    confirmPassword: z.string(),
    role: z.enum(["student", "instructor"]),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Şifreler eşleşmiyor",
    path: ["confirmPassword"],
})

interface Course {
    id: string
    title: string
    description?: string
}

const roleOptions = [
    {
        value: "student",
        label: "Öğrenci",
        description: "Derslere katıl, sınavlara gir",
        icon: GraduationCap,
        color: "from-cyan-500 to-blue-500"
    },
    {
        value: "instructor",
        label: "Eğitmen",
        description: "Ders oluştur, sınav hazırla",
        icon: BookOpen,
        color: "from-purple-500 to-pink-500"
    },
]

export default function RegisterPage() {
    const { t } = useTranslation()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
            role: "student",
        },
    })

    const selectedRole = watch("role")

    async function submitRegistration(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        setError("")

        try {
            await apiClient.post("/auth/register", {
                email: values.email,
                password: values.password,
                name: values.name,
                role: values.role
            })

            setSuccess(true)
        } catch (err: any) {
            const message = err?.response?.data?.error || err?.message || "Kayıt başarısız"
            setError(message)
        } finally {
            setIsLoading(false)
        }
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
                    <h1 className="text-2xl font-bold text-white mb-2">Kayıt Başarılı! 🎉</h1>
                    <p className="text-gray-400 mb-6">
                        E-posta adresinize doğrulama bağlantısı gönderdik. Hesabınızı aktifleştirmek için e-postanızı kontrol edin.
                    </p>
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

                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-white mb-2">Hesap Oluştur</h1>
                    <p className="text-gray-400">LMS sistemine kayıt olun</p>
                </div>

                <form onSubmit={handleSubmit(submitRegistration)} className="space-y-5">
                    {/* Role Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">Hesap Türü</label>
                        <div className="grid grid-cols-2 gap-3">
                            {roleOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setValue("role", option.value as "student" | "instructor")}
                                    className={`relative p-4 rounded-xl border-2 transition-all ${selectedRole === option.value
                                        ? `border-cyan-500 bg-gradient-to-br ${option.color} bg-opacity-20`
                                        : "border-white/10 bg-white/5 hover:border-white/30"
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${option.color} flex items-center justify-center mx-auto mb-2`}>
                                        <option.icon className="h-5 w-5 text-white" />
                                    </div>
                                    <p className="text-white font-medium text-sm">{option.label}</p>
                                    <p className="text-gray-500 text-xs mt-1">{option.description}</p>
                                    {selectedRole === option.value && (
                                        <div className="absolute top-2 right-2 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                        <input type="hidden" {...register("role")} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Ad Soyad</label>
                        <input
                            type="text"
                            placeholder="Adınız Soyadınız"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                            {...register("name")}
                        />
                        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                    </div>

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

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Şifre</label>
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
                        className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-400 hover:to-pink-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                İşleniyor...
                            </span>
                        ) : "Kayıt Ol"}
                    </button>

                    <p className="text-center text-gray-400 text-sm pt-4">
                        Zaten hesabınız var mı?{" "}
                        <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">
                            Giriş Yap
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    )
}
