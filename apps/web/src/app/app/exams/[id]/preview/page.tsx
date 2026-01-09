"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/hooks/useAuth"

interface Question {
    id: string
    type: string
    prompt: string
    points?: number
    options?: any
    answer?: any
}

interface ExamData {
    id: string
    title: string
    description?: string
    durationMinutes?: number
    questionBanks?: Array<{
        id: string
        questions?: Question[]
    }>
}

function getBasePath(roles: string[]): string {
    if (roles.includes("super_admin") || roles.includes("admin")) return "/admin"
    if (roles.includes("instructor") || roles.includes("assistant")) return "/instructor"
    return "/student"
}

export default function ExamPreviewPage() {
    const params = useParams()
    const id = params.id as string
    const [exam, setExam] = useState<ExamData | null>(null)
    const [questions, setQuestions] = useState<Question[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, any>>({})
    const [timeLeft, setTimeLeft] = useState(0)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const { user } = useAuth()
    const basePath = getBasePath(user?.roles || [])

    useEffect(() => {
        if (!id) return
        const init = async () => {
            try {
                // Fetch exam with questions included
                const res = await apiClient.get(`/exams/${id}?includeQuestions=true`)
                const examData = res.data?.data

                if (examData) {
                    setExam(examData)
                    setTimeLeft((examData.durationMinutes || 0) * 60)

                    // Extract questions from question banks
                    const allQuestions: Question[] = []
                    if (examData.questionBanks) {
                        for (const bank of examData.questionBanks) {
                            if (bank.questions) {
                                allQuestions.push(...bank.questions)
                            }
                        }
                    }
                    setQuestions(allQuestions)
                }
            } catch (err) {
                console.error("Failed to load exam", err)
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [id])

    // Timer mock
    useEffect(() => {
        if (!exam) return
        const interval = setInterval(() => {
            setTimeLeft(prev => (prev > 0 ? prev - 1 : 0))
        }, 1000)
        return () => clearInterval(interval)
    }, [exam])

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s < 10 ? '0' : ''}${s}`
    }

    const handleAnswer = (val: any) => {
        if (!questions[currentIndex]) return
        setAnswers(prev => ({
            ...prev,
            [questions[currentIndex].id]: val
        }))
    }

    const handleSubmit = () => {
        const score = Object.keys(answers).length * 10 // Mock scoring
        alert(`Exam submitted! Mock Score: ${score}`)
        router.push(`${basePath}/gradebook`)
    }

    if (!exam || questions.length === 0) {
        if (exam && questions.length === 0) return <div className="p-8">No questions in this exam.</div>
        return <div className="p-8"><Skeleton className="h-[400px] w-full" /></div>
    }

    const currentQ = questions[currentIndex]

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b p-4 bg-background">
                <h2 className="font-semibold">{exam.title}</h2>
                <div className="font-mono text-xl font-bold">{formatTime(timeLeft)}</div>
                <Button variant="destructive" size="sm" onClick={() => router.push(`${basePath}/exams`)}>Exit Preview</Button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Main Question Area */}
                <div className="flex-1 p-8 overflow-y-auto">
                    <Card className="max-w-3xl mx-auto">
                        <CardHeader>
                            <CardTitle className="flex justify-between">
                                <span>Question {currentIndex + 1}</span>
                                <span className="text-sm font-normal text-muted-foreground">{currentQ.points || 0} points</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="text-lg">{currentQ.prompt}</div>

                            {/* Render based on type */}
                            {currentQ.type.includes('multiple_choice') && (
                                <div className="space-y-2">
                                    {(currentQ.options?.items || currentQ.options || []).map((opt: any, idx: number) => {
                                        const optText = typeof opt === 'string' ? opt : opt.text
                                        const optId = typeof opt === 'string' ? opt : (opt.id || idx)
                                        return (
                                            <div key={optId} className="flex items-center space-x-2 border p-3 rounded-md hover:bg-accent cursor-pointer" onClick={() => handleAnswer(optId)}>
                                                <div className={`h-4 w-4 rounded-full border ${answers[currentQ.id] === optId ? 'bg-primary border-primary' : 'border-gray-300'}`} />
                                                <span>{optText}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {currentQ.type === 'true_false' && (
                                <div className="space-y-2">
                                    {['true', 'false'].map(val => (
                                        <div key={val} className="flex items-center space-x-2 border p-3 rounded-md hover:bg-accent cursor-pointer" onClick={() => handleAnswer(val)}>
                                            <div className={`h-4 w-4 rounded-full border ${answers[currentQ.id] === val ? 'bg-primary border-primary' : 'border-gray-300'}`} />
                                            <span className="capitalize">{val}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Fallback for other types */}
                            {!currentQ.type.includes('multiple_choice') && currentQ.type !== 'true_false' && (
                                <div className="text-muted-foreground italic">
                                    UI for {currentQ.type} not implemented in preview.
                                </div>
                            )}

                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button
                                variant="outline"
                                disabled={currentIndex === 0}
                                onClick={() => setCurrentIndex(prev => prev - 1)}
                            >
                                Previous
                            </Button>
                            {currentIndex < questions.length - 1 ? (
                                <Button onClick={() => setCurrentIndex(prev => prev + 1)}>
                                    Next
                                </Button>
                            ) : (
                                <Button onClick={handleSubmit} variant="default">
                                    Submit Exam
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                </div>

                {/* Side Navigation */}
                <div className="w-64 border-l bg-accent/20 p-4 overflow-y-auto hidden md:block">
                    <h3 className="font-semibold mb-4">Questions</h3>
                    <div className="grid grid-cols-4 gap-2">
                        {questions.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`h-10 w-10 flex items-center justify-center rounded-md text-sm font-medium transition-colors
                                ${idx === currentIndex ? 'bg-primary text-primary-foreground' :
                                        answers[questions[idx].id] ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-background border hover:bg-accent'}
                            `}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
