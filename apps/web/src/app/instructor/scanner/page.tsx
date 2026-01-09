"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api/client"
import { OMRScanner } from "@/components/OMRScanner"
import OMRResultsView from "@/components/OMRResultsView"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScanLine, FileStack, ChevronLeft, Key, Loader2, Save, X, Check, AlertTriangle } from "lucide-react"

interface Exam {
    id: string
    title: string
    course: string
    hasAnswerKey: boolean
    questionCount: number
}

interface ScanResult {
    success: boolean
    studentNumber: string | null
    bookletType: string | null
    answers: any[]
    errors: string[]
    score?: any
    metadata: any
}

export default function InstructorScannerPage() {
    const [step, setStep] = useState<"select" | "answerKey" | "scan" | "results">("select")
    const [exams, setExams] = useState<Exam[]>([])
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null)
    const [scanResult, setScanResult] = useState<ScanResult | null>(null)
    const [batchResults, setBatchResults] = useState<ScanResult[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Answer key state
    const [answerKey, setAnswerKey] = useState<Record<string, string>>({})
    const [answerKeyInput, setAnswerKeyInput] = useState("")

    useEffect(() => {
        fetchExams()
    }, [])

    const fetchExams = async () => {
        try {
            const response = await apiClient.get("/omr/exams")
            setExams(response.data?.data || [])
        } catch (err) {
            console.error("Failed to fetch exams", err)
        } finally {
            setLoading(false)
        }
    }

    const loadAnswerKey = async (examId: string) => {
        try {
            const response = await apiClient.get(`/omr/answer-key/${examId}`)
            const data = response.data?.data
            if (data?.answerKey) {
                setAnswerKey(data.answerKey)
            } else {
                setAnswerKey({})
            }
        } catch (err) {
            console.error("Failed to load answer key", err)
        }
    }

    const selectExam = async (exam: Exam) => {
        setSelectedExam(exam)
        await loadAnswerKey(exam.id)
        setStep("answerKey")
    }

    const saveAnswerKey = async () => {
        if (!selectedExam) return
        setSaving(true)
        try {
            await apiClient.post("/omr/answer-key", {
                examId: selectedExam.id,
                answerKey
            })
            setSelectedExam({ ...selectedExam, hasAnswerKey: true, questionCount: Object.keys(answerKey).length })
        } catch (err) {
            console.error("Failed to save answer key", err)
        } finally {
            setSaving(false)
        }
    }

    const parseAnswerKeyInput = () => {
        // Parse input like "1A 2B 3C 4D 5E" or "1-A, 2-B, 3-C" or newline separated
        const parsed: Record<string, string> = {}
        const parts = answerKeyInput.split(/[\s,\n]+/)

        for (const part of parts) {
            // Try formats: "1A", "1-A", "1:A"
            const match = part.match(/^(\d+)[-:.]?([A-E])$/i)
            if (match) {
                parsed[match[1]] = match[2].toUpperCase()
            }
        }

        if (Object.keys(parsed).length > 0) {
            setAnswerKey(prev => ({ ...prev, ...parsed }))
            setAnswerKeyInput("")
        }
    }

    const updateSingleAnswer = (question: number, answer: string) => {
        if (answer === "") {
            const newKey = { ...answerKey }
            delete newKey[String(question)]
            setAnswerKey(newKey)
        } else {
            setAnswerKey(prev => ({ ...prev, [String(question)]: answer.toUpperCase() }))
        }
    }

    const handleScanComplete = (result: ScanResult) => {
        setScanResult(result)
        setStep("results")
    }

    const handleValidate = async (answers: any[]) => {
        if (!scanResult || !selectedExam) return

        setSaving(true)
        try {
            await apiClient.post("/omr/validate", {
                examId: selectedExam.id,
                studentNumber: scanResult.studentNumber,
                bookletType: scanResult.bookletType,
                answers
            })

            setBatchResults(prev => [...prev, { ...scanResult, answers }])
            setScanResult(null)
            setStep("scan")
        } catch (err) {
            console.error("Validation failed", err)
        } finally {
            setSaving(false)
        }
    }

    const handleExport = () => {
        if (!scanResult) return
        const data = { studentNumber: scanResult.studentNumber, answers: scanResult.answers }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `omr_${scanResult.studentNumber || "result"}.json`
        a.click()
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {step !== "select" && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                if (step === "answerKey") setStep("select")
                                else if (step === "scan") setStep("answerKey")
                                else if (step === "results") setStep("scan")
                            }}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            <ScanLine className="inline-block h-6 w-6 mr-2 text-cyan-500" />
                            Optik Okuyucu
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            {step === "select" && "Sınav seçin"}
                            {step === "answerKey" && "Cevap anahtarını düzenleyin"}
                            {step === "scan" && "Formu tarayın"}
                            {step === "results" && "Sonuçları kontrol edin"}
                        </p>
                    </div>
                </div>

                {batchResults.length > 0 && (
                    <Badge className="bg-cyan-500/20 text-cyan-600 border-cyan-500/30">
                        <FileStack className="h-4 w-4 mr-1" />
                        {batchResults.length} kağıt
                    </Badge>
                )}
            </div>

            {/* Step 1: Select Exam */}
            {step === "select" && (
                <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
                    <CardHeader>
                        <CardTitle className="text-gray-900 dark:text-white">Sınav Seçin</CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-400">
                            Hangi sınav için cevap kağıtlarını okuyacaksınız?
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                            </div>
                        ) : exams.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500">Henüz sınav yok. Önce bir sınav oluşturun.</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {exams.map(exam => (
                                    <button
                                        key={exam.id}
                                        onClick={() => selectExam(exam)}
                                        className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-cyan-500 hover:bg-cyan-500/5 transition-all text-left"
                                    >
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">{exam.title}</p>
                                            <p className="text-sm text-gray-500">{exam.course}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {exam.hasAnswerKey ? (
                                                <Badge className="bg-green-500/20 text-green-600">
                                                    <Check className="h-3 w-3 mr-1" />
                                                    {exam.questionCount} soru
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-yellow-500/20 text-yellow-600">
                                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                                    Anahtar yok
                                                </Badge>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Step 2: Answer Key Editor */}
            {step === "answerKey" && selectedExam && (
                <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                                    <Key className="h-5 w-5 text-cyan-500" />
                                    Cevap Anahtarı
                                </CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-400">
                                    {selectedExam.title}
                                </CardDescription>
                            </div>
                            <Badge className="bg-purple-500/20 text-purple-600">
                                {Object.keys(answerKey).length} cevap
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Question count selector */}
                        <div className="p-4 rounded-xl bg-gray-100 dark:bg-white/5">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                Hızlı giriş (örn: 1A 2B 3C 4D 5E veya 1-A, 2-B, 3-C)
                            </p>
                            <div className="flex gap-2">
                                <Input
                                    value={answerKeyInput}
                                    onChange={e => setAnswerKeyInput(e.target.value)}
                                    placeholder="1A 2B 3C 4D 5E..."
                                    className="flex-1"
                                    onKeyDown={e => e.key === "Enter" && parseAnswerKeyInput()}
                                />
                                <Button onClick={parseAnswerKeyInput}>Ekle</Button>
                            </div>
                        </div>

                        {/* Answer grid - dynamic based on highest question number or default 20 */}
                        {(() => {
                            const maxQ = Math.max(20, ...Object.keys(answerKey).map(Number).filter(n => !isNaN(n)), selectedExam?.questionCount || 0)
                            const displayCount = Math.min(maxQ + 5, 100) // Show a few extra slots
                            return (
                                <div className="grid grid-cols-10 gap-2">
                                    {Array.from({ length: displayCount }, (_, i) => i + 1).map(q => (
                                        <div key={q} className="text-center">
                                            <p className="text-xs text-gray-500 mb-1">{q}</p>
                                            <select
                                                value={answerKey[String(q)] || ""}
                                                onChange={e => updateSingleAnswer(q, e.target.value)}
                                                className={`w-full text-center p-1 rounded border text-sm ${answerKey[String(q)]
                                                    ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-600 dark:text-cyan-400"
                                                    : "bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500"
                                                    }`}
                                            >
                                                <option value="">-</option>
                                                <option value="A">A</option>
                                                <option value="B">B</option>
                                                <option value="C">C</option>
                                                <option value="D">D</option>
                                                <option value="E">E</option>
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            )
                        })()}

                        {/* Actions */}
                        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
                            <Button
                                variant="outline"
                                onClick={saveAnswerKey}
                                disabled={saving}
                                className="flex-1"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                Kaydet
                            </Button>
                            <Button
                                onClick={() => setStep("scan")}
                                disabled={Object.keys(answerKey).length === 0}
                                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500"
                            >
                                Taramaya Geç
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Scan */}
            {step === "scan" && selectedExam && (
                <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-gray-900 dark:text-white">Form Tarama</CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-400">
                                    {selectedExam.title}
                                </CardDescription>
                            </div>
                            <Badge className="bg-green-500/20 text-green-600">
                                {Object.keys(answerKey).length} cevap anahtarı
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <OMRScanner
                            onScanComplete={handleScanComplete}
                            examId={selectedExam.id}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Step 4: Results */}
            {step === "results" && scanResult && (
                <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
                    <CardContent className="pt-6">
                        <OMRResultsView
                            result={scanResult}
                            onValidate={handleValidate}
                            onExport={handleExport}
                        />

                        {saving && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 flex items-center gap-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                                    <span className="text-gray-900 dark:text-white">Kaydediliyor...</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Batch Results Summary */}
            {batchResults.length > 0 && step === "scan" && (
                <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-gray-900 dark:text-white">
                            Okunan Formlar ({batchResults.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-4 gap-2">
                            {batchResults.map((result, idx) => (
                                <div key={idx} className="p-3 rounded-lg bg-gray-100 dark:bg-white/5 text-center">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {result.studentNumber || `Form ${idx + 1}`}
                                    </p>
                                    {result.score && (
                                        <p className="text-xs text-cyan-600">%{result.score.percentage}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
