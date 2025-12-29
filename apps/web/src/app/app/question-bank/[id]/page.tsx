"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { questionBankService } from "@/lib/services/questionBank"
import { questionsService } from "@/lib/services/questions"
import { QuestionBank, Question } from "@/lib/mockData"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Plus } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default function QuestionBankDetailPage({ params }: { params: { id: string } }) {
    const [bank, setBank] = useState<QuestionBank | null>(null)
    const [questions, setQuestions] = useState<Question[]>([])
    const { t } = useTranslation()

    useEffect(() => {
        questionBankService.getById(params.id).then(b => b && setBank(b))
        questionsService.getByBankId(params.id).then(setQuestions)
    }, [params.id])

    if (!bank) return <div>Loading...</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/app/question-bank">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{bank.title}</h1>
                    <p className="text-muted-foreground">{bank.description}</p>
                </div>
                <Button className="ml-auto" asChild>
                    <Link href={`/app/questions/new?bankId=${bank.id}`}>
                        <Plus className="mr-2 h-4 w-4" /> {t('create_question')}
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('questions')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Prompt</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Points</TableHead>
                                <TableHead>Difficulty</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {questions.map(q => (
                                <TableRow key={q.id}>
                                    <TableCell>{q.prompt.substring(0, 50)}...</TableCell>
                                    <TableCell><span className="capitalize">{q.type.replace(/_/g, ' ')}</span></TableCell>
                                    <TableCell>{q.points}</TableCell>
                                    <TableCell className="capitalize">{q.difficulty || '-'}</TableCell>
                                </TableRow>
                            ))}
                            {questions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                        No questions yet. Add one!
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
