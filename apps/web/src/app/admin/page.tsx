"use client"

import { useEffect, useState } from "react"
import { coursesService } from "@/lib/services/courses"
import { examsService } from "@/lib/services/exams"
import { Course, Exam } from "@/types/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BookOpen, GraduationCap, Users, Settings } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"

export default function AdminDashboard() {
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
                setCourses(coursesData)
                setExams(examsData)
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
                <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
                <p className="text-muted-foreground">System overview and management.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{courses.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{exams.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">SEB Exams</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{exams.filter((e: any) => e.sebEnabled).length}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Common admin tasks</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        <Button asChild variant="outline" className="justify-start">
                            <Link href="/admin/courses">
                                <BookOpen className="mr-2 h-4 w-4" /> Manage Courses
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="justify-start">
                            <Link href="/admin/exams">
                                <GraduationCap className="mr-2 h-4 w-4" /> Manage Exams
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="justify-start">
                            <Link href="/admin/users">
                                <Users className="mr-2 h-4 w-4" /> Manage Users
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="justify-start">
                            <Link href="/admin/settings">
                                <Settings className="mr-2 h-4 w-4" /> System Settings
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Latest system events</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        <p className="text-muted-foreground">Activity log will appear here.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
