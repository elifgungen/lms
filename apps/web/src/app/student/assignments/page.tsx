"use client"

import { useEffect, useState } from "react"
import { assignmentsService, Assignment } from "@/lib/services/assignments"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, FileText, Calendar, CheckCircle, Clock } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"

export default function StudentAssignmentsPage() {
    const [assignments, setAssignments] = useState<Assignment[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const { t } = useTranslation()

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await assignmentsService.getAll()
                setAssignments(data)
            } catch {
                setError("Failed to load assignments")
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const filtered = assignments.filter(a =>
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.course?.title || "").toLowerCase().includes(searchTerm.toLowerCase())
    )

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "-"
        return new Date(dateStr).toLocaleDateString("tr-TR")
    }

    const isPastDue = (dateStr?: string) => {
        if (!dateStr) return false
        return new Date(dateStr) < new Date()
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold tracking-tight">{t('my_assignments') || "Ödevlerim"}</h1>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>{t('assignments') || "Ödevler"}</CardTitle>
                    <CardDescription>
                        {t('assignments_list_desc') || "Derslerinize ait ödevleri görüntüleyin ve teslim edin."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center py-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('search_assignments_placeholder') || "Ödev veya ders ara..."}
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
                                    <TableHead>{t('assignment') || "Ödev"}</TableHead>
                                    <TableHead>{t('course') || "Ders"}</TableHead>
                                    <TableHead>{t('due_date') || "Teslim Tarihi"}</TableHead>
                                    <TableHead>{t('status') || "Durum"}</TableHead>
                                    <TableHead>{t('actions') || "İşlem"}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!loading && filtered.map((assignment) => (
                                    <TableRow key={assignment.id}>
                                        <TableCell className="font-medium">{assignment.title}</TableCell>
                                        <TableCell>{assignment.course?.title || "-"}</TableCell>
                                        <TableCell>
                                            <div className={`flex items-center gap-1 ${isPastDue(assignment.dueDate) ? "text-destructive" : ""}`}>
                                                <Calendar className="h-3 w-3" />
                                                {formatDate(assignment.dueDate)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                <Clock className="h-3 w-3 mr-1" />
                                                {t('status_pending') || "Bekliyor"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/student/assignments/${assignment.id}`}>
                                                    {t('view') || "Görüntüle"}
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(loading || filtered.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            {loading ? (t('loading') || "Yükleniyor...") : (t('no_assignments') || "Ödev bulunamadı.")}
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
