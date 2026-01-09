"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { coursesService } from "@/lib/services/courses"
import { Course } from "@/types/api"
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
import { Search, BookOpen } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"

export default function StudentCoursesPage() {
    const [allCourses, setAllCourses] = useState<Course[]>([])
    const [myCourses, setMyCourses] = useState<Course[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [loading, setLoading] = useState(true)
    const [joiningId, setJoiningId] = useState("")
    const [error, setError] = useState("")
    const { t } = useTranslation()

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const [all, mine] = await Promise.all([
                    coursesService.getAll(),
                    coursesService.getMine()
                ])
                setAllCourses(all)
                setMyCourses(mine)
            } catch {
                setError("Dersler yüklenemedi")
            } finally {
                setLoading(false)
            }
        }
        fetchCourses()
    }, [])

    const filteredAll = allCourses.filter(course =>
        (course.title || "").toLowerCase().includes(searchTerm.toLowerCase())
    )

    const isEnrolled = (courseId: string) => myCourses.some(c => c.id === courseId)

    const handleEnroll = async (courseId: string) => {
        setJoiningId(courseId)
        setError("")
        try {
            const course = await coursesService.enroll(courseId)
            // Avoid duplicates
            setMyCourses(prev => (prev.find(c => c.id === course.id) ? prev : [...prev, course]))
        } catch (err: any) {
            const message = err?.response?.data?.error || "Kursa katılım başarısız"
            setError(message)
        } finally {
            setJoiningId("")
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-primary" />
                    <h1 className="text-2xl font-bold tracking-tight">{t('courses')}</h1>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Kayıtlı Derslerim</CardTitle>
                    <CardDescription>
                        Şu an kayıtlı olduğun dersler.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('title')}</TableHead>
                                    <TableHead>{t('status')}</TableHead>
                                    <TableHead>{t('created_at')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!loading && myCourses.map((course) => (
                                    <TableRow key={course.id}>
                                        <TableCell className="font-medium">
                                            <Link href={`/student/courses/${course.id}`} className="hover:underline">
                                                {course.title}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                                                {course.status || "published"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{course.createdAt ? new Date(course.createdAt).toLocaleDateString() : "-"}</TableCell>
                                    </TableRow>
                                ))}
                                {(loading || myCourses.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
                                            {loading ? "Loading..." : "Henüz kayıtlı ders yok."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Ders Kataloğu</CardTitle>
                    <CardDescription>
                        Mevcut dersleri incele ve kayıt ol.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center py-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('search_placeholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('title')}</TableHead>
                                    <TableHead>{t('status')}</TableHead>
                                    <TableHead className="text-right">İşlem</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!loading && filteredAll.map((course) => {
                                    const enrolled = isEnrolled(course.id)
                                    return (
                                        <TableRow key={course.id}>
                                            <TableCell className="font-medium">
                                                <Link href={`/student/courses/${course.id}`} className="hover:underline">
                                                    {course.title}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                                                    {course.status || "published"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {enrolled ? (
                                                    <Badge variant="outline">Kayıtlı</Badge>
                                                ) : (
                                                    <button
                                                        className="text-primary hover:underline disabled:opacity-50"
                                                        disabled={joiningId === course.id}
                                                        onClick={() => handleEnroll(course.id)}
                                                    >
                                                        {joiningId === course.id ? "Kaydediliyor..." : "Kayıt Ol"}
                                                    </button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                                {(loading || filteredAll.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
                                            {loading ? "Loading..." : "Ders bulunamadı."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {error && <p className="text-sm text-destructive mt-2">{error}</p>}
                </CardContent>
            </Card>
        </div>
    )
}
