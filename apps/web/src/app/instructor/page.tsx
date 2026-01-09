"use client"

import { useEffect, useState } from "react"
import { coursesService } from "@/lib/services/courses"
import { examsService } from "@/lib/services/exams"
import { Course, Exam } from "@/types/api"
import Link from "next/link"
import { BookOpen, GraduationCap, Users, Plus, Video, ClipboardList, BarChart } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"

export default function InstructorDashboard() {
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            </div>
        )
    }

    const statsCards = [
        { title: t('total_courses') || "Toplam Ders", value: courses.length, icon: BookOpen, color: "from-purple-500 to-pink-500" },
        { title: t('total_exams') || "Toplam Sınav", value: exams.length, icon: GraduationCap, color: "from-cyan-500 to-blue-500" },
        { title: t('seb_exams') || "SEB Sınavları", value: exams.filter((e: any) => e.sebEnabled).length, icon: Users, color: "from-green-500 to-emerald-500" },
        { title: t('active_students') || "Aktif Öğrenci", value: 42, icon: BarChart, color: "from-orange-500 to-red-500" },
    ]

    const quickActions = [
        { title: t('new_course') || "Yeni Ders", href: "/instructor/courses/new", icon: BookOpen, color: "from-purple-500 to-pink-500" },
        { title: t('new_exam') || "Yeni Sınav", href: "/instructor/exams/new", icon: GraduationCap, color: "from-cyan-500 to-blue-500" },
        { title: t('start_live_class') || "Canlı Ders Başlat", href: "/instructor/live-classes", icon: Video, color: "from-green-500 to-emerald-500" },
        { title: t('create_assignment') || "Ödev Oluştur", href: "/instructor/assignments/new", icon: ClipboardList, color: "from-orange-500 to-yellow-500" },
    ]

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">{t('welcome_back') || "Hoş Geldiniz"} 👋</h1>
                <p className="text-gray-400">{t('instructor_welcome') || "Derslerinizi, sınavlarınızı ve öğrenci ilerlemesini yönetin."}</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statsCards.map((stat, index) => (
                    <div
                        key={index}
                        className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-xl"
                    >
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-20 blur-2xl`} />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">{stat.title}</p>
                                <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                            </div>
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                                <stat.icon className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-xl font-semibold text-white mb-4">{t('quick_actions') || "Hızlı İşlemler"}</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {quickActions.map((action, index) => (
                        <Link
                            key={index}
                            href={action.href}
                            className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-xl hover:bg-white/10 transition-all duration-300"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4`}>
                                <action.icon className="h-6 w-6 text-white" />
                            </div>
                            <h3 className="text-white font-medium group-hover:text-cyan-400 transition-colors">{action.title}</h3>
                            <div className="flex items-center gap-1 text-gray-500 text-sm mt-2 group-hover:text-gray-400">
                                <Plus className="h-4 w-4" />
                                <span>{t('create') || "Oluştur"}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Recent Items Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Recent Courses */}
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">{t('recent_courses') || "Son Dersler"}</h2>
                        <Link href="/instructor/courses" className="text-cyan-400 text-sm hover:underline">
                            {t('view_all') || "Tümü"} →
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {courses.slice(0, 4).map(course => (
                            <Link
                                key={course.id}
                                href={`/instructor/courses/${course.id}`}
                                className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                    <BookOpen className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium truncate">{course.title}</p>
                                    <p className="text-gray-500 text-sm truncate">{course.description || t('no_description') || 'Açıklama yok'}</p>
                                </div>
                            </Link>
                        ))}
                        {courses.length === 0 && (
                            <p className="text-gray-500 text-center py-4">{t('no_courses_yet') || "Henüz ders yok"}</p>
                        )}
                    </div>
                </div>

                {/* Recent Exams */}
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">{t('recent_exams') || "Son Sınavlar"}</h2>
                        <Link href="/instructor/exams" className="text-cyan-400 text-sm hover:underline">
                            {t('view_all') || "Tümü"} →
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {exams.slice(0, 4).map(exam => (
                            <Link
                                key={exam.id}
                                href={`/instructor/exams/${exam.id}`}
                                className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                                    <GraduationCap className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium truncate">{exam.title}</p>
                                    <p className="text-gray-500 text-sm">{exam.durationMinutes || 0} {t('minutes') || "dakika"}</p>
                                </div>
                                {(exam as any).sebEnabled && (
                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">SEB</span>
                                )}
                            </Link>
                        ))}
                        {exams.length === 0 && (
                            <p className="text-gray-500 text-center py-4">{t('no_exams_yet') || "Henüz sınav yok"}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
