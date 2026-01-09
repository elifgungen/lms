"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { reportsService } from "@/lib/services/reports"
import { ProctoringSession } from "@/types/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChevronLeft, Download } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/hooks/useAuth"

function getBasePath(roles: string[]): string {
    if (roles.includes("super_admin") || roles.includes("admin")) return "/admin"
    if (roles.includes("instructor") || roles.includes("assistant")) return "/instructor"
    return "/student"
}

export default function ReportDetailPage() {
    const params = useParams()
    const id = params.id as string
    const [session, setSession] = useState<ProctoringSession | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const { user } = useAuth()
    const basePath = getBasePath(user?.roles || [])

    useEffect(() => {
        if (!id) return
        const fetchSession = async () => {
            try {
                const data = await reportsService.getById(id)
                if (data) setSession(data)
            } catch {
                setError("Rapor bulunamadı")
            } finally {
                setLoading(false)
            }
        }
        fetchSession()
    }, [id])

    if (loading) return <div>Loading...</div>
    if (error) return <div className="text-destructive">{error}</div>
    if (!session) return <div>Report not found.</div>

    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session, null, 2))
        const downloadAnchorNode = document.createElement('a')
        downloadAnchorNode.setAttribute("href", dataStr)
        downloadAnchorNode.setAttribute("download", `report_${session.id}.json`)
        document.body.appendChild(downloadAnchorNode)
        downloadAnchorNode.click()
        downloadAnchorNode.remove()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 border-b pb-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`${basePath}/reports`}>
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight">Session Report: {session.studentName || "-"}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant={session.status === 'flagged' ? 'destructive' : 'outline'}>{session.status || "active"}</Badge>
                        <span className="text-sm text-muted-foreground">{session.startedAt ? new Date(session.startedAt).toLocaleString() : "-"}</span>
                    </div>
                </div>
                <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> Export JSON
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Timeline Events</CardTitle>
                        <CardDescription>Recorded anomalous behavior during the session.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative border-l border-muted ml-4 space-y-8 pb-4">
                            {session.events && session.events.length > 0 ? session.events.map((event: any) => (
                                <div key={event.id} className="relative pl-6">
                                    <div className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border bg-background ${event.severity === 'high' ? 'border-destructive' : 'border-primary'}`} />
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-semibold capitalize">{event.type ? event.type.replace(/_/g, ' ') : "-"}</span>
                                        <span className="text-xs text-muted-foreground">{event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : "-"}</span>
                                        <Badge className="w-fit" variant={event.severity === 'high' ? 'destructive' : 'secondary'}>{event.severity || "low"}</Badge>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-muted-foreground pl-6">No events recorded.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Total Flags</span>
                            <span className="text-2xl font-bold">{session.flagsCount || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Risk Level</span>
                            <span className={`text-lg font-bold ${session.flagsCount && session.flagsCount > 5 ? 'text-destructive' : 'text-green-600'}`}>
                                {session.flagsCount && session.flagsCount > 5 ? 'High' : 'Low'}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
