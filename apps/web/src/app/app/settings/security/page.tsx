"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Shield, ShieldCheck, ShieldOff, QrCode, Key, Loader2 } from "lucide-react"

export default function SecuritySettingsPage() {
    const [loading, setLoading] = useState(true)
    const [enabled, setEnabled] = useState(false)
    const [setupMode, setSetupMode] = useState(false)
    const [qrCode, setQrCode] = useState("")
    const [secret, setSecret] = useState("")
    const [verifyCode, setVerifyCode] = useState("")
    const [disableCode, setDisableCode] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [processing, setProcessing] = useState(false)

    useEffect(() => {
        fetchStatus()
    }, [])

    const fetchStatus = async () => {
        try {
            const response = await apiClient.get("/2fa/status")
            setEnabled(response.data?.enabled || false)
        } catch (err) {
            console.error("Failed to fetch 2FA status", err)
        } finally {
            setLoading(false)
        }
    }

    const startSetup = async () => {
        setProcessing(true)
        setError("")
        try {
            const response = await apiClient.post("/2fa/setup")
            setQrCode(response.data?.qrCode || "")
            setSecret(response.data?.secret || "")
            setSetupMode(true)
        } catch (err: any) {
            setError(err?.response?.data?.error || "Setup failed")
        } finally {
            setProcessing(false)
        }
    }

    const enableTwoFactor = async () => {
        if (!verifyCode || verifyCode.length !== 6) {
            setError("Please enter a 6-digit code")
            return
        }
        setProcessing(true)
        setError("")
        try {
            await apiClient.post("/2fa/enable", { code: verifyCode })
            setEnabled(true)
            setSetupMode(false)
            setQrCode("")
            setSecret("")
            setVerifyCode("")
            setSuccess("Two-factor authentication enabled successfully!")
            setTimeout(() => setSuccess(""), 3000)
        } catch (err: any) {
            setError(err?.response?.data?.error || "Invalid code")
        } finally {
            setProcessing(false)
        }
    }

    const disableTwoFactor = async () => {
        if (!disableCode || disableCode.length !== 6) {
            setError("Please enter a 6-digit code")
            return
        }
        setProcessing(true)
        setError("")
        try {
            await apiClient.post("/2fa/disable", { code: disableCode })
            setEnabled(false)
            setDisableCode("")
            setSuccess("Two-factor authentication disabled")
            setTimeout(() => setSuccess(""), 3000)
        } catch (err: any) {
            setError(err?.response?.data?.error || "Invalid code")
        } finally {
            setProcessing(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Güvenlik Ayarları</h1>
                <p className="text-gray-600 dark:text-gray-400">Hesabınızın güvenlik ayarlarını yönetin</p>
            </div>

            {success && (
                <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-xl text-green-600 dark:text-green-400">
                    {success}
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400">
                    {error}
                </div>
            )}

            {/* 2FA Status Card */}
            <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${enabled
                                    ? "bg-gradient-to-br from-green-500 to-emerald-500"
                                    : "bg-gradient-to-br from-gray-400 to-gray-500"
                                }`}>
                                {enabled ? <ShieldCheck className="h-6 w-6 text-white" /> : <Shield className="h-6 w-6 text-white" />}
                            </div>
                            <div>
                                <CardTitle className="text-gray-900 dark:text-white">İki Faktörlü Doğrulama (2FA)</CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-400">
                                    Hesabınıza ekstra güvenlik katmanı ekleyin
                                </CardDescription>
                            </div>
                        </div>
                        <Badge className={enabled ? "bg-green-500/20 text-green-600" : "bg-gray-500/20 text-gray-500"}>
                            {enabled ? "Aktif" : "Pasif"}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!enabled && !setupMode && (
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                İki faktörlü doğrulama etkinleştirildiğinde, giriş yaparken şifrenize ek olarak
                                authenticator uygulamanızdan bir kod girmeniz gerekecektir.
                            </p>
                            <Button onClick={startSetup} disabled={processing}>
                                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                                2FA Kurulumunu Başlat
                            </Button>
                        </div>
                    )}

                    {setupMode && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    Google Authenticator, Authy veya benzeri bir uygulama ile QR kodunu tarayın
                                </p>
                                {qrCode && (
                                    <div className="inline-block p-4 bg-white rounded-xl">
                                        <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-gray-100 dark:bg-white/5 rounded-xl">
                                <p className="text-sm text-gray-500 mb-2">QR kod çalışmıyorsa bu kodu manuel girin:</p>
                                <code className="text-cyan-600 dark:text-cyan-400 font-mono text-sm break-all">{secret}</code>
                            </div>

                            <div>
                                <Label htmlFor="verify" className="text-gray-700 dark:text-gray-300">
                                    Doğrulama Kodu
                                </Label>
                                <Input
                                    id="verify"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    placeholder="6 haneli kod"
                                    value={verifyCode}
                                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                                    className="mt-2 text-center text-2xl tracking-widest"
                                />
                            </div>

                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setSetupMode(false)} className="flex-1">
                                    İptal
                                </Button>
                                <Button onClick={enableTwoFactor} disabled={processing || verifyCode.length !== 6} className="flex-1">
                                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    2FA'yı Etkinleştir
                                </Button>
                            </div>
                        </div>
                    )}

                    {enabled && (
                        <div className="space-y-4">
                            <p className="text-gray-600 dark:text-gray-400">
                                İki faktörlü doğrulama etkin. Devre dışı bırakmak için authenticator kodunuzu girin.
                            </p>
                            <div>
                                <Label htmlFor="disable" className="text-gray-700 dark:text-gray-300">
                                    Authenticator Kodu
                                </Label>
                                <Input
                                    id="disable"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    placeholder="6 haneli kod"
                                    value={disableCode}
                                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                                    className="mt-2 text-center text-xl tracking-widest max-w-xs"
                                />
                            </div>
                            <Button
                                variant="destructive"
                                onClick={disableTwoFactor}
                                disabled={processing || disableCode.length !== 6}
                            >
                                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldOff className="h-4 w-4 mr-2" />}
                                2FA'yı Devre Dışı Bırak
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
