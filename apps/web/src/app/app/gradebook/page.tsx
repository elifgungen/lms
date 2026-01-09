"use client"

import { useEffect, useState } from "react"
import { gradebookService } from "@/lib/services/gradebook"
import { apiClient } from "@/lib/api/client"
import { Attempt } from "@/types/api"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, BookOpen, FileText, TrendingUp } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"

interface Submission {
    id: string
    score: number | null
    feedback: string | null
    submittedAt: string
    fileName: string
    assignment: {
        id: string
        title: string
        course: { id: string; title: string }
    }
}

export default function GradebookPage() {
    const [attempts, setAttempts] = useState<Attempt[]>([])
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const { t } = useTranslation()

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [attemptsData, submissionsRes] = await Promise.all([
                    gradebookService.getAll(),
                    apiClient.get("/assignments/my-submissions")
                ])
                setAttempts(attemptsData)
                setSubmissions(submissionsRes.data?.data || [])
            } catch {
                setError("Veriler yüklenemedi")
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const filteredAttempts = attempts.filter(a =>
        (a.studentName || "").toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredSubmissions = submissions.filter(s =>
        s.assignment?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.assignment?.course?.title?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Calculate stats
    const totalExamPoints = attempts.reduce((sum, a) => sum + (a.score || 0), 0)
    const totalAssignmentPoints = submissions.reduce((sum, s) => sum + (s.score || 0), 0)
    const gradedSubmissions = submissions.filter(s => s.score !== null).length

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">{t('gradebook')}</h1>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sınav Notları</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalExamPoints} puan</div>
                        <p className="text-xs text-muted-foreground">{attempts.length} sınav girişi</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ödev Notları</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalAssignmentPoints} puan</div>
                        <p className="text-xs text-muted-foreground">{gradedSubmissions}/{submissions.length} ödev notlandı</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Toplam</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalExamPoints + totalAssignmentPoints} puan</div>
                        <p className="text-xs text-muted-foreground">Genel toplam</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>{t('gradebook')}</CardTitle>
                    <CardDescription>
                        Sınav ve ödev notlarınızı görüntüleyin.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center py-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>

                    <Tabs defaultValue="exams" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="exams">
                                <BookOpen className="mr-2 h-4 w-4" />
                                Sınavlar ({attempts.length})
                            </TabsTrigger>
                            <TabsTrigger value="assignments">
                                <FileText className="mr-2 h-4 w-4" />
                                Ödevler ({submissions.length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="exams">
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Sınav</TableHead>
                                            <TableHead>Puan</TableHead>
                                            <TableHead>Durum</TableHead>
                                            <TableHead>Tarih</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {!loading && filteredAttempts.map((attempt) => (
                                            <TableRow key={attempt.id}>
                                                <TableCell className="font-medium">{attempt.studentName || "-"}</TableCell>
                                                <TableCell>{attempt.score ?? 0} / {attempt.totalPoints ?? 0}</TableCell>
                                                <TableCell>
                                                    <Badge variant={attempt.status === 'submitted' ? 'default' : 'secondary'}>
                                                        {attempt.status === 'submitted' ? 'Tamamlandı' : 'Devam Ediyor'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString('tr-TR') : '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                        {(loading || filteredAttempts.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">
                                                    {loading ? "Yükleniyor..." : "Henüz sınav girişiniz yok."}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>

                        <TabsContent value="assignments">
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Ödev</TableHead>
                                            <TableHead>Ders</TableHead>
                                            <TableHead>Puan</TableHead>
                                            <TableHead>Geri Bildirim</TableHead>
                                            <TableHead>Teslim Tarihi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {!loading && filteredSubmissions.map((sub) => (
                                            <TableRow key={sub.id}>
                                                <TableCell className="font-medium">{sub.assignment?.title || "-"}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{sub.assignment?.course?.title || "-"}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {sub.score !== null ? (
                                                        <Badge variant="default">{sub.score}/100</Badge>
                                                    ) : (
                                                        <Badge variant="secondary">Bekliyor</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="max-w-xs truncate">
                                                    {sub.feedback || "-"}
                                                </TableCell>
                                                <TableCell>{new Date(sub.submittedAt).toLocaleString('tr-TR')}</TableCell>
                                            </TableRow>
                                        ))}
                                        {(loading || filteredSubmissions.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center">
                                                    {loading ? "Yükleniyor..." : "Henüz ödev tesliminiz yok."}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {error && <p className="text-sm text-destructive mt-2">{error}</p>}
                </CardContent>
            </Card>
        </div>
    )
}
