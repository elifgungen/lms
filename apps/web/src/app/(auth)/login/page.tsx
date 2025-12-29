"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/useAuth"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { useTranslation } from "@/i18n/LanguageContext"

const formSchema = (t: (key: string) => string) => z.object({
    email: z.string().email({
        message: t("error_invalid_email"),
    }),
    password: z.string().min(1, {
        message: t("error_password_required"),
    }),
})

export default function LoginPage() {
    const router = useRouter()
    const { login, token, isLoading: authLoading, initialize } = useAuth()
    const { t } = useTranslation()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    // Initialize auth on mount
    useEffect(() => {
        initialize()
    }, [initialize])

    // Redirect if already logged in
    useEffect(() => {
        if (!authLoading && token) {
            router.push("/app")
        }
    }, [token, authLoading, router])

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<z.infer<ReturnType<typeof formSchema>>>({
        resolver: zodResolver(formSchema(t)),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    async function onSubmit(values: z.infer<ReturnType<typeof formSchema>>) {
        setIsLoading(true)
        setError("")

        try {
            // Mock login call
            // In a real app we'd call apiClient.post('/auth/login', values)
            await new Promise((resolve) => setTimeout(resolve, 1000))

            const mockUser = {
                id: "1",
                name: "Admin User",
                email: values.email,
                role: "admin" as const,
            }

            login("mock-token-123", mockUser)
            router.push("/app")
        } catch (err) {
            setError(t('message_invalid_credentials'))
        } finally {
            setIsLoading(false)
        }
    }

    // Show loading while checking auth
    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div>Loading...</div>
            </div>
        )
    }

    // Don't render login form if already authenticated (redirect will happen)
    if (token) {
        return null
    }

    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle className="text-2xl">{t('login')}</CardTitle>
                <CardDescription>
                    {t('login_description')}
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email">{t('email')}</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder={t('email_placeholder')}
                            aria-invalid={!!errors.email}
                            aria-describedby={errors.email ? "email-error" : undefined}
                            {...register("email")}
                        />
                        {errors.email && (
                            <p id="email-error" className="text-xs text-destructive">{errors.email.message}</p>
                        )}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">{t('password')}</Label>
                        <Input
                            id="password"
                            type="password"
                            aria-invalid={!!errors.password}
                            aria-describedby={errors.password ? "password-error" : undefined}
                            {...register("password")}
                        />
                        {errors.password && (
                            <p id="password-error" className="text-xs text-destructive">{errors.password.message}</p>
                        )}
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                </CardContent>
                <CardFooter>
                    <Button className="w-full" type="submit" disabled={isLoading}>
                        {isLoading ? t('signing_in') : t('sign_in')}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
