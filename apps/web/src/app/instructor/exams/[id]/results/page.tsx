"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { apiClient } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, User, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

interface Attempt {
    id: string
    status: string
    startedAt: string
    submittedAt?: string
    user: { id: string; name: string; email: string }
    answers: any[]
    grade?: { totalScore?: number; feedback?: string }
    proctoringSession?: { events: any[]; flagsCount?: number }
}

interface Exam {
    id: string
    title: string
}

export default function ExamResultsPage() {
    const params = useParams()
    const examId = params.id as string
    const [exam, setExam] = useState<Exam | null>(null)
    const [attempts, setAttempts] = useState<Attempt[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        if (!examId) return
        fetchData()
    }, [examId])

    const fetchData = async () => {
        try {
            // Fetch exam info
            const examRes = await apiClient.get(`/exams/${examId}`)
            setExam(examRes.data?.data || examRes.data)

            // Fetch attempts
            const attemptsRes = await apiClient.get(`/exams/${examId}/attempts`)
            setAttempts(attemptsRes.data?.data || attemptsRes.data || [])
        } catch (err) {
            console.error("Failed to fetch data", err)
            setError("Veriler yüklenemedi")
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            </div>
        )
    }

    if (error) {
        return <div className="text-red-500 p-4">{error}</div>
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "submitted":
                return <Badge className="bg-green-500/20 text-green-600">Tamamlandı</Badge>
            case "in_progress":
                return <Badge className="bg-yellow-500/20 text-yellow-600">Devam Ediyor</Badge>
            default:
                return <Badge variant="secondary">{status || "-"}</Badge>
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/instructor/exams">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {exam?.title || "Sınav"} - Sonuçlar
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        {attempts.length} öğrenci bu sınava girmiş
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Toplam Giriş</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{attempts.length}</div>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Tamamlanan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {attempts.filter(a => a.status === "submitted").length}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Devam Eden</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            {attempts.filter(a => a.status === "in_progress").length}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Ortalama Puan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-cyan-600">
                            {attempts.filter(a => a.grade).length > 0
                                ? Math.round(
                                    attempts
                                        .filter(a => a.grade)
                                        .reduce((acc, a) => acc + (a.grade?.totalScore || 0), 0) /
                                    attempts.filter(a => a.grade).length
                                )
                                : "-"}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Attempts List */}
            <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
                <CardHeader>
                    <CardTitle className="text-gray-900 dark:text-white">Öğrenci Sonuçları</CardTitle>
                </CardHeader>
                <CardContent>
                    {attempts.length === 0 ? (
                        <div className="text-center py-12">
                            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 dark:text-gray-400">Henüz kimse bu sınava girmemiş</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {attempts.map(attempt => (
                                <div
                                    key={attempt.id}
                                    className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                                >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center text-white font-semibold">
                                        {attempt.user.name?.charAt(0) || "?"}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 dark:text-white">{attempt.user.name}</p>
                                        <p className="text-sm text-gray-500">{attempt.user.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Clock className="h-4 w-4" />
                                        {new Date(attempt.startedAt).toLocaleString('tr-TR')}
                                    </div>
                                    {getStatusBadge(attempt.status)}
                                    <div className="text-right min-w-[60px]">
                                        {attempt.grade ? (
                                            <span className="text-lg font-bold text-cyan-600">{attempt.grade.totalScore}</span>
                                        ) : attempt.status === "submitted" ? (
                                            <span className="text-sm text-gray-500">Notlandırılmadı</span>
                                        ) : (
                                            <span className="text-sm text-gray-400">-</span>
                                        )}
                                    </div>
                                    {attempt.proctoringSession && attempt.proctoringSession.events?.length > 0 && (
                                        <Badge variant="destructive" className="flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            {attempt.proctoringSession.events.length}
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
