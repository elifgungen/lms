"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, Camera, AlertTriangle, CheckCircle, Clock, Users } from "lucide-react"
import { apiClient } from "@/lib/api/client"
import { useTranslation } from "@/i18n/LanguageContext"

interface ProctoringSession {
    id: string
    status: string | null
    startedAt: string
    endedAt: string | null
    attempt: {
        id: string
        exam: { id: string; title: string }
        user: { id: string; name: string; email: string }
    }
    events: { id: string; eventType: string; createdAt: string }[]
}

export default function ProctoringDashboardPage() {
    const [sessions, setSessions] = useState<ProctoringSession[]>([])
    const [loading, setLoading] = useState(true)
    const { locale } = useTranslation()

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const res = await apiClient.get("/proctoring/sessions")
                setSessions(res.data?.data || [])
            } catch (err) {
                console.error("Failed to fetch proctoring sessions:", err)
            } finally {
                setLoading(false)
            }
        }
        fetchSessions()
    }, [])

    // Stats
    const activeSessions = sessions.filter(s => s.status === "active" || !s.endedAt).length
    const completedSessions = sessions.filter(s => s.endedAt).length
    const totalEvents = sessions.reduce((sum, s) => sum + (s.events?.length || 0), 0)

    const getEventBadge = (eventType: string) => {
        if (eventType.includes("violation") || eventType.includes("alert")) {
            return <Badge variant="destructive">{eventType}</Badge>
        }
        if (eventType.includes("snapshot") || eventType.includes("capture")) {
            return <Badge variant="outline">{eventType}</Badge>
        }
        return <Badge variant="secondary">{eventType}</Badge>
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    {locale === "tr" ? "Gözetleme Paneli" : "Proctoring Dashboard"}
                </h1>
                <p className="text-muted-foreground">
                    {locale === "tr"
                        ? "Sınav gözetleme oturumlarını ve olayları izleyin"
                        : "Monitor exam proctoring sessions and events"}
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {locale === "tr" ? "Aktif Oturumlar" : "Active Sessions"}
                        </CardTitle>
                        <Camera className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeSessions}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {locale === "tr" ? "Tamamlanan" : "Completed"}
                        </CardTitle>
                        <CheckCircle className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{completedSessions}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {locale === "tr" ? "Toplam Olaylar" : "Total Events"}
                        </CardTitle>
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalEvents}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {locale === "tr" ? "Toplam Oturum" : "Total Sessions"}
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{sessions.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Sessions Table */}
            <Card>
                <CardHeader>
                    <CardTitle>{locale === "tr" ? "Gözetleme Oturumları" : "Proctoring Sessions"}</CardTitle>
                    <CardDescription>
                        {locale === "tr"
                            ? "Tüm sınav gözetleme kayıtları"
                            : "All exam proctoring records"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{locale === "tr" ? "Öğrenci" : "Student"}</TableHead>
                                <TableHead>{locale === "tr" ? "Sınav" : "Exam"}</TableHead>
                                <TableHead>{locale === "tr" ? "Durum" : "Status"}</TableHead>
                                <TableHead>{locale === "tr" ? "Olaylar" : "Events"}</TableHead>
                                <TableHead>{locale === "tr" ? "Başlangıç" : "Started"}</TableHead>
                                <TableHead>{locale === "tr" ? "İşlemler" : "Actions"}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">
                                        <Clock className="h-5 w-5 animate-spin mx-auto mb-2" />
                                        {locale === "tr" ? "Yükleniyor..." : "Loading..."}
                                    </TableCell>
                                </TableRow>
                            ) : sessions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                        {locale === "tr" ? "Henüz gözetleme oturumu yok." : "No proctoring sessions yet."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sessions.map((session) => (
                                    <TableRow key={session.id}>
                                        <TableCell className="font-medium">
                                            <div>{session.attempt?.user?.name || "-"}</div>
                                            <div className="text-xs text-muted-foreground">{session.attempt?.user?.email}</div>
                                        </TableCell>
                                        <TableCell>{session.attempt?.exam?.title || "-"}</TableCell>
                                        <TableCell>
                                            <Badge variant={session.endedAt ? "secondary" : "default"}>
                                                {session.endedAt
                                                    ? (locale === "tr" ? "Tamamlandı" : "Completed")
                                                    : (locale === "tr" ? "Aktif" : "Active")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {(session.events || []).slice(0, 3).map((event) => (
                                                    getEventBadge(event.eventType)
                                                ))}
                                                {(session.events?.length || 0) > 3 && (
                                                    <Badge variant="outline">+{session.events.length - 3}</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(session.startedAt).toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm">
                                                <Eye className="h-4 w-4 mr-1" />
                                                {locale === "tr" ? "Detay" : "View"}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
