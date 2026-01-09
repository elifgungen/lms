"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { ChevronLeft, Save, Shield } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"
import { examsService } from "@/lib/services/exams"

export default function CreateExamPage() {
    const router = useRouter()
    const { t } = useTranslation()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        durationMinutes: 60,
        randomQuestionCount: 0,
        sebEnabled: false,
        sebQuitPassword: "",
        sebAllowedUrls: "",
        sebBlockedUrls: ""
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: (name === "durationMinutes" || name === "randomQuestionCount") ? parseInt(value) || 0 : value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const payload: any = {
                title: formData.title,
                description: formData.description,
                durationMinutes: formData.durationMinutes,
                randomQuestionCount: formData.randomQuestionCount > 0 ? formData.randomQuestionCount : null,
                sebEnabled: formData.sebEnabled
            }

            if (formData.sebEnabled) {
                payload.sebQuitPassword = formData.sebQuitPassword || undefined
                payload.sebConfig = {
                    allowedUrls: formData.sebAllowedUrls.split("\n").filter(u => u.trim()),
                    blockedUrls: formData.sebBlockedUrls.split("\n").filter(u => u.trim())
                }
            }

            await examsService.create(payload)
            router.push("/instructor/exams")
        } catch (err: any) {
            setError(err.message || "Failed to create exam")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/instructor/exams">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('create_new_exam')}</h1>
                    <p className="text-muted-foreground">{t('create_exam_desc')}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('exam_details')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">{t('title')}</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="Midterm Exam"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">{t('description')}</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Exam description..."
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="durationMinutes">{t('duration')}</Label>
                                <Input
                                    id="durationMinutes"
                                    name="durationMinutes"
                                    type="number"
                                    value={formData.durationMinutes}
                                    onChange={handleChange}
                                    min={1}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="randomQuestionCount">Rastgele Soru Sayısı</Label>
                                <Input
                                    id="randomQuestionCount"
                                    name="randomQuestionCount"
                                    type="number"
                                    value={formData.randomQuestionCount}
                                    onChange={handleChange}
                                    min={0}
                                    placeholder="0 = tüm sorular"
                                />
                                <p className="text-xs text-muted-foreground">
                                    0 bırakırsanız tüm sorular gösterilir. Bir sayı girerseniz havuzdan rastgele seçilir.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                {t('security')}
                            </CardTitle>
                            <CardDescription>
                                Configure Safe Exam Browser (SEB) settings for secure proctoring
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>{t('seb_enabled')}</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Require SEB for this exam
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.sebEnabled}
                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sebEnabled: checked }))}
                                />
                            </div>

                            {formData.sebEnabled && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="sebQuitPassword">{t('seb_quit_password')}</Label>
                                        <Input
                                            id="sebQuitPassword"
                                            name="sebQuitPassword"
                                            type="password"
                                            value={formData.sebQuitPassword}
                                            onChange={handleChange}
                                            placeholder="Optional exit password"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="sebAllowedUrls">{t('seb_allowed_urls')}</Label>
                                        <Textarea
                                            id="sebAllowedUrls"
                                            name="sebAllowedUrls"
                                            value={formData.sebAllowedUrls}
                                            onChange={handleChange}
                                            placeholder="One URL per line (e.g., https://allowed-site.com/*)"
                                            rows={2}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="sebBlockedUrls">{t('seb_blocked_urls')}</Label>
                                        <Textarea
                                            id="sebBlockedUrls"
                                            name="sebBlockedUrls"
                                            value={formData.sebBlockedUrls}
                                            onChange={handleChange}
                                            placeholder="One URL per line (e.g., *google.com*)"
                                            rows={2}
                                        />
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {error && (
                    <p className="text-sm text-destructive mt-4">{error}</p>
                )}

                <div className="flex gap-4 mt-6">
                    <Button type="submit" disabled={loading}>
                        <Save className="mr-2 h-4 w-4" />
                        {loading ? "Saving..." : t('save')}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                        <Link href="/instructor/exams">{t('cancel')}</Link>
                    </Button>
                </div>
            </form>
        </div>
    )
}
