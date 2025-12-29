"use client"

import { useEffect, useState } from "react"
import { gradebookService } from "@/lib/services/gradebook"
import { Attempt } from "@/lib/mockData"
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

export default function GradebookPage() {
    const [attempts, setAttempts] = useState<Attempt[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const { t } = useTranslation()

    useEffect(() => {
        gradebookService.getAll().then(setAttempts)
    }, [])

    const filtered = attempts.filter(a =>
        a.studentName.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">{t('gradebook')}</h1>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>{t('gradebook')}</CardTitle>
                    <CardDescription>
                        View student attempts and scores.
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
                                    <TableHead>{t('student_name')}</TableHead>
                                    <TableHead>{t('score')}</TableHead>
                                    <TableHead>{t('status')}</TableHead>
                                    <TableHead>{t('submitted_at')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((attempt) => (
                                    <TableRow key={attempt.id}>
                                        <TableCell className="font-medium">{attempt.studentName}</TableCell>
                                        <TableCell>{attempt.score} / {attempt.totalPoints}</TableCell>
                                        <TableCell>
                                            <Badge variant={attempt.status === 'submitted' ? 'default' : 'secondary'}>
                                                {attempt.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : '-'}</TableCell>
                                    </TableRow>
                                ))}
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">No attempts found.</TableCell>
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
