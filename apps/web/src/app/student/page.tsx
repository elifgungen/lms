"use client"

import { useEffect, useState } from "react"
import { coursesService } from "@/lib/services/courses"
import { examsService } from "@/lib/services/exams"
import { Course, Exam } from "@/types/api"
import Link from "next/link"
import { BookOpen, GraduationCap, Clock, Video, ClipboardList, Trophy } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"
import { useAuth } from "@/lib/hooks/useAuth"

export default function StudentDashboard() {
    const [courses, setCourses] = useState<Course[]>([])
    const [exams, setExams] = useState<Exam[]>([])
    const [loading, setLoading] = useState(true)
    const { t } = useTranslation()
    const { user } = useAuth()

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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            </div>
        )
    }

    const statsCards = [
        { title: t('enrolled_courses') || "Kayıtlı Dersler", value: courses.length, icon: BookOpen, color: "from-purple-500 to-pink-500" },
        { title: t('pending_exams') || "Bekleyen Sınavlar", value: exams.length, icon: GraduationCap, color: "from-cyan-500 to-blue-500" },
        { title: t('pending_assignments') || "Bekleyen Ödevler", value: 3, icon: ClipboardList, color: "from-orange-500 to-red-500" },
        { title: t('average') || "Ortalama", value: "85%", icon: Trophy, color: "from-green-500 to-emerald-500" },
    ]

    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-white/10 p-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/30 to-cyan-500/30 rounded-full blur-3xl" />
                <div className="relative">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {t('hello') || "Merhaba"}, {user?.name?.split(' ')[0] || 'Öğrenci'} 👋
                    </h1>
                    <p className="text-gray-400 max-w-xl">
                        {t('learning_prompt') || "Bugün öğrenmeye devam etmeye ne dersin? Derslerini ve sınavlarını buradan takip edebilirsin."}
                    </p>
                </div>
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
            <div className="grid gap-4 md:grid-cols-3">
                <Link
                    href="/student/live-classes"
                    className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 p-6 hover:from-green-500/30 hover:to-emerald-500/30 transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                            <Video className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-lg">{t('join_live_class') || "Canlı Derse Katıl"}</h3>
                            <p className="text-green-400 text-sm">{t('active_class') || "Aktif ders var!"}</p>
                        </div>
                    </div>
                </Link>

                <Link
                    href="/student/exams"
                    className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                            <GraduationCap className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-lg">{t('my_exams') || "Sınavlarım"}</h3>
                            <p className="text-gray-400 text-sm">{exams.length} {t('pending_exam_count') || "bekleyen sınav"}</p>
                        </div>
                    </div>
                </Link>

                <Link
                    href="/student/assignments"
                    className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                            <ClipboardList className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-lg">{t('my_assignments') || "Ödevlerim"}</h3>
                            <p className="text-gray-400 text-sm">3 {t('pending_assignment_count') || "bekleyen ödev"}</p>
                        </div>
                    </div>
                </Link>
            </div>

            {/* Content Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* My Courses */}
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">{t('my_courses') || "Derslerim"}</h2>
                        <Link href="/student/courses" className="text-cyan-400 text-sm hover:underline">
                            {t('view_all') || "Tümü"} →
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {courses.map(course => (
                            <Link
                                key={course.id}
                                href={`/student/courses/${course.id}`}
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
                            <p className="text-gray-500 text-center py-4">{t('no_enrolled_courses') || "Henüz kayıtlı ders yok"}</p>
                        )}
                    </div>
                </div>

                {/* Upcoming Exams */}
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">{t('upcoming_exams') || "Yaklaşan Sınavlar"}</h2>
                        <Link href="/student/exams" className="text-cyan-400 text-sm hover:underline">
                            {t('view_all') || "Tümü"} →
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {exams.map(exam => (
                            <Link
                                key={exam.id}
                                href={`/student/exams/${exam.id}`}
                                className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                                    <GraduationCap className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium truncate">{exam.title}</p>
                                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                                        <Clock className="h-3 w-3" />
                                        <span>{exam.durationMinutes || 0} {t('minutes') || "dakika"}</span>
                                    </div>
                                </div>
                                {(exam as any).sebEnabled && (
                                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">{t('seb_required') || "SEB Gerekli"}</span>
                                )}
                            </Link>
                        ))}
                        {exams.length === 0 && (
                            <p className="text-gray-500 text-center py-4">{t('no_pending_exams') || "Bekleyen sınav yok"}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
