"use client"

import { useEffect, useState } from "react"
import { examsService } from "@/lib/services/exams"
import { questionsService } from "@/lib/services/questions"
import { Exam, Question } from "@/lib/mockData"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"

export default function ExamPreviewPage({ params }: { params: { id: string } }) {
    const [exam, setExam] = useState<Exam | null>(null)
    const [questions, setQuestions] = useState<Question[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, any>>({})
    const [timeLeft, setTimeLeft] = useState(0)
    const router = useRouter()

    useEffect(() => {
        const init = async () => {
            const e = await examsService.getById(params.id)
            if (e) {
                setExam(e)
                setTimeLeft(e.durationMinutes * 60)

                // Fetch questions from all banks
                const allQs = await Promise.all(e.questionBankIds.map(bid => questionsService.getByBankId(bid)))
                setQuestions(allQs.flat())
            }
        }
        init()
    }, [params.id])

    // Timer mock
    useEffect(() => {
        if (!exam) return;
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
        if (!questions[currentIndex]) return;
        setAnswers(prev => ({
            ...prev,
            [questions[currentIndex].id]: val
        }))
    }

    const handleSubmit = () => {
        const score = Object.keys(answers).length * 10; // Mock scoring
        alert(`Exam submitted! Mock Score: ${score}`);
        router.push('/app/gradebook');
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
                <Button variant="destructive" size="sm" onClick={() => router.push('/app/exams')}>Exit Preview</Button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Main Question Area */}
                <div className="flex-1 p-8 overflow-y-auto">
                    <Card className="max-w-3xl mx-auto">
                        <CardHeader>
                            <CardTitle className="flex justify-between">
                                <span>Question {currentIndex + 1}</span>
                                <span className="text-sm font-normal text-muted-foreground">{currentQ.points} points</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="text-lg">{currentQ.prompt}</div>

                            {/* Render based on type */}
                            {currentQ.type.includes('multiple_choice') && (
                                <div className="space-y-2">
                                    {currentQ.options?.map((opt: any) => (
                                        <div key={opt.id} className="flex items-center space-x-2 border p-3 rounded-md hover:bg-accent cursor-pointer" onClick={() => handleAnswer(opt.id)}>
                                            <div className={`h-4 w-4 rounded-full border ${answers[currentQ.id] === opt.id ? 'bg-primary border-primary' : 'border-gray-300'}`} />
                                            <span>{opt.text}</span>
                                        </div>
                                    ))}
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
