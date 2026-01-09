"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { coursesService } from "@/lib/services/courses"
import { apiClient } from "@/lib/api/client"
import { Course } from "@/types/api"
import { Button } from "@/components/ui/button"
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
import { Plus, Search, UserPlus, Users, X } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"

interface Instructor {
    id: string
    name: string
    email: string
}

interface CourseWithInstructor extends Course {
    createdBy?: { id: string; name: string; email: string }
}

export default function AdminCoursesPage() {
    const [courses, setCourses] = useState<CourseWithInstructor[]>([])
    const [instructors, setInstructors] = useState<Instructor[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [selectedCourse, setSelectedCourse] = useState<CourseWithInstructor | null>(null)
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [assigning, setAssigning] = useState(false)
    const { t } = useTranslation()

    useEffect(() => {
        fetchCourses()
        fetchInstructors()
    }, [])

    const fetchCourses = async () => {
        try {
            const response = await apiClient.get("/courses")
            const data = response.data?.data || response.data || []
            setCourses(Array.isArray(data) ? data : [])
        } catch {
            setError("Kurslar yüklenemedi")
        } finally {
            setLoading(false)
        }
    }

    const fetchInstructors = async () => {
        try {
            const response = await apiClient.get("/users?role=instructor")
            const data = response.data?.data || response.data || []
            setInstructors(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error("Failed to fetch instructors", err)
        }
    }

    const assignInstructor = async (instructorId: string) => {
        if (!selectedCourse) return
        setAssigning(true)
        try {
            const response = await apiClient.patch(`/courses/${selectedCourse.id}/instructor`, {
                instructorId
            })
            const updated = response.data?.data || response.data
            setCourses(prev => prev.map(c => c.id === updated.id ? updated : c))
            setShowAssignModal(false)
        } catch (err) {
            console.error("Failed to assign instructor", err)
        } finally {
            setAssigning(false)
        }
    }

    const filteredCourses = courses.filter(course =>
        (course.title || "").toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getStatusVariant = (status?: string) => {
        switch (status) {
            case 'published': return 'default'
            case 'draft': return 'secondary'
            case 'archived': return 'destructive'
            default: return 'outline'
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{t('courses')}</h1>
                <Button asChild>
                    <Link href="/admin/courses/new">
                        <Plus className="mr-2 h-4 w-4" /> {t('create_course')}
                    </Link>
                </Button>
            </div>

            <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
                <CardHeader className="pb-3">
                    <CardTitle className="text-gray-900 dark:text-white">{t('all_courses')}</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400">
                        {t('manage_courses_desc')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center py-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder={t('search_placeholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                    {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
                    <div className="rounded-md border border-gray-200 dark:border-white/10">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-gray-700 dark:text-gray-300">{t('title')}</TableHead>
                                    <TableHead className="text-gray-700 dark:text-gray-300">Eğitmen</TableHead>
                                    <TableHead className="text-gray-700 dark:text-gray-300">{t('status')}</TableHead>
                                    <TableHead className="text-gray-700 dark:text-gray-300">{t('created_at')}</TableHead>
                                    <TableHead className="text-right text-gray-700 dark:text-gray-300">{t('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!loading && filteredCourses.length > 0 ? (
                                    filteredCourses.map((course) => (
                                        <TableRow key={course.id}>
                                            <TableCell className="font-medium text-gray-900 dark:text-white">
                                                <Link href={`/admin/courses/${course.id}`} className="hover:underline">
                                                    {course.title}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-gray-700 dark:text-gray-300">
                                                {course.createdBy?.name || (
                                                    <span className="text-gray-500">Atanmadı</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(course.status) as any}>
                                                    {course.status || "active"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-gray-700 dark:text-gray-300">
                                                {course.createdAt ? new Date(course.createdAt).toLocaleDateString() : "-"}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedCourse(course)
                                                        setShowAssignModal(true)
                                                    }}
                                                >
                                                    <UserPlus className="h-4 w-4 mr-1" />
                                                    Eğitmen Ata
                                                </Button>
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={`/admin/courses/${course.id}`}>{t('edit')}</Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                                            {loading ? "Yükleniyor..." : "Sonuç bulunamadı."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Instructor Assignment Modal */}
            {showAssignModal && selectedCourse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-200 dark:border-white/10">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Eğitmen Ata</h2>
                                <p className="text-sm text-gray-500">{selectedCourse.title}</p>
                            </div>
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {instructors.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">Eğitmen bulunamadı</p>
                            ) : (
                                instructors.map(instructor => (
                                    <button
                                        key={instructor.id}
                                        onClick={() => assignInstructor(instructor.id)}
                                        disabled={assigning}
                                        className={`w-full p-4 rounded-xl border text-left transition-all hover:border-cyan-500 hover:bg-cyan-500/10 ${selectedCourse.createdBy?.id === instructor.id
                                                ? "border-cyan-500 bg-cyan-500/20"
                                                : "border-gray-200 dark:border-white/10"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center text-white font-semibold">
                                                {instructor.name?.charAt(0) || "?"}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {instructor.name}
                                                    {selectedCourse.createdBy?.id === instructor.id && (
                                                        <Badge className="ml-2 bg-cyan-500/20 text-cyan-600">Mevcut</Badge>
                                                    )}
                                                </p>
                                                <p className="text-sm text-gray-500">{instructor.email}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="mt-4">
                            <Button variant="outline" onClick={() => setShowAssignModal(false)} className="w-full">
                                İptal
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
