"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api/client"
import { Video, Play, Users, Clock, Trash2 } from "lucide-react"
import JitsiMeet from "@/components/JitsiMeet"
import { useAuth } from "@/lib/hooks/useAuth"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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

export default function AdminLiveClassesPage() {
    const [liveClasses, setLiveClasses] = useState<LiveClass[]>([])
    const [loading, setLoading] = useState(true)
    const [activeClass, setActiveClass] = useState<LiveClass | null>(null)
    const { user } = useAuth()

    useEffect(() => {
        fetchLiveClasses()
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

    const deleteLiveClass = async (id: string) => {
        if (!confirm("Bu canlı dersi silmek istediğinizden emin misiniz?")) return
        try {
            await apiClient.delete(`/live-classes/${id}`)
            setLiveClasses(prev => prev.filter(lc => lc.id !== id))
        } catch (err) {
            console.error("Failed to delete live class", err)
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
                        <p className="text-gray-600 dark:text-gray-400">Canlı ders izleniyor</p>
                    </div>
                    <Button
                        variant="destructive"
                        onClick={() => setActiveClass(null)}
                    >
                        Dersten Ayrıl
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
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Canlı Dersler</h1>
                <p className="text-gray-600 dark:text-gray-400">Tüm canlı dersleri görüntüleyin ve yönetin</p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Toplam Canlı Ders</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{liveClasses.length}</div>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Aktif Dersler</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {liveClasses.filter(lc => lc.isActive).length}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Planlanmış</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                            {liveClasses.filter(lc => lc.scheduledAt && !lc.isActive).length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Live Classes List */}
            <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
                <CardHeader>
                    <CardTitle className="text-gray-900 dark:text-white">Tüm Canlı Dersler</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400">
                        Sistem genelindeki canlı dersleri görüntüleyin
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {liveClasses.length === 0 ? (
                        <div className="text-center py-12">
                            <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 dark:text-gray-400">Henüz canlı ders oluşturulmamış</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {liveClasses.map(lc => (
                                <div
                                    key={lc.id}
                                    className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors border border-gray-200 dark:border-white/10"
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
                                            <span>Eğitmen: {lc.createdBy?.name || '-'}</span>
                                            {lc.course && <span>Ders: {lc.course.title}</span>}
                                            {lc.scheduledAt && (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(lc.scheduledAt).toLocaleString('tr-TR')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {lc.isActive && (
                                        <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
                                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></span>
                                            Canlı
                                        </Badge>
                                    )}
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setActiveClass(lc)}
                                        >
                                            <Play className="h-4 w-4 mr-1" />
                                            İzle
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => toggleLiveClass(lc.id)}
                                        >
                                            {lc.isActive ? 'Durdur' : 'Başlat'}
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => deleteLiveClass(lc.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
