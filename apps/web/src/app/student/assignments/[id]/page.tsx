"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { assignmentsService, Assignment, Submission } from "@/lib/services/assignments"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ChevronLeft, Calendar, Upload, FileText, CheckCircle, Clock, MessageSquare } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"

export default function StudentAssignmentDetailPage() {
    const params = useParams()
    const id = params.id as string
    const { t } = useTranslation()

    const [assignment, setAssignment] = useState<Assignment | null>(null)
    const [submission, setSubmission] = useState<Submission | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [uploading, setUploading] = useState(false)
    const [uploadSuccess, setUploadSuccess] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [assignmentData, submissionData] = await Promise.all([
                    assignmentsService.getById(id),
                    assignmentsService.getMySubmission(id)
                ])
                if (assignmentData) setAssignment(assignmentData)
                if (submissionData) setSubmission(submissionData)
            } catch {
                setError("Failed to load assignment")
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [id])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        setError("")
        setUploadSuccess(false)

        try {
            const result = await assignmentsService.submitFile(id, file)
            setSubmission(result)
            setUploadSuccess(true)
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || "Failed to upload file")
        } finally {
            setUploading(false)
        }
    }

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "-"
        return new Date(dateStr).toLocaleString("tr-TR")
    }

    const isPastDue = (dateStr?: string) => {
        if (!dateStr) return false
        return new Date(dateStr) < new Date()
    }

    if (loading) return <div className="p-4">{t('loading') || "Yükleniyor..."}</div>
    if (error && !assignment) return <div className="text-destructive p-4">{error}</div>
    if (!assignment) return <div className="p-4">{t('no_assignment_found') || "Ödev bulunamadı"}</div>

    const pastDue = isPastDue(assignment.dueDate)

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/student/assignments">
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
                                <span className={`flex items-center gap-1 ${pastDue ? "text-destructive" : ""}`}>
                                    <Calendar className="h-3 w-3" />
                                    {t('due_date') || "Teslim Tarihi"}: {formatDate(assignment.dueDate)}
                                    {pastDue && ` (${t('status_overdue') || "Geçti"})`}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Assignment Description */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{t('assignment_description') || "Ödev Açıklaması"}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                        {assignment.description || t('no_description') || "Açıklama yok."}
                    </p>
                    <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
                        <span>{t('allowed_extensions') || "İzin verilen uzantılar"}: {assignment.allowedFileTypes || t('all') || "Hepsi"}</span>
                        <span>•</span>
                        <span>{t('max_file_size') || "Maks. boyut"}: {assignment.maxFileSizeMb || 10} MB</span>
                    </div>
                </CardContent>
            </Card>

            {/* Submission Status / Grade */}
            {submission && submission.score != null && (
                <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>{t('graded') || "Notlandırıldı"}</AlertTitle>
                    <AlertDescription>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Badge variant="default" className="text-lg px-3 py-1">
                                    {submission.score}/100
                                </Badge>
                            </div>
                            {submission.feedback && (
                                <div className="flex items-start gap-2 mt-2 p-3 bg-muted rounded-md">
                                    <MessageSquare className="h-4 w-4 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-sm">{t('instructor_feedback') || "Eğitmen Geri Bildirimi"}:</div>
                                        <p className="text-sm">{submission.feedback}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* File Upload */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{t('submit_assignment') || "Dosya Gönder"}</CardTitle>
                    <CardDescription>
                        {submission
                            ? `${t('current_submission') || "Mevcut gönderim"}: ${submission.fileName} (${formatDate(submission.submittedAt)})`
                            : t('no_submission_yet') || "Henüz dosya göndermediniz."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {uploadSuccess && (
                        <Alert className="mb-4">
                            <CheckCircle className="h-4 w-4" />
                            <AlertTitle>{t('success') || "Başarılı"}</AlertTitle>
                            <AlertDescription>{t('submission_success') || "Dosyanız başarıyla gönderildi."}</AlertDescription>
                        </Alert>
                    )}

                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertTitle>{t('error') || "Hata"}</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="file">{t('upload_file') || "Dosya Seç"}</Label>
                            <Input
                                id="file"
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                disabled={uploading}
                            />
                        </div>

                        {uploading && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4 animate-spin" />
                                {t('uploading') || "Yükleniyor..."}
                            </div>
                        )}

                        {submission && (
                            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                                <FileText className="h-4 w-4" />
                                <div>
                                    <div className="font-medium text-sm">{submission.fileName}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {t('submitted_on') || "Gönderildi"}: {formatDate(submission.submittedAt)}
                                        {submission.fileSize && ` • ${(submission.fileSize / 1024).toFixed(1)} KB`}
                                    </div>
                                </div>
                            </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                            {submission
                                ? (t('submission_replace_note') || "Yeni bir dosya yüklerseniz önceki gönderiminiz değiştirilir.")
                                : (t('submission_note') || "Dosyanızı yükledikten sonra gönderiminiz kaydedilir.")}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
