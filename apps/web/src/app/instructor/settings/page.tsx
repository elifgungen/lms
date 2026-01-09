"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { useTranslation } from "@/i18n/LanguageContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Moon, Sun, Globe, ShieldCheck, ShieldOff, KeyRound, QrCode } from "lucide-react"
import { authService } from "@/lib/services/auth"
import { useAuth } from "@/lib/hooks/useAuth"

export default function SettingsPage() {
    const { setTheme, theme } = useTheme()
    const { locale, setLocale, t } = useTranslation()
    const { user, setUser } = useAuth()
    const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(user?.twoFactorEnabled ?? false)
    const [twoFactorSetup, setTwoFactorSetup] = useState<{ secret: string; otpauthUrl: string; qrDataUrl?: string } | null>(null)
    const [twoFactorCode, setTwoFactorCode] = useState("")
    const [twoFactorMessage, setTwoFactorMessage] = useState("")
    const [twoFactorError, setTwoFactorError] = useState("")
    const [twoFactorLoading, setTwoFactorLoading] = useState(false)

    useEffect(() => {
        const loadStatus = async () => {
            try {
                const res = await authService.getTwoFactorStatus()
                setTwoFactorEnabled(res.enabled)
            } catch (err) {
                console.error("Failed to load 2FA status", err)
            }
        }
        loadStatus()
    }, [])

    useEffect(() => {
        setTwoFactorEnabled(user?.twoFactorEnabled ?? false)
    }, [user])

    const refreshUserTwoFactor = (enabled: boolean) => {
        if (user) {
            setUser({ ...user, twoFactorEnabled: enabled })
        }
    }

    const startTwoFactorSetup = async () => {
        setTwoFactorLoading(true)
        setTwoFactorError("")
        setTwoFactorMessage("")
        try {
            const setup = await authService.startTwoFactorSetup()
            setTwoFactorSetup(setup)
            setTwoFactorMessage("Authenticator uygulaması ile QR kodu tara ve kodu girerek etkinleştir.")
        } catch (err: any) {
            setTwoFactorError(err?.response?.data?.error || "2FA başlatılamadı")
        } finally {
            setTwoFactorLoading(false)
        }
    }

    const enableTwoFactor = async () => {
        if (!twoFactorCode) return
        setTwoFactorLoading(true)
        setTwoFactorError("")
        try {
            await authService.enableTwoFactor(twoFactorCode)
            setTwoFactorEnabled(true)
            setTwoFactorSetup(null)
            setTwoFactorCode("")
            setTwoFactorMessage("İki faktörlü doğrulama aktif.")
            refreshUserTwoFactor(true)
        } catch (err: any) {
            setTwoFactorError(err?.response?.data?.error || "Kod doğrulanamadı")
        } finally {
            setTwoFactorLoading(false)
        }
    }

    const disableTwoFactor = async () => {
        if (!twoFactorCode) return
        setTwoFactorLoading(true)
        setTwoFactorError("")
        try {
            await authService.disableTwoFactor(twoFactorCode)
            setTwoFactorEnabled(false)
            setTwoFactorSetup(null)
            setTwoFactorCode("")
            setTwoFactorMessage("İki faktörlü doğrulama kapatıldı.")
            refreshUserTwoFactor(false)
        } catch (err: any) {
            setTwoFactorError(err?.response?.data?.error || "Kod doğrulanamadı")
        } finally {
            setTwoFactorLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t('settings')}</h1>
                <p className="text-muted-foreground">Uygulama tercihlerinizi yönetin.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {twoFactorEnabled ? (
                                <ShieldCheck className="h-4 w-4 text-green-400" />
                            ) : (
                                <ShieldOff className="h-4 w-4 text-yellow-400" />
                            )}
                            İki Faktörlü Doğrulama
                            <Badge variant={twoFactorEnabled ? "outline" : "secondary"} className="ml-2">
                                {twoFactorEnabled ? "Aktif" : "Kapalı"}
                            </Badge>
                        </CardTitle>
                        <CardDescription>
                            Authenticator uygulaması ile TOTP kodu kullanarak hesabına ek güvenlik katmanı ekle.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {twoFactorEnabled ? (
                            <>
                                <p className="text-sm text-gray-400">
                                    2FA&apos;yı kapatmak için güncel doğrulama kodunu girin.
                                </p>
                                <div className="space-y-2">
                                    <Label htmlFor="disable-2fa">Doğrulama kodu</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="disable-2fa"
                                            placeholder="123456"
                                            value={twoFactorCode}
                                            onChange={(e) => setTwoFactorCode(e.target.value)}
                                            className="bg-white/5 border-white/10 text-white"
                                        />
                                        <Button
                                            variant="destructive"
                                            onClick={disableTwoFactor}
                                            disabled={twoFactorLoading || !twoFactorCode}
                                        >
                                            {twoFactorLoading ? "İşleniyor..." : "Devre Dışı Bırak"}
                                        </Button>
                                    </div>
                                </div>
                            </>
                        ) : twoFactorSetup ? (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-400">
                                    QR kodu Authenticator uygulamasında tara veya gizli anahtarı elle gir.
                                </p>
                                <div className="flex flex-col md:flex-row gap-4 items-center">
                                    {twoFactorSetup.qrDataUrl && (
                                        <img
                                            src={twoFactorSetup.qrDataUrl}
                                            alt="2FA QR"
                                            className="w-40 h-40 border border-white/10 rounded-xl"
                                        />
                                    )}
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <QrCode className="h-4 w-4" />
                                            <span>Gizli Anahtar</span>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm">
                                            {twoFactorSetup.secret}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="enable-2fa">Uygulamadaki kod</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="enable-2fa"
                                            placeholder="123456"
                                            value={twoFactorCode}
                                            onChange={(e) => setTwoFactorCode(e.target.value)}
                                            className="bg-white/5 border-white/10 text-white"
                                        />
                                        <Button onClick={enableTwoFactor} disabled={twoFactorLoading || !twoFactorCode}>
                                            {twoFactorLoading ? "Doğrulanıyor..." : "Etkinleştir"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm text-gray-300">Google Authenticator, 1Password, Authy gibi TOTP uygulamalarıyla uyumlu.</p>
                                    <p className="text-xs text-gray-500">Kurulum birkaç saniye sürer.</p>
                                </div>
                                <Button onClick={startTwoFactorSetup} disabled={twoFactorLoading}>
                                    <KeyRound className="h-4 w-4 mr-2" />
                                    {twoFactorLoading ? "Hazırlanıyor..." : "Kurulumu Başlat"}
                                </Button>
                            </div>
                        )}

                        {twoFactorMessage && (
                            <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                                {twoFactorMessage}
                            </div>
                        )}
                        {twoFactorError && (
                            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                {twoFactorError}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sun className="h-4 w-4" />
                            Tema
                        </CardTitle>
                        <CardDescription>
                            Aydınlık veya karanlık mod arasında geçiş yapın.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2">
                            <Button
                                variant={theme === "light" ? "default" : "outline"}
                                onClick={() => setTheme("light")}
                                className="flex-1"
                            >
                                <Sun className="mr-2 h-4 w-4" />
                                Aydınlık
                            </Button>
                            <Button
                                variant={theme === "dark" ? "default" : "outline"}
                                onClick={() => setTheme("dark")}
                                className="flex-1"
                            >
                                <Moon className="mr-2 h-4 w-4" />
                                Karanlık
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Dil
                        </CardTitle>
                        <CardDescription>
                            Arayüz dilini seçin.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2">
                            <Button
                                variant={locale === "tr" ? "default" : "outline"}
                                onClick={() => setLocale("tr")}
                                className="flex-1"
                            >
                                🇹🇷 Türkçe
                            </Button>
                            <Button
                                variant={locale === "en" ? "default" : "outline"}
                                onClick={() => setLocale("en")}
                                className="flex-1"
                            >
                                🇬🇧 English
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
