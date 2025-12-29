"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { examsService } from "@/lib/services/exams"
import { Exam } from "@/lib/mockData"
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
import { Plus, Search } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"

export default function ExamsPage() {
    const [exams, setExams] = useState<Exam[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [loading, setLoading] = useState(true)
    const { t } = useTranslation()

    useEffect(() => {
        const fetchExams = async () => {
            const data = await examsService.getAll()
            setExams(data)
            setLoading(false)
        }
        fetchExams()
    }, [])

    const filteredExams = exams.filter(exam =>
        exam.title.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'published': return 'default';
            case 'draft': return 'secondary';
            case 'archived': return 'destructive';
            default: return 'outline';
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">{t('exams')}</h1>
                <Button asChild>
                    <Link href="/app/exams/new">
                        <Plus className="mr-2 h-4 w-4" /> {t('create_exam')}
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>{t('exams')}</CardTitle>
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
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('title')}</TableHead>
                                    <TableHead>{t('status')}</TableHead>
                                    <TableHead>{t('duration')}</TableHead>
                                    <TableHead>{t('question_banks')}</TableHead>
                                    <TableHead className="text-right">{t('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!loading && filteredExams.length > 0 ? (
                                    filteredExams.map((exam) => (
                                        <TableRow key={exam.id}>
                                            <TableCell className="font-medium">
                                                <Link href={`/app/exams/${exam.id}`} className="hover:underline">
                                                    {exam.title}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(exam.status) as any}>
                                                    {exam.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{exam.durationMinutes} min</TableCell>
                                            <TableCell>{exam.questionBankIds.length}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={`/app/exams/${exam.id}`}>{t('edit')}</Link>
                                                </Button>
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={`/app/exams/${exam.id}/preview`}>Preview</Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            {loading ? "Loading..." : "No results."}
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
