"use client"

import { useState } from "react"
import { Check, X, AlertTriangle, Download, ChevronDown, ChevronUp, Edit2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Answer {
    question: number
    answer: string | null
    confidence: number
    error?: string
    status?: "correct" | "wrong" | "empty"
    correctAnswer?: string
    debug?: string // Fill ratios for debugging
}

interface OMRResult {
    success: boolean
    studentNumber: string | null
    bookletType: string | null
    answers: Answer[]
    errors: string[]
    score?: {
        correct: number
        wrong: number
        empty: number
        total: number
        percentage: number
    }
    metadata: {
        processingTimeMs: number
        perspectiveCorrected: boolean
    }
    previewImage?: string | null
}

interface OMRResultsViewProps {
    result: OMRResult
    onValidate: (answers: Answer[]) => void
    onExport: () => void
}

export function OMRResultsView({ result, onValidate, onExport }: OMRResultsViewProps) {
    const [answers, setAnswers] = useState<Answer[]>(result.answers)
    const [editingQuestion, setEditingQuestion] = useState<number | null>(null)
    const [showDetails, setShowDetails] = useState(false)

    const updateAnswer = (questionNum: number, newAnswer: string | null) => {
        setAnswers(prev => prev.map(a =>
            a.question === questionNum
                ? { ...a, answer: newAnswer, error: undefined }
                : a
        ))
    }

    const handleValidate = () => {
        onValidate(answers)
    }

    const exportToJSON = () => {
        const data = {
            studentNumber: result.studentNumber,
            bookletType: result.bookletType,
            answers: answers.map(a => ({
                question: a.question,
                answer: a.answer
            })),
            exportedAt: new Date().toISOString()
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `omr_result_${result.studentNumber || "unknown"}.json`
        link.click()
        URL.revokeObjectURL(url)
    }

    const getAnswerBadgeClass = (answer: Answer) => {
        if (answer.status === "correct") return "bg-green-500/20 text-green-600 border-green-500/30"
        if (answer.status === "wrong") return "bg-red-500/20 text-red-600 border-red-500/30"
        if (answer.error) return "bg-yellow-500/20 text-yellow-600 border-yellow-500/30"
        if (!answer.answer) return "bg-gray-500/20 text-gray-500 border-gray-500/30"
        return "bg-cyan-500/20 text-cyan-600 border-cyan-500/30"
    }

    return (
        <div className="space-y-6">
            {/* Header with score */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Tarama Sonucu</h3>
                    <p className="text-sm text-gray-500">
                        {result.metadata.processingTimeMs}ms'de işlendi
                        {result.metadata.perspectiveCorrected && " • Perspektif düzeltildi"}
                    </p>
                </div>

                {result.score && (
                    <div className="text-right">
                        <div className="text-3xl font-bold text-cyan-600">%{result.score.percentage}</div>
                        <p className="text-sm text-gray-500">
                            {result.score.correct}/{result.score.total} doğru
                        </p>
                    </div>
                )}
            </div>

            {/* Student info */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-100 dark:bg-white/5">
                    <p className="text-sm text-gray-500 mb-1">Öğrenci No</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                        {result.studentNumber || "Tespit edilemedi"}
                    </p>
                </div>
                <div className="p-4 rounded-xl bg-gray-100 dark:bg-white/5">
                    <p className="text-sm text-gray-500 mb-1">Kitapçık Tipi</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                        {result.bookletType || "Tespit edilemedi"}
                    </p>
                </div>
            </div>

            {/* Score breakdown */}
            {result.score && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                        <Check className="h-6 w-6 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-600">{result.score.correct}</p>
                        <p className="text-sm text-green-600/70">Doğru</p>
                    </div>
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                        <X className="h-6 w-6 text-red-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-red-600">{result.score.wrong}</p>
                        <p className="text-sm text-red-600/70">Yanlış</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-500/10 border border-gray-500/20 text-center">
                        <AlertTriangle className="h-6 w-6 text-gray-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-500">{result.score.empty}</p>
                        <p className="text-sm text-gray-500/70">Boş</p>
                    </div>
                </div>
            )}

            {/* Debug overlay */}
            {result.previewImage && (
                <div className="space-y-2">
                    <p className="text-sm text-gray-500">İşaretlenmiş Görsel (debug overlay)</p>
                    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
                        <img
                            src={result.previewImage}
                            alt="OMR debug overlay"
                            className="w-full h-auto block"
                        />
                    </div>
                </div>
            )}

            {/* Errors */}
            {result.errors.length > 0 && (
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        <span className="font-semibold text-yellow-600">Uyarılar ({result.errors.length})</span>
                    </div>
                    <ul className="text-sm text-yellow-600/80 space-y-1">
                        {result.errors.slice(0, 5).map((error, idx) => (
                            <li key={idx}>• {error}</li>
                        ))}
                        {result.errors.length > 5 && (
                            <li>... ve {result.errors.length - 5} uyarı daha</li>
                        )}
                    </ul>
                </div>
            )}

            {/* Answers grid */}
            <div>
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
                >
                    {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {showDetails ? "Cevapları Gizle" : "Tüm Cevapları Göster"}
                </button>

                {showDetails && (
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-13 gap-2">
                        {answers.map(answer => (
                            <div
                                key={answer.question}
                                title={answer.debug || `Soru ${answer.question}`}
                                className={`relative p-2 rounded-lg border text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${getAnswerBadgeClass(answer)}`}
                                onClick={() => setEditingQuestion(answer.question)}
                            >
                                <div className="text-xs text-gray-500">{answer.question}</div>
                                <div className="font-bold">
                                    {editingQuestion === answer.question ? (
                                        <select
                                            value={answer.answer || ""}
                                            onChange={(e) => {
                                                updateAnswer(answer.question, e.target.value || null)
                                                setEditingQuestion(null)
                                            }}
                                            onBlur={() => setEditingQuestion(null)}
                                            autoFocus
                                            className="w-full bg-transparent text-center"
                                        >
                                            <option value="">-</option>
                                            <option value="A">A</option>
                                            <option value="B">B</option>
                                            <option value="C">C</option>
                                            <option value="D">D</option>
                                            <option value="E">E</option>
                                        </select>
                                    ) : (
                                        answer.answer || "-"
                                    )}
                                </div>
                                {answer.debug && (
                                    <div className="text-[8px] text-gray-400 mt-0.5 truncate">{answer.debug}</div>
                                )}
                                {answer.error && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full" />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
                <Button variant="outline" onClick={exportToJSON} className="flex-1">
                    <Download className="h-4 w-4 mr-2" /> JSON İndir
                </Button>
                <Button onClick={handleValidate} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500">
                    <Save className="h-4 w-4 mr-2" /> Doğrula ve Kaydet
                </Button>
            </div>
        </div>
    )
}

export default OMRResultsView
