"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { examsService } from "@/lib/services/exams"
import { questionBankService } from "@/lib/services/questionBank"
import { apiClient } from "@/lib/api/client"
import { Exam, QuestionBank } from "@/types/api"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Download, Play, Info, Library, Save, Loader2, BarChart3 } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"
import { useAuth } from "@/lib/hooks/useAuth"

function getBasePath(roles: string[]): string {
    if (roles.includes("super_admin") || roles.includes("admin")) return "/admin"
    if (roles.includes("instructor") || roles.includes("assistant")) return "/instructor"
    return "/student"
}

function isInstructorOrAbove(roles: string[]): boolean {
    return roles.some(r => ["super_admin", "admin", "instructor", "assistant"].includes(r))
}

export default function ExamDetailPage() {
    const params = useParams()
    const id = params.id as string
    const [exam, setExam] = useState<Exam | null>(null)
    const [allBanks, setAllBanks] = useState<QuestionBank[]>([])
    const [selectedBankIds, setSelectedBankIds] = useState<string[]>([])
    const [error, setError] = useState("")
    const [infoMessage, setInfoMessage] = useState("")
    const [saving, setSaving] = useState(false)
    const { t, locale } = useTranslation()
    const { user } = useAuth()
    const basePath = getBasePath(user?.roles || [])
    const canEdit = isInstructorOrAbove(user?.roles || [])

    useEffect(() => {
        if (!id) return
        const fetchData = async () => {
            try {
                const [examData, banksData] = await Promise.all([
                    examsService.getById(id),
                    questionBankService.getAll()
                ])
                if (examData) {
                    setExam(examData)
                    setSelectedBankIds((examData as any).questionBanks?.map((b: any) => b.id) || [])
                }
                setAllBanks(banksData || [])
            } catch {
                setError("Sınav bulunamadı")
            }
        }
        fetchData()
    }, [id])

    const handleBankToggle = (bankId: string) => {
        setSelectedBankIds(prev =>
            prev.includes(bankId)
                ? prev.filter(id => id !== bankId)
                : [...prev, bankId]
        )
    }

    const handleSaveBanks = async () => {
        if (!exam) return
        setSaving(true)
        try {
            await apiClient.put(`/exams/${exam.id}/question-banks`, { questionBankIds: selectedBankIds })
            setInfoMessage(locale === "tr" ? "Soru bankaları kaydedildi!" : "Question banks saved!")
            // Refresh exam data
            const updated = await examsService.getById(id)
            if (updated) setExam(updated)
        } catch (err) {
            console.error("Failed to save question banks:", err)
            setInfoMessage(locale === "tr" ? "Kaydetme başarısız" : "Failed to save")
        } finally {
            setSaving(false)
        }
    }

    if (error) return <div className="text-destructive">{error}</div>
    if (!exam) return <div>Loading...</div>

    const isSebEnabled = (exam as any).sebEnabled === true
    const linkedBankCount = (exam as any).questionBanks?.length || selectedBankIds.length
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

    const fetchSebInfo = async () => {
        if (!exam) return
        setInfoMessage("")
        try {
            const token = localStorage.getItem("accessToken")
            const res = await fetch(`${apiUrl}/exams/${exam.id}/seb-config-info`, {
                headers: token ? { "Authorization": `Bearer ${token}` } : undefined
            })
            if (!res.ok) throw new Error("Bilgi alınamadı")
            const data = await res.json()
            setInfoMessage(`Start URL: ${data.startUrlPreview} | Platform: ${data.platformDefault}`)
        } catch (err: any) {
            setInfoMessage(err.message || "Bilgi alınamadı")
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`${basePath}/exams`}>
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{exam.title}</h1>
                    <div className="flex gap-2 mt-1">
                        <Badge variant={exam.status === 'published' ? 'default' : 'secondary'}>{exam.status || "draft"}</Badge>
                        {isSebEnabled && <Badge variant="outline">SEB Required</Badge>}
                        {(exam as any).randomQuestionCount > 0 && (
                            <Badge variant="secondary">Rastgele {(exam as any).randomQuestionCount} soru</Badge>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>{locale === "tr" ? "Detaylar" : "Details"}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        <div><strong>{locale === "tr" ? "Süre" : "Duration"}:</strong> {exam.durationMinutes ? `${exam.durationMinutes} ${locale === "tr" ? "dk" : "mins"}` : "-"}</div>
                        <div><strong>{locale === "tr" ? "Soru Bankaları" : "Banks"}:</strong> {linkedBankCount}</div>
                        {(exam as any).randomQuestionCount > 0 && (
                            <div><strong>{locale === "tr" ? "Rastgele Soru" : "Random Questions"}:</strong> {(exam as any).randomQuestionCount}</div>
                        )}
                        <div><strong>{locale === "tr" ? "Oluşturulma" : "Created"}:</strong> {exam.createdAt ? new Date(exam.createdAt).toLocaleDateString() : "-"}</div>
                    </CardContent>
                </Card>

                {canEdit && (
                    <Card className="md:col-span-2 lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Library className="h-5 w-5" />
                                {locale === "tr" ? "Soru Bankaları" : "Question Banks"}
                            </CardTitle>
                            <CardDescription>
                                {locale === "tr" ? "Sınava eklenecek soru bankalarını seçin" : "Select question banks to include in this exam"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                                {allBanks.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        {locale === "tr" ? "Soru bankası bulunamadı" : "No question banks found"}
                                    </p>
                                ) : (
                                    allBanks.map(bank => (
                                        <div key={bank.id} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id={`bank-${bank.id}`}
                                                checked={selectedBankIds.includes(bank.id)}
                                                onChange={() => handleBankToggle(bank.id)}
                                                className="h-4 w-4 rounded border-gray-300 text-primary"
                                            />
                                            <label htmlFor={`bank-${bank.id}`} className="text-sm cursor-pointer">
                                                {bank.name || bank.title} ({bank.questionCount || "?"} {locale === "tr" ? "soru" : "Qs"})
                                            </label>
                                        </div>
                                    ))
                                )}
                            </div>
                            <Button onClick={handleSaveBanks} disabled={saving} size="sm">
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {locale === "tr" ? "Kaydet" : "Save"}
                            </Button>
                            {infoMessage && <p className="text-xs text-green-600">{infoMessage}</p>}
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>{locale === "tr" ? "İşlemler" : "Actions"}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        {canEdit && (
                            <Button asChild>
                                <Link href={`${basePath}/exams/${exam.id}/preview`}>
                                    <Play className="mr-2 h-4 w-4" /> {locale === "tr" ? "Önizleme" : "Preview Exam"}
                                </Link>
                            </Button>
                        )}
                        {canEdit && (
                            <Button variant="outline" asChild>
                                <Link href={`${basePath}/exams/${exam.id}/results`}>
                                    <BarChart3 className="mr-2 h-4 w-4" /> {locale === "tr" ? "Sonuçlar" : "Results"}
                                </Link>
                            </Button>
                        )}
                        {!canEdit && !isSebEnabled && (
                            <Button asChild>
                                <Link href={`${basePath}/exams/${exam.id}/take`}>
                                    <Play className="mr-2 h-4 w-4" /> {locale === "tr" ? "Sınava Başla" : "Start Exam"}
                                </Link>
                            </Button>
                        )}

                        {canEdit && isSebEnabled && (
                            <p className="text-sm text-muted-foreground">
                                {locale === "tr"
                                    ? "Bu sınav SEB modunda. Öğrenciler için yapılandırmayı aşağıdan indirebilirsin."
                                    : "This exam runs in SEB mode. Share the config below with students."}
                            </p>
                        )}

                        {isSebEnabled && !canEdit && (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    {locale === "tr"
                                        ? "Bu sınav Safe Exam Browser (SEB) gerektirir. Config dosyasını indirip SEB'de açın."
                                        : "This exam requires Safe Exam Browser (SEB). Download the config and open it in SEB to start."}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="outline" asChild size="sm">
                                        <a href={`${apiUrl}/exams/${exam.id}/seb-config?platform=mac`} download>
                                            <Download className="mr-2 h-4 w-4" /> Mac
                                        </a>
                                    </Button>
                                    <Button variant="outline" asChild size="sm">
                                        <a href={`${apiUrl}/exams/${exam.id}/seb-config?platform=win`} download>
                                            <Download className="mr-2 h-4 w-4" /> Windows
                                        </a>
                                    </Button>
                                    <Button variant="ghost" type="button" onClick={fetchSebInfo} size="sm">
                                        <Info className="mr-2 h-4 w-4" /> Info
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
