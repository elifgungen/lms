"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api/client"
import { Video, Play, Plus, Clock, X } from "lucide-react"
import JitsiMeet from "@/components/JitsiMeet"
import { useAuth } from "@/lib/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface LiveClass {
    id: string
    title: string
    description?: string
    jitsiRoomId: string
    isActive: boolean
    scheduledAt?: string
    course?: { id: string; title: string }
    createdBy?: { id: string; name: string }
}

interface Course {
    id: string
    title: string
}

export default function InstructorLiveClassesPage() {
    const [liveClasses, setLiveClasses] = useState<LiveClass[]>([])
    const [courses, setCourses] = useState<Course[]>([])
    const [loading, setLoading] = useState(true)
    const [activeClass, setActiveClass] = useState<LiveClass | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [creating, setCreating] = useState(false)
    const { user } = useAuth()

    // Form state
    const [formTitle, setFormTitle] = useState("")
    const [formDescription, setFormDescription] = useState("")
    const [formCourseId, setFormCourseId] = useState("")

    useEffect(() => {
        fetchLiveClasses()
        fetchCourses()
    }, [])

    const fetchLiveClasses = async () => {
        try {
            const response = await apiClient.get("/live-classes")
            const data = response.data?.data || response.data || []
            setLiveClasses(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error("Failed to fetch live classes", err)
        } finally {
            setLoading(false)
        }
    }

    const fetchCourses = async () => {
        try {
            const response = await apiClient.get("/courses")
            const data = response.data?.data || response.data || []
            setCourses(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error("Failed to fetch courses", err)
        }
    }

    const createLiveClass = async () => {
        if (!formTitle || !formCourseId) return
        setCreating(true)
        try {
            const response = await apiClient.post("/live-classes", {
                title: formTitle,
                description: formDescription,
                courseId: formCourseId
            })
            const newClass = response.data?.data || response.data
            setLiveClasses(prev => [newClass, ...prev])
            setShowCreateModal(false)
            setFormTitle("")
            setFormDescription("")
            setFormCourseId("")
        } catch (err) {
            console.error("Failed to create live class", err)
        } finally {
            setCreating(false)
        }
    }

    const toggleLiveClass = async (id: string) => {
        try {
            const response = await apiClient.post(`/live-classes/${id}/toggle`)
            const updated = response.data?.data || response.data
            setLiveClasses(prev =>
                prev.map(lc => lc.id === id ? updated : lc)
            )
        } catch (err) {
            console.error("Failed to toggle live class", err)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            </div>
        )
    }

    if (activeClass) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{activeClass.title}</h1>
                        <p className="text-gray-600 dark:text-gray-400">Canlı ders aktif</p>
                    </div>
                    <Button
                        variant="destructive"
                        onClick={() => setActiveClass(null)}
                    >
                        Dersi Bitir
                    </Button>
                </div>
                <JitsiMeet
                    roomId={activeClass.jitsiRoomId}
                    displayName={user?.name || undefined}
                    email={user?.email || undefined}
                    height="calc(100vh - 200px)"
                    onClose={() => setActiveClass(null)}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Canlı Dersler</h1>
                    <p className="text-gray-600 dark:text-gray-400">Video konferans ile öğrencilerinizle buluşun</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-5 w-5 mr-2" />
                    Yeni Canlı Ders
                </Button>
            </div>

            {/* Quick Start */}
            <div className="rounded-2xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 p-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                        <Video className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-gray-900 dark:text-white font-semibold text-lg">Hızlı Ders Başlat</h3>
                        <p className="text-green-600 dark:text-green-400 text-sm">Hemen bir canlı ders oturumu başlatın</p>
                    </div>
                    <Button
                        onClick={() => {
                            const quickRoom = `lms-quick-${Date.now().toString(36)}`
                            setActiveClass({
                                id: 'quick',
                                title: 'Hızlı Canlı Ders',
                                jitsiRoomId: quickRoom,
                                isActive: true
                            })
                        }}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400"
                    >
                        <Play className="h-5 w-5 mr-2" />
                        Başlat
                    </Button>
                </div>
            </div>

            {/* Live Classes List */}
            <div className="rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Planlanmış Dersler</h2>

                {liveClasses.length === 0 ? (
                    <div className="text-center py-12">
                        <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">Henüz planlanmış canlı ders yok</p>
                        <p className="text-gray-500 text-sm">Yeni bir canlı ders oluşturun veya hızlı başlat kullanın</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {liveClasses.map(lc => (
                            <div
                                key={lc.id}
                                className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${lc.isActive
                                    ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                                    : 'bg-gradient-to-br from-purple-500 to-pink-500'
                                    }`}>
                                    <Video className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-gray-900 dark:text-white font-medium">{lc.title}</p>
                                    <div className="flex items-center gap-3 text-gray-500 text-sm">
                                        {lc.course && <span>{lc.course.title}</span>}
                                        {lc.scheduledAt && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {new Date(lc.scheduledAt).toLocaleString('tr-TR')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {lc.isActive && (
                                    <span className="px-3 py-1 bg-green-500/20 text-green-600 dark:text-green-400 text-sm rounded-full flex items-center gap-1">
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                        Canlı
                                    </span>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={() => setActiveClass(lc)}
                                >
                                    {lc.isActive ? 'Katıl' : 'Başlat'}
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-200 dark:border-white/10">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Yeni Canlı Ders</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-white">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="title" className="text-gray-700 dark:text-gray-300">Başlık *</Label>
                                <Input
                                    id="title"
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    placeholder="Ders başlığı..."
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label htmlFor="course" className="text-gray-700 dark:text-gray-300">Ders *</Label>
                                <select
                                    id="course"
                                    value={formCourseId}
                                    onChange={(e) => setFormCourseId(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                >
                                    <option value="">Ders seçin...</option>
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <Label htmlFor="description" className="text-gray-700 dark:text-gray-300">Açıklama</Label>
                                <Textarea
                                    id="description"
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    placeholder="Ders açıklaması..."
                                    className="mt-1"
                                    rows={3}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">
                                    İptal
                                </Button>
                                <Button onClick={createLiveClass} disabled={creating || !formTitle || !formCourseId} className="flex-1">
                                    {creating ? "Oluşturuluyor..." : "Oluştur"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
