"use client"

import { useEffect, useState } from "react"
import { gradebookService } from "@/lib/services/gradebook"
import { Attempt } from "@/types/api"
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
import { Search, FileText } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"

export default function StudentGradebookPage() {
    const [attempts, setAttempts] = useState<Attempt[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const { t } = useTranslation()

    useEffect(() => {
        const fetchAttempts = async () => {
            try {
                const data = await gradebookService.getAll()
                setAttempts(data)
            } catch {
                setError("Failed to load grades")
            } finally {
                setLoading(false)
            }
        }
        fetchAttempts()
    }, [])

    const filtered = attempts.filter(a =>
        (a.studentName || "").toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold tracking-tight">{t('gradebook')}</h1>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>My Grades</CardTitle>
                    <CardDescription>
                        View your exam attempts and scores.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center py-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('search_attempts')}
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
                                    <TableHead>Exam</TableHead>
                                    <TableHead>{t('score')}</TableHead>
                                    <TableHead>{t('status')}</TableHead>
                                    <TableHead>{t('submitted_at')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!loading && filtered.map((attempt) => (
                                    <TableRow key={attempt.id}>
                                        <TableCell className="font-medium">{attempt.examId}</TableCell>
                                        <TableCell>{attempt.score ?? 0} / {attempt.totalPoints ?? 0}</TableCell>
                                        <TableCell>
                                            <Badge variant={attempt.status === 'submitted' ? 'default' : 'secondary'}>
                                                {attempt.status || "in-progress"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : '-'}</TableCell>
                                    </TableRow>
                                ))}
                                {(loading || filtered.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            {loading ? "Loading..." : "No attempts found."}
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
