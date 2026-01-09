"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
    ArrowLeft,
    BadgeCheck,
    BookOpen,
    Clock,
    FileText,
    GraduationCap,
    Loader2
} from "lucide-react"
import { usersService, StudentResults } from "@/lib/services/users"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"

export default function StudentResultsPage() {
    const params = useParams()
    const studentId = params.id as string
    const [data, setData] = useState<StudentResults | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        if (!studentId) return
        const fetchResults = async () => {
            try {
                const res = await usersService.getStudentResults(studentId)
                setData(res)
            } catch (err: any) {
                console.error("Failed to load student results", err)
                setError(err?.response?.data?.error || "Öğrenci sonuçları yüklenemedi")
            } finally {
                setLoading(false)
            }
        }
        fetchResults()
    }, [studentId])

    const stats = useMemo(() => {
        return {
            courses: data?.courses?.length || 0,
            exams: data?.attempts?.length || 0,
            submissions: data?.submissions?.length || 0
        }
    }, [data])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            </div>
        )
    }

    if (error) {
        return <div className="text-destructive p-4">{error}</div>
    }

    if (!data) return null

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/instructor/students">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{data.student.name || "Öğrenci"}</h1>
                        <p className="text-gray-400">{data.student.email}</p>
                    </div>
                </div>
                <Badge variant="outline" className="gap-1 border-cyan-500/40 text-cyan-300">
                    <BadgeCheck className="h-4 w-4" />
                    Sonuçlar
                </Badge>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-white/5 border-white/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                            <BookOpen className="h-4 w-4" /> Kayıtlı Ders
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats.courses}</div>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" /> Sınav Girişi
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats.exams}</div>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Ödev Teslimi
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats.submissions}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Courses */}
            <Card className="bg-white/5 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">Dersler</CardTitle>
                    <CardDescription>Kayıtlı olduğu dersler</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    {data.courses.length === 0 ? (
                        <p className="text-gray-500 text-sm">Kayıtlı ders yok</p>
                    ) : (
                        data.courses.map(course => (
                            <Badge
                                key={course.id}
                                variant="outline"
                                className="bg-purple-500/20 text-purple-200 border-purple-400/30"
                            >
                                {course.title}
                            </Badge>
                        ))
                    )}
                </CardContent>
            </Card>

            {/* Exam Attempts */}
            <Card className="bg-white/5 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <GraduationCap className="h-5 w-5" />
                        Sınav Sonuçları
                    </CardTitle>
                    <CardDescription>Öğrencinin sınav girişleri ve notları</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-white/10 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-white/10">
                                    <TableHead className="text-gray-400">Sınav</TableHead>
                                    <TableHead className="text-gray-400">Ders</TableHead>
                                    <TableHead className="text-gray-400">Durum</TableHead>
                                    <TableHead className="text-gray-400">Puan</TableHead>
                                    <TableHead className="text-gray-400">Teslim</TableHead>
                                    <TableHead className="text-gray-400 text-right">Detay</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.attempts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-gray-500 h-16">
                                            Sınav girişi yok
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.attempts.map(attempt => (
                                        <TableRow key={attempt.id} className="border-white/10">
                                            <TableCell className="text-white font-medium">
                                                {attempt.exam?.title || "Sınav"}
                                            </TableCell>
                                            <TableCell className="text-gray-400">
                                                {attempt.courseTitle || "-"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={attempt.status === "submitted" ? "default" : "secondary"}>
                                                    {attempt.status || "-"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-white">
                                                {typeof attempt.grade?.totalScore === "number"
                                                    ? attempt.grade.totalScore
                                                    : "-"}
                                            </TableCell>
                                            <TableCell className="text-gray-400">
                                                {attempt.submittedAt
                                                    ? new Date(attempt.submittedAt).toLocaleString("tr-TR")
                                                    : "-"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {attempt.exam?.id && (
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <Link href={`/instructor/exams/${attempt.exam.id}/results`}>
                                                            İncele
                                                        </Link>
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Assignment submissions */}
            <Card className="bg-white/5 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Ödev Teslimleri
                    </CardTitle>
                    <CardDescription>Gönderilen ödevler ve puanları</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-white/10 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-white/10">
                                    <TableHead className="text-gray-400">Ödev</TableHead>
                                    <TableHead className="text-gray-400">Ders</TableHead>
                                    <TableHead className="text-gray-400">Puan</TableHead>
                                    <TableHead className="text-gray-400">Teslim</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.submissions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-gray-500 h-16">
                                            Teslim yok
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.submissions.map(submission => (
                                        <TableRow key={submission.id} className="border-white/10">
                                            <TableCell className="text-white font-medium">
                                                {submission.assignment?.title || "Ödev"}
                                            </TableCell>
                                            <TableCell className="text-gray-400">
                                                {submission.courseTitle || "-"}
                                            </TableCell>
                                            <TableCell className="text-white">
                                                {typeof submission.score === "number" ? submission.score : "-"}
                                            </TableCell>
                                            <TableCell className="text-gray-400">
                                                {submission.submittedAt
                                                    ? new Date(submission.submittedAt).toLocaleString("tr-TR")
                                                    : "-"}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
