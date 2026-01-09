"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { assignmentsService, Assignment, Submission } from "@/lib/services/assignments"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog"
import { ChevronLeft, Download, Calendar, FileText, Check, X } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useTranslation } from "@/i18n/LanguageContext"

export default function InstructorAssignmentDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string
    const { accessToken } = useAuth()
    const { t } = useTranslation()

    const [assignment, setAssignment] = useState<Assignment | null>(null)
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    // Grading dialog state
    const [gradeDialog, setGradeDialog] = useState(false)
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
    const [gradeForm, setGradeForm] = useState({ score: 0, feedback: "" })
    const [grading, setGrading] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [assignmentData, submissionsData] = await Promise.all([
                    assignmentsService.getById(id),
                    assignmentsService.getSubmissions(id)
                ])
                if (assignmentData) setAssignment(assignmentData)
                setSubmissions(submissionsData)
            } catch {
                setError("Failed to load assignment")
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [id])

    const openGradeDialog = (submission: Submission) => {
        setSelectedSubmission(submission)
        setGradeForm({ score: submission.score || 0, feedback: submission.feedback || "" })
        setGradeDialog(true)
    }

    const handleGrade = async () => {
        if (!selectedSubmission) return
        setGrading(true)
        try {
            const updated = await assignmentsService.gradeSubmission(
                selectedSubmission.id,
                gradeForm.score,
                gradeForm.feedback
            )
            setSubmissions(prev => prev.map(s => s.id === updated.id ? updated : s))
            setGradeDialog(false)
        } catch (err: any) {
            setError(err.message || "Failed to grade")
        } finally {
            setGrading(false)
        }
    }

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "-"
        return new Date(dateStr).toLocaleString("tr-TR")
    }

    const handleDownload = (submission: Submission) => {
        const url = assignmentsService.getDownloadUrl(submission.id)
        const link = document.createElement("a")
        link.href = `${url}?token=${accessToken}`
        link.download = submission.fileName
        link.click()
    }

    if (loading) return <div className="p-4">{t('loading') || "Yükleniyor..."}</div>
    if (error && !assignment) return <div className="text-destructive p-4">{error}</div>
    if (!assignment) return <div className="p-4">{t('no_assignment_found') || "Ödev bulunamadı"}</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/instructor/assignments">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{assignment.title}</h1>
                    <div className="flex gap-2 mt-1 text-muted-foreground text-sm">
                        <span>{assignment.course?.title}</span>
                        {assignment.dueDate && (
                            <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {t('due_date') || "Teslim Tarihi"}: {formatDate(assignment.dueDate)}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {assignment.description && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">{t('assignment_description') || "Açıklama"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground whitespace-pre-wrap">{assignment.description}</p>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>{t('student_submissions') || "Öğrenci Gönderimleri"}</CardTitle>
                    <CardDescription>
                        {(t('submissions_total') || `Toplam {{count}} gönderim yapıldı.`).replace("{{count}}", submissions.length.toString())}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('student') || "Öğrenci"}</TableHead>
                                    <TableHead>{t('file') || "Dosya"}</TableHead>
                                    <TableHead>{t('submitted_on') || "Gönderim Tarihi"}</TableHead>
                                    <TableHead>{t('score') || "Puan"}</TableHead>
                                    <TableHead>{t('actions') || "İşlemler"}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {submissions.map((submission) => (
                                    <TableRow key={submission.id}>
                                        <TableCell className="font-medium">
                                            {submission.student?.name || submission.student?.email || "-"}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <FileText className="h-3 w-3" />
                                                {submission.fileName}
                                            </div>
                                        </TableCell>
                                        <TableCell>{formatDate(submission.submittedAt)}</TableCell>
                                        <TableCell>
                                            {submission.score != null ? (
                                                <Badge variant="default">
                                                    <Check className="h-3 w-3 mr-1" />
                                                    {submission.score}/100
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">
                                                    <X className="h-3 w-3 mr-1" />
                                                    {t('not_graded') || "Notlanmadı"}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDownload(submission)}
                                                >
                                                    <Download className="h-3 w-3 mr-1" />
                                                    {t('download') || "İndir"}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openGradeDialog(submission)}
                                                >
                                                    {t('grade_submission') || "Notla"}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {submissions.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            {t('no_submissions') || "Henüz gönderim yapılmadı."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Grade Dialog */}
            <Dialog open={gradeDialog} onOpenChange={setGradeDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('grade_submission') || "Gönderimi Notla"}</DialogTitle>
                        <DialogDescription>
                            {selectedSubmission?.student?.name || selectedSubmission?.student?.email} - {selectedSubmission?.fileName}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t('score') || "Puan"} (0-100)</Label>
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                value={gradeForm.score}
                                onChange={(e) => setGradeForm({ ...gradeForm, score: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('feedback') || "Geri Bildirim"}</Label>
                            <Textarea
                                value={gradeForm.feedback}
                                onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                                placeholder={t('feedback_placeholder') || "İsteğe bağlı geri bildirim..."}
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setGradeDialog(false)}>{t('cancel') || "İptal"}</Button>
                        <Button onClick={handleGrade} disabled={grading}>
                            {grading ? (t('saving') || "Kaydediliyor...") : (t('save') || "Kaydet")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
