"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { coursesService } from "@/lib/services/courses"
import { useTranslation } from "@/i18n/LanguageContext"
import { GraduationCap, ClipboardList, CheckCircle, AlertTriangle } from "lucide-react"

type RosterItem = {
    id: string
    name: string
    email: string
    enrolledAt?: string
    lastExamTitle?: string
    lastExamScore?: number
    lastAssignmentTitle?: string
    lastAssignmentStatus?: "submitted" | "missing"
};

const fallbackRoster: RosterItem[] = [
    {
        id: "u1",
        name: "Elif Öğrenci",
        email: "elif@student.edu",
        enrolledAt: "2024-09-01",
        lastExamTitle: "Demo Exam",
        lastExamScore: 78,
        lastAssignmentTitle: "Veri Mühendisliği Ödevi",
        lastAssignmentStatus: "submitted",
    },
    {
        id: "u2",
        name: "Mehmet Öğrenci",
        email: "mehmet@student.edu",
        enrolledAt: "2024-09-10",
        lastExamTitle: "Yapay Zeka Final",
        lastExamScore: 92,
        lastAssignmentTitle: "Model Değerlendirme",
        lastAssignmentStatus: "missing",
    },
];

export default function RosterTab() {
    const params = useParams()
    const courseId = params.id as string
    const [roster, setRoster] = useState<RosterItem[]>([])
    const [loading, setLoading] = useState(true)
    const { t } = useTranslation()

    useEffect(() => {
        const fetchRoster = async () => {
            const data = await coursesService.getRoster(courseId)
            setRoster(data && data.length > 0 ? data : fallbackRoster)
            setLoading(false)
        }
        fetchRoster()
    }, [courseId])

    const summary = useMemo(() => {
        const total = roster.length
        const submitted = roster.filter(r => r.lastAssignmentStatus === "submitted").length
        const missing = roster.filter(r => r.lastAssignmentStatus === "missing").length
        const avgScore =
            roster.reduce((acc, r) => acc + (r.lastExamScore || 0), 0) / (roster.length || 1)
        return { total, submitted, missing, avgScore: Math.round(avgScore) }
    }, [roster])

    if (loading) return <div className="p-4 text-muted-foreground">{t('loading') || "Yükleniyor..."}</div>

    return (
        <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">{t('students') || "Öğrenciler"}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-bold flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-primary" /> {summary.total}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">{t('submitted_assignments') || "Gönderilen Ödevler"}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-bold flex items-center gap-2 text-green-500">
                        <CheckCircle className="h-5 w-5" /> {summary.submitted}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">{t('missing_assignments') || "Eksik Ödevler"}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-bold flex items-center gap-2 text-amber-500">
                        <AlertTriangle className="h-5 w-5" /> {summary.missing}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">{t('avg_exam_score') || "Sınav Ortalaması"}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-2xl font-bold flex items-center gap-2 text-cyan-400">
                        <ClipboardList className="h-5 w-5" /> {summary.avgScore}%
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('student_roster') || "Sınıf Listesi"}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('student') || "Öğrenci"}</TableHead>
                                    <TableHead>{t('enrolled_on') || "Kayıt"}</TableHead>
                                    <TableHead>{t('last_exam') || "Son Sınav"}</TableHead>
                                    <TableHead>{t('last_assignment') || "Son Ödev"}</TableHead>
                                    <TableHead className="text-right">{t('status') || "Durum"}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {roster.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{r.name}</span>
                                                <span className="text-xs text-muted-foreground">{r.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{r.enrolledAt ? new Date(r.enrolledAt).toLocaleDateString("tr-TR") : "-"}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span>{r.lastExamTitle || "-"}</span>
                                                {r.lastExamScore != null && (
                                                    <Badge variant="secondary">{r.lastExamScore}%</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{r.lastAssignmentTitle || "-"}</TableCell>
                                        <TableCell className="text-right">
                                            {r.lastAssignmentStatus === "submitted" ? (
                                                <Badge variant="outline" className="text-green-500 border-green-400/60">
                                                    {t('submitted') || "Gönderildi"}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-amber-500 border-amber-400/60">
                                                    {t('missing') || "Eksik"}
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
