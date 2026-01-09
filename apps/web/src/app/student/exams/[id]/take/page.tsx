"use client"

import { useParams, useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight, Send, Clock, CheckCircle, Camera } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"
import ProctoringOverlay from "@/components/ProctoringOverlay"

interface Question {
    id: string
    prompt: string
    type: string
    options?: { items?: string[] }
}

interface Exam {
    id: string
    title: string
    durationMinutes?: number
    sebEnabled?: boolean
    proctoringEnabled?: boolean
}

export default function ExamTakePage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const router = useRouter()
    const { t, locale } = useTranslation()

    const examId = params.id as string
    const attemptId = searchParams.get("attemptId")

    const [exam, setExam] = useState<Exam | null>(null)
    const [questions, setQuestions] = useState<Question[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState("")
    const [sebEnabled, setSebEnabled] = useState(false)
    const [proctoringEnabled, setProctoringEnabled] = useState(false)

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

    useEffect(() => {
        if (!examId || !attemptId) {
            setError(locale === "tr" ? "Geçersiz sınav veya deneme" : "Invalid exam or attempt")
            setLoading(false)
            return
        }

        const fetchData = async () => {
            try {
                const token = localStorage.getItem("accessToken")

                // Fetch exam details
                const examRes = await fetch(`${apiUrl}/exams/${examId}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                })
                if (!examRes.ok) throw new Error("Failed to fetch exam")
                const examData = await examRes.json()
                setExam(examData.data)

                // Enable proctoring for non-SEB exams
                // SEB exams handle their own proctoring, web exams use ProctoringOverlay
                const isSEB = examData.data?.sebEnabled === true
                if (!isSEB) {
                    setProctoringEnabled(true)
                }

                // Fetch questions
                const questionsRes = await fetch(`${apiUrl}/exams/${examId}/questions`, {
                    headers: { "Authorization": `Bearer ${token}` }
                })
                if (!questionsRes.ok) throw new Error("Failed to fetch questions")
                const questionsData = await questionsRes.json()
                setQuestions(questionsData.data || [])

            } catch (err: any) {
                setError(err.message || "Failed to load exam")
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [examId, attemptId, apiUrl, locale])

    const currentQuestion = questions[currentIndex]
    const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0

    const handleAnswer = (value: string) => {
        if (!currentQuestion) return
        setAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: value
        }))
    }

    const saveAnswer = async () => {
        if (!currentQuestion || !attemptId) return
        const answer = answers[currentQuestion.id]
        if (!answer) return

        try {
            const token = localStorage.getItem("accessToken")
            await fetch(`${apiUrl}/attempts/${attemptId}/answer`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    questionId: currentQuestion.id,
                    answer: { value: answer }
                })
            })
        } catch (err) {
            console.error("Failed to save answer", err)
        }
    }

    const handleNext = async () => {
        await saveAnswer()
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
        }
    }

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1)
        }
    }

    const handleSubmit = async () => {
        if (!attemptId) return
        setSubmitting(true)

        try {
            // Save current answer first
            await saveAnswer()

            // Submit attempt
            const token = localStorage.getItem("accessToken")
            const res = await fetch(`${apiUrl}/attempts/${attemptId}/submit`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            })

            if (!res.ok) throw new Error("Failed to submit")

            setSubmitted(true)
        } catch (err: any) {
            setError(err.message || "Failed to submit exam")
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>{locale === "tr" ? "Sınav yükleniyor..." : "Loading exam..."}</p>
                </div>
            </div>
        )
    }

    if (error && !exam) {
        return (
            <div className="p-4">
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button className="mt-4" asChild>
                    <Link href="/student/exams">{locale === "tr" ? "Sınavlara Dön" : "Back to Exams"}</Link>
                </Button>
            </div>
        )
    }

    if (submitted) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Card className="max-w-md text-center">
                    <CardHeader>
                        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <CardTitle>{locale === "tr" ? "Sınav Tamamlandı!" : "Exam Submitted!"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            {locale === "tr"
                                ? "Yanıtlarınız başarıyla gönderildi."
                                : "Your answers have been submitted successfully."}
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" asChild>
                            <Link href="/student/exams">{locale === "tr" ? "Sınavlara Dön" : "Back to Exams"}</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    if (questions.length === 0) {
        return (
            <div className="p-4">
                <Alert>
                    <AlertTitle>{locale === "tr" ? "Soru Yok" : "No Questions"}</AlertTitle>
                    <AlertDescription>
                        {locale === "tr"
                            ? "Bu sınavda henüz soru bulunmuyor."
                            : "This exam has no questions yet."}
                    </AlertDescription>
                </Alert>
                <Button className="mt-4" asChild>
                    <Link href="/student/exams">{locale === "tr" ? "Sınavlara Dön" : "Back to Exams"}</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            {/* Proctoring Overlay - shows camera/mic for non-SEB exams */}
            <ProctoringOverlay
                enabled={proctoringEnabled}
                attemptId={attemptId || undefined}
            />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{exam?.title}</h1>
                    <p className="text-muted-foreground">
                        {locale === "tr" ? "Soru" : "Question"} {currentIndex + 1} / {questions.length}
                    </p>
                </div>
                {exam?.durationMinutes && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {exam.durationMinutes} {locale === "tr" ? "dk" : "min"}
                    </div>
                )}
            </div>

            {/* Progress */}
            <Progress value={progress} className="h-2" />

            {/* Question Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{currentQuestion?.prompt}</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Multiple Choice / True-False */}
                    {(currentQuestion?.type === "multiple_choice_single" ||
                        currentQuestion?.type === "true_false" ||
                        currentQuestion?.type === "mcq") && (
                            <RadioGroup
                                value={answers[currentQuestion.id] || ""}
                                onValueChange={handleAnswer}
                                className="space-y-3"
                            >
                                {currentQuestion.type === "true_false" ? (
                                    <>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="true" id="true" />
                                            <Label htmlFor="true">{locale === "tr" ? "Doğru" : "True"}</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="false" id="false" />
                                            <Label htmlFor="false">{locale === "tr" ? "Yanlış" : "False"}</Label>
                                        </div>
                                    </>
                                ) : (
                                    (currentQuestion.options?.items || []).map((option, idx) => (
                                        <div key={idx} className="flex items-center space-x-2">
                                            <RadioGroupItem value={option} id={`option-${idx}`} />
                                            <Label htmlFor={`option-${idx}`}>{option}</Label>
                                        </div>
                                    ))
                                )}
                            </RadioGroup>
                        )}

                    {/* Short Text */}
                    {(currentQuestion?.type === "short_text" || currentQuestion?.type === "short_answer") && (
                        <Input
                            value={answers[currentQuestion.id] || ""}
                            onChange={(e) => handleAnswer(e.target.value)}
                            placeholder={locale === "tr" ? "Cevabınızı yazın..." : "Type your answer..."}
                        />
                    )}

                    {/* Long Text / Essay */}
                    {(currentQuestion?.type === "long_text" || currentQuestion?.type === "essay") && (
                        <Textarea
                            value={answers[currentQuestion.id] || ""}
                            onChange={(e) => handleAnswer(e.target.value)}
                            placeholder={locale === "tr" ? "Cevabınızı yazın..." : "Type your answer..."}
                            rows={5}
                        />
                    )}

                    {/* Fill in the Blank */}
                    {currentQuestion?.type === "fill_blank" && (
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                                {locale === "tr" ? "Boşluğu doldurun:" : "Fill in the blank:"}
                            </p>
                            <Input
                                value={answers[currentQuestion.id] || ""}
                                onChange={(e) => handleAnswer(e.target.value)}
                                placeholder={locale === "tr" ? "Cevabınızı yazın..." : "Type your answer..."}
                            />
                        </div>
                    )}

                    {/* Matching */}
                    {currentQuestion?.type === "matching" && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                {locale === "tr" ? "Eşleştirmeyi yapın (A-1, B-2, C-3 formatında):" : "Match items (format: A-1, B-2, C-3):"}
                            </p>
                            {currentQuestion.options?.items && (
                                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                                    <div>
                                        <p className="font-medium mb-2">{locale === "tr" ? "Sol Sütun" : "Left Column"}</p>
                                        {currentQuestion.options.items.slice(0, Math.ceil(currentQuestion.options.items.length / 2)).map((item, idx) => (
                                            <p key={idx} className="py-1">{String.fromCharCode(65 + idx)}. {item}</p>
                                        ))}
                                    </div>
                                    <div>
                                        <p className="font-medium mb-2">{locale === "tr" ? "Sağ Sütun" : "Right Column"}</p>
                                        {currentQuestion.options.items.slice(Math.ceil(currentQuestion.options.items.length / 2)).map((item, idx) => (
                                            <p key={idx} className="py-1">{idx + 1}. {item}</p>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <Input
                                value={answers[currentQuestion.id] || ""}
                                onChange={(e) => handleAnswer(e.target.value)}
                                placeholder="A-1, B-2, C-3..."
                            />
                        </div>
                    )}

                    {/* Ordering */}
                    {currentQuestion?.type === "ordering" && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                {locale === "tr" ? "Doğru sırayı yazın (1, 2, 3, 4 formatında):" : "Enter correct order (format: 1, 2, 3, 4):"}
                            </p>
                            {currentQuestion.options?.items && (
                                <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                                    {currentQuestion.options.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-2 border rounded">
                                            <span className="font-bold w-6">{idx + 1}.</span>
                                            <span>{item}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <Input
                                value={answers[currentQuestion.id] || ""}
                                onChange={(e) => handleAnswer(e.target.value)}
                                placeholder="3, 1, 4, 2..."
                            />
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button
                        variant="outline"
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                    >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        {locale === "tr" ? "Önceki" : "Previous"}
                    </Button>

                    {currentIndex === questions.length - 1 ? (
                        <Button onClick={handleSubmit} disabled={submitting}>
                            <Send className="mr-2 h-4 w-4" />
                            {submitting
                                ? (locale === "tr" ? "Gönderiliyor..." : "Submitting...")
                                : (locale === "tr" ? "Sınavı Bitir" : "Submit Exam")}
                        </Button>
                    ) : (
                        <Button onClick={handleNext}>
                            {locale === "tr" ? "Sonraki" : "Next"}
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </CardFooter>
            </Card>

            {/* Question Navigator */}
            <div className="flex flex-wrap gap-2 justify-center">
                {questions.map((q, idx) => (
                    <Button
                        key={q.id}
                        variant={idx === currentIndex ? "default" : answers[q.id] ? "secondary" : "outline"}
                        size="sm"
                        className="w-10 h-10"
                        onClick={() => {
                            saveAnswer()
                            setCurrentIndex(idx)
                        }}
                    >
                        {idx + 1}
                    </Button>
                ))}
            </div>
        </div>
    )
}
