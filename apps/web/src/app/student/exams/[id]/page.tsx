"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { examsService } from "@/lib/services/exams"
import { Exam } from "@/types/api"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Download, Play, Shield, Clock, AlertTriangle, ExternalLink } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useTranslation } from "@/i18n/LanguageContext"
import { useAuth } from "@/lib/hooks/useAuth"

export default function StudentExamDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string
    const [exam, setExam] = useState<Exam | null>(null)
    const [error, setError] = useState("")
    const [starting, setStarting] = useState(false)
    const { t, locale } = useTranslation()
    const { accessToken } = useAuth()

    // Detect if we're running inside SEB
    const [isInSEB, setIsInSEB] = useState(false)

    useEffect(() => {
        // Check User-Agent for SEB
        const userAgent = window.navigator.userAgent
        setIsInSEB(userAgent.includes("SEB"))
    }, [])

    useEffect(() => {
        if (!id) return
        const fetchExam = async () => {
            try {
                const data = await examsService.getById(id)
                if (data) setExam(data)
            } catch {
                setError(locale === "tr" ? "Sınav bulunamadı" : "Exam not found")
            }
        }
        fetchExam()
    }, [id, locale])

    const handleStartExam = async () => {
        if (!exam) return
        setStarting(true)
        setError("")
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
            const token = localStorage.getItem("accessToken")
            const res = await fetch(`${apiUrl}/exams/${exam.id}/start`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            })
            if (res.status === 403) {
                const data = await res.json()
                if (data.error === "SEB_REQUIRED") {
                    setError(t('seb_required_banner') as string)
                } else {
                    setError(data.message || "Access denied")
                }
                setStarting(false)
                return
            }
            if (!res.ok) {
                throw new Error(locale === "tr" ? "Sınav başlatılamadı" : "Failed to start exam")
            }
            const data = await res.json()
            router.push(`/student/exams/${exam.id}/take?attemptId=${data.data.id}`)
        } catch (err: any) {
            setError(err.message || (locale === "tr" ? "Sınav başlatılamadı" : "Failed to start exam"))
        } finally {
            setStarting(false)
        }
    }

    if (error && !exam) return <div className="text-destructive p-4">{error}</div>
    if (!exam) return <div className="p-4">Loading...</div>

    const isSebEnabled = exam.sebEnabled === true
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/student/exams">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{exam.title}</h1>
                    <div className="flex gap-2 mt-1">
                        <Badge variant={exam.status === 'published' ? 'default' : 'secondary'}>{exam.status || "draft"}</Badge>
                        {isSebEnabled && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                                <Shield className="h-3 w-3" /> {t('seb_required_title')}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('exam_details')}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <strong>{t('duration')}:</strong> {exam.durationMinutes ? `${exam.durationMinutes} ${locale === "tr" ? "dk" : "mins"}` : (locale === "tr" ? "Sınırsız" : "No limit")}
                        </div>
                        <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <strong>{t('security')}:</strong> {isSebEnabled ? "SEB" : t('standard')}
                        </div>
                        {(exam as any).startAt && (
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-green-500" />
                                <strong>{locale === "tr" ? "Başlangıç:" : "Start:"}</strong>
                                <span>{new Date((exam as any).startAt).toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}</span>
                            </div>
                        )}
                        {(exam as any).endAt && (
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-red-500" />
                                <strong>{locale === "tr" ? "Bitiş:" : "End:"}</strong>
                                <span>{new Date((exam as any).endAt).toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}</span>
                            </div>
                        )}
                        {exam.description && (
                            <p className="text-sm text-muted-foreground mt-2">{exam.description}</p>
                        )}
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>{t('start_exam')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isSebEnabled && !isInSEB ? (
                            <>
                                <Alert variant="destructive">
                                    <Shield className="h-4 w-4" />
                                    <AlertTitle>{t('seb_required_title')}</AlertTitle>
                                    <AlertDescription>
                                        {t('seb_required_banner')}
                                    </AlertDescription>
                                </Alert>

                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <Button asChild>
                                        <a href={`${apiUrl}/exams/${exam.id}/seb-config?platform=mac&token=${accessToken}`} download>
                                            <Download className="mr-2 h-4 w-4" />
                                            {t('seb_download_config')} (Mac)
                                        </a>
                                    </Button>
                                    <Button variant="outline" asChild>
                                        <a href={`${apiUrl}/exams/${exam.id}/seb-config?platform=win&token=${accessToken}`} download>
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            {t('seb_download_config')} (Windows)
                                        </a>
                                    </Button>
                                </div>

                                <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
                                    <p>{t('seb_instructions')}</p>
                                    <p className="text-muted-foreground">{t('seb_not_installed')}</p>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {isSebEnabled && isInSEB && (
                                    <Alert>
                                        <Shield className="h-4 w-4" />
                                        <AlertTitle>{locale === "tr" ? "SEB Aktif" : "SEB Active"}</AlertTitle>
                                        <AlertDescription>
                                            {locale === "tr" ? "Safe Exam Browser içindesiniz. Sınavı başlatabilirsiniz." : "You are in Safe Exam Browser. You can start the exam."}
                                        </AlertDescription>
                                    </Alert>
                                )}
                                <div className="flex gap-2">
                                    <Button onClick={handleStartExam} disabled={starting} size="lg">
                                        <Play className="mr-2 h-4 w-4" />
                                        {starting ? (locale === "tr" ? "Başlatılıyor..." : "Starting...") : t('start_exam')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
