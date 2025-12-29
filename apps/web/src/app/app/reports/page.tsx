"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { reportsService } from "@/lib/services/reports"
import { ProctoringSession } from "@/lib/mockData"
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
import { Search } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"

export default function ReportsPage() {
    const [sessions, setSessions] = useState<ProctoringSession[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const { t } = useTranslation()

    useEffect(() => {
        reportsService.getAll().then(setSessions)
    }, [])

    const filtered = sessions.filter(s =>
        s.studentName.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'flagged': return 'destructive';
            case 'completed': return 'default';
            case 'active': return 'secondary';
            default: return 'outline';
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">{t('reports')}</h1>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>{t('reports')}</CardTitle>
                    <CardDescription>
                        Monitor proctoring sessions and review flagged events.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center py-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('search_reports')}
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
                                    <TableHead>{t('student_name')}</TableHead>
                                    <TableHead>{t('session_status')}</TableHead>
                                    <TableHead>{t('flags_count')}</TableHead>
                                    <TableHead className="text-right">{t('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((session) => (
                                    <TableRow key={session.id}>
                                        <TableCell className="font-medium">{session.studentName}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusColor(session.status) as any}>
                                                {session.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={session.flagsCount > 0 ? "text-destructive font-bold" : ""}>
                                            {session.flagsCount}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/app/reports/${session.id}`}>{t('view_report')}</Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">No reports found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
