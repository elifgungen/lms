"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { examsService } from "@/lib/services/exams"
import { Exam } from "@/lib/mockData"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ChevronLeft } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"

export default function ExamDetailPage({ params }: { params: { id: string } }) {
    const [exam, setExam] = useState<Exam | null>(null)
    const { t } = useTranslation()

    useEffect(() => {
        examsService.getById(params.id).then(e => {
            if (e) setExam(e);
        });
    }, [params.id])

    if (!exam) return <div>Loading...</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/app/exams">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{exam.title}</h1>
                    <Badge className="mt-1" variant={exam.status === 'published' ? 'default' : 'secondary'}>{exam.status}</Badge>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        <div><strong>Duration:</strong> {exam.durationMinutes} mins</div>
                        <div><strong>Banks:</strong> {exam.questionBankIds.length}</div>
                        <div><strong>Created:</strong> {new Date(exam.createdAt).toLocaleDateString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        <Button asChild>
                            <Link href={`/app/exams/${exam.id}/preview`}>Preview / Take Exam</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function Badge({ children, variant, className }: any) {
    return <div className={`inline-flex items-center border rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2  ${className} ${variant === 'default' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{children}</div>
}
