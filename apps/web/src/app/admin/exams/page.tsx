"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { examsService } from "@/lib/services/exams"
import { Exam } from "@/types/api"
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
import { Plus, Search, Shield } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"

export default function AdminExamsPage() {
    const [exams, setExams] = useState<Exam[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const { t } = useTranslation()

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const data = await examsService.getAll()
                setExams(data)
            } catch {
                setError("Sınavlar yüklenemedi")
            } finally {
                setLoading(false)
            }
        }
        fetchExams()
    }, [])

    const filteredExams = exams.filter(exam =>
        (exam.title || "").toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getStatusVariant = (status?: string) => {
        switch (status) {
            case 'published': return 'default'
            case 'draft': return 'secondary'
            case 'archived': return 'destructive'
            default: return 'outline'
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">{t('exams')}</h1>
                <Button asChild>
                    <Link href="/admin/exams/new">
                        <Plus className="mr-2 h-4 w-4" /> {t('create_exam')}
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>All Exams</CardTitle>
                    <CardDescription>
                        {t('manage_exams_desc')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center py-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('search_exams')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                    {error && <p className="text-sm text-destructive mb-2">{error}</p>}
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('title')}</TableHead>
                                    <TableHead>{t('status')}</TableHead>
                                    <TableHead>{t('duration')}</TableHead>
                                    <TableHead>Security</TableHead>
                                    <TableHead className="text-right">{t('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!loading && filteredExams.length > 0 ? (
                                    filteredExams.map((exam) => {
                                        const isSebEnabled = (exam as any).sebEnabled === true
                                        return (
                                            <TableRow key={exam.id}>
                                                <TableCell className="font-medium">
                                                    <Link href={`/admin/exams/${exam.id}`} className="hover:underline">
                                                        {exam.title}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={getStatusVariant(exam.status) as any}>
                                                        {exam.status || "draft"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{exam.durationMinutes ? `${exam.durationMinutes} min` : "-"}</TableCell>
                                                <TableCell>
                                                    {isSebEnabled ? (
                                                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                                            <Shield className="h-3 w-3" /> SEB
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground">Standard</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <Link href={`/admin/exams/${exam.id}`}>{t('edit')}</Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            {loading ? "Loading..." : "No exams found."}
                                        </TableCell>
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
