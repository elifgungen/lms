"use client"

import { useEffect, useState } from "react"
import { coursesService } from "@/lib/services/courses"
import { examsService } from "@/lib/services/exams"
import { Course, Exam } from "@/types/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Link from "next/link"
import { BookOpen, GraduationCap, Eye } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function GuestDashboard() {
    const [courses, setCourses] = useState<Course[]>([])
    const [exams, setExams] = useState<Exam[]>([])
    const [loading, setLoading] = useState(true)
    const { t } = useTranslation()

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [coursesData, examsData] = await Promise.all([
                    coursesService.getAll(),
                    examsService.getAll()
                ])
                setCourses(coursesData.slice(0, 4))
                setExams(examsData.slice(0, 4))
            } catch (err) {
                console.error("Failed to load dashboard data", err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    if (loading) return <div>Loading...</div>

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t('guest_portal')}</h1>
                <p className="text-muted-foreground">{t('read_only_mode')}</p>
            </div>

            <Alert>
                <Eye className="h-4 w-4" />
                <AlertTitle>{t('read_only_mode')}</AlertTitle>
                <AlertDescription>
                    {t('guest_welcome')}
                </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('courses')}</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{courses.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('exams')}</CardTitle>
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{exams.length}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('courses')}</CardTitle>
                        <CardDescription>Browse available courses</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        {courses.length === 0 && <p className="text-muted-foreground">No courses available.</p>}
                        {courses.map(course => (
                            <Link key={course.id} href={`/guest/courses/${course.id}`} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent">
                                <BookOpen className="h-5 w-5 text-primary" />
                                <div>
                                    <div className="font-medium">{course.title}</div>
                                    <div className="text-sm text-muted-foreground">{course.description?.slice(0, 50) || "No description"}</div>
                                </div>
                            </Link>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('exams')}</CardTitle>
                        <CardDescription>View available exams</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        {exams.length === 0 && <p className="text-muted-foreground">No exams available.</p>}
                        {exams.map(exam => (
                            <div key={exam.id} className="flex items-center gap-3 p-3 rounded-lg border">
                                <GraduationCap className="h-5 w-5 text-primary" />
                                <div className="flex-1">
                                    <div className="font-medium">{exam.title}</div>
                                    <div className="text-sm text-muted-foreground">{exam.durationMinutes || 0} mins</div>
                                </div>
                                <span className="text-xs text-muted-foreground">(View only)</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
