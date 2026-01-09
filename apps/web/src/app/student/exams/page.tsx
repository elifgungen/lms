"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { examsService } from "@/lib/services/exams"
import { Exam } from "@/types/api"
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
import { Search, GraduationCap, Clock, Shield } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"

export default function StudentExamsPage() {
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

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <GraduationCap className="h-6 w-6 text-primary" />
                    <h1 className="text-2xl font-bold tracking-tight">{t('exams')}</h1>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Available Exams</CardTitle>
                    <CardDescription>
                        View available exams and start when ready.
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
                                    <TableHead>Security</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!loading && filteredExams.map((exam) => {
                                    const isSebEnabled = (exam as any).sebEnabled === true
                                    return (
                                        <TableRow key={exam.id}>
                                            <TableCell className="font-medium">
                                                <Link href={`/student/exams/${exam.id}`} className="hover:underline">
                                                    {exam.title}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={exam.status === 'published' ? 'default' : 'secondary'}>
                                                    {exam.status || "draft"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {exam.durationMinutes ? `${exam.durationMinutes} min` : "-"}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {isSebEnabled ? (
                                                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                                        <Shield className="h-3 w-3" /> SEB Required
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">Standard</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                                {(loading || filteredExams.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            {loading ? "Loading..." : "No exams available."}
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
