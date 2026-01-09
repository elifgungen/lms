"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api/client"
import { Video, Users, Clock } from "lucide-react"
import JitsiMeet from "@/components/JitsiMeet"
import { useAuth } from "@/lib/hooks/useAuth"

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

export default function StudentLiveClassesPage() {
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
            // API returns array directly, now pre-filtered for students (only active)
            const data = response.data?.data || response.data || []
            setLiveClasses(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error("Failed to fetch live classes", err)
        } finally {
            setLoading(false)
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
                        <h1 className="text-2xl font-bold text-white">{activeClass.title}</h1>
                        <p className="text-gray-400">
                            Eğitmen: {activeClass.createdBy?.name || 'Bilinmiyor'}
                        </p>
                    </div>
                    <button
                        onClick={() => setActiveClass(null)}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                        Dersten Ayrıl
                    </button>
                </div>
                <JitsiMeet
                    roomId={activeClass.jitsiRoomId}
                    displayName={user?.name}
                    email={user?.email}
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
                <h1 className="text-2xl font-bold text-white">Canlı Dersler</h1>
                <p className="text-gray-400">Aktif canlı derslere katılın</p>
            </div>

            {/* Active Classes */}
            {liveClasses.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                    {liveClasses.map(lc => (
                        <div
                            key={lc.id}
                            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 p-6"
                        >
                            <div className="absolute top-4 right-4">
                                <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                    Canlı
                                </span>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                                    <Video className="h-7 w-7 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-semibold text-lg truncate">{lc.title}</h3>
                                    <p className="text-gray-400 text-sm mt-1">
                                        Eğitmen: {lc.createdBy?.name || 'Bilinmiyor'}
                                    </p>
                                    {lc.course && (
                                        <p className="text-gray-500 text-sm">
                                            Ders: {lc.course.title}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => setActiveClass(lc)}
                                className="w-full mt-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-xl hover:from-green-400 hover:to-emerald-400 transition-all flex items-center justify-center gap-2"
                            >
                                <Video className="h-5 w-5" />
                                Derse Katıl
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-2xl bg-white/5 border border-white/10 p-12 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Video className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Aktif Canlı Ders Yok</h3>
                    <p className="text-gray-400 max-w-md mx-auto">
                        Şu anda aktif bir canlı ders bulunmuyor. Eğitmeniniz bir ders başlattığında burada görünecektir.
                    </p>
                </div>
            )}

            {/* Schedule Info */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Bilgi</h2>
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                            <Video className="h-5 w-5 text-cyan-400" />
                        </div>
                        <div>
                            <p className="text-white font-medium">Jitsi Meet</p>
                            <p className="text-gray-500 text-sm">Ücretsiz video konferans</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                            <Users className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-white font-medium">Sınırsız Katılımcı</p>
                            <p className="text-gray-500 text-sm">Tüm sınıf katılabilir</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                            <Clock className="h-5 w-5 text-green-400" />
                        </div>
                        <div>
                            <p className="text-white font-medium">Süre Sınırı Yok</p>
                            <p className="text-gray-500 text-sm">İstediğiniz kadar kalın</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
