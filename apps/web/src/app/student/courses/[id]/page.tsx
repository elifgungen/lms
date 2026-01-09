"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { coursesService } from "@/lib/services/courses"
import { Course } from "@/types/api"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft, BookOpen } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function StudentCourseDetailPage() {
    const params = useParams()
    const id = params.id as string
    const [course, setCourse] = useState<Course | null>(null)
    const [error, setError] = useState("")
    const { t } = useTranslation()

    useEffect(() => {
        if (!id) return
        const fetchCourse = async () => {
            try {
                const data = await coursesService.getById(id)
                if (data) setCourse(data)
            } catch {
                setError("Kurs bulunamadı")
            }
        }
        fetchCourse()
    }, [id])

    if (error) return <div className="text-destructive">{error}</div>
    if (!course) return <div>Loading...</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/student/courses">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex items-center gap-3">
                    <BookOpen className="h-6 w-6 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
                        <p className="text-muted-foreground">{course.description || "No description provided."}</p>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="content">{t('contents')}</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                    <Card>
                        <CardHeader>
                            <CardTitle>Course Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                {course.description || "Welcome to this course. Content will be available soon."}
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="content">
                    <Card>
                        <CardHeader>
                            <CardTitle>Course Content</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Course modules and content will appear here.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
