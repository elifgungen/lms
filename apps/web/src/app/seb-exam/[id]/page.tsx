"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { examsService } from "@/lib/services/exams"
import { apiClient } from "@/lib/api/client"
import { Exam } from "@/types/api"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Shield, Clock, AlertTriangle, Camera, CheckCircle, Loader2, Lock, LogIn } from "lucide-react"
import { webTokenStorage } from "@lms/auth/storage/web"
import { isElectron, getElectronAPI } from "@/lib/electron"

// SEB Exam Page - Dedicated locked exam view for Safe Exam Browser
// This page:
// 1. Requires login (no dashboard access)
// 2. Shows ONLY exam info and start button
// 3. Runs exam with proctoring
// 4. Auto-quits SEB after submission

export default function SebExamPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    // States
    const [exam, setExam] = useState<Exam | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [phase, setPhase] = useState<"login" | "ready" | "exam" | "submitted">("login")

    // Login
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loginLoading, setLoginLoading] = useState(false)
    const [loginError, setLoginError] = useState("")

    // Exam
    const [attempt, setAttempt] = useState<any>(null)
    const [questions, setQuestions] = useState<any[]>([])
    const [answers, setAnswers] = useState<Record<string, any>>({})
    const [currentIndex, setCurrentIndex] = useState(0)
    const [timeLeft, setTimeLeft] = useState(0)
    const [submitting, setSubmitting] = useState(false)

    // Webcam - must be enabled BEFORE starting exam
    const videoRef = useRef<HTMLVideoElement>(null)
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
    const [cameraActive, setCameraActive] = useState(false)
    const [cameraError, setCameraError] = useState("")
    const [requestingCamera, setRequestingCamera] = useState(false)

    // Assign stream to video element when both are ready
    useEffect(() => {
        if (mediaStream && videoRef.current) {
            videoRef.current.srcObject = mediaStream
        }
    }, [mediaStream, cameraActive]) // Re-run when cameraActive changes (video element renders)

    // Check if user is already logged in
    useEffect(() => {
        const token = webTokenStorage.getAccessToken()
        if (token) {
            // Verify token is valid and load exam
            loadExam()
        } else {
            setLoading(false)
        }
    }, [id])

    // Load exam details
    const loadExam = async () => {
        try {
            const data = await examsService.getById(id)
            if (data) {
                setExam(data)
                setPhase("ready")
            } else {
                setError("Sınav bulunamadı")
            }
        } catch (err: any) {
            // If 401 unauthorized, token is invalid - clear it and show login
            if (err?.response?.status === 401) {
                webTokenStorage.clearSession()
                setPhase("login")
            } else {
                setError("Sınav yüklenirken hata oluştu")
            }
        } finally {
            setLoading(false)
        }
    }

    // Handle login
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoginLoading(true)
        setLoginError("")

        try {
            const res = await apiClient.post("/auth/login", { email, password })
            // API returns { accessToken, refreshToken } directly
            const accessToken = res.data?.accessToken || res.data?.data?.token
            const refreshToken = res.data?.refreshToken

            if (accessToken) {
                webTokenStorage.setAccessToken(accessToken)
                if (refreshToken) {
                    webTokenStorage.setRefreshToken(refreshToken)
                }
                // User info will be loaded when we fetch exam
                await loadExam()
            } else {
                setLoginError("Giriş başarısız")
            }
        } catch (err: any) {
            setLoginError(err?.response?.data?.error || "Giriş başarısız")
        } finally {
            setLoginLoading(false)
        }
    }

    // Start webcam and microphone - called in READY phase
    const requestCameraAccess = async () => {
        setRequestingCamera(true)
        setCameraError("")

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 },
                audio: true  // Request microphone access
            })
            // Store stream in state - will be assigned to video via useEffect
            setMediaStream(stream)
            setCameraActive(true)
        } catch (err) {
            console.error("Camera/microphone access denied:", err)
            setCameraError("Kamera ve mikrofon erişimi reddedildi. Lütfen tarayıcı ayarlarından izin verin.")
        } finally {
            setRequestingCamera(false)
        }
    }

    // Start exam - camera is optional for proctoring
    const handleStartExam = async () => {
        // Camera is optional - try to start it if not already active
        if (!cameraActive && !cameraError) {
            // Silently try to start camera, but don't block exam
            requestCameraAccess().catch(() => { })
        }

        try {
            // Enable SEB mode in Electron
            if (isElectron()) {
                const api = getElectronAPI()
                api?.enableSebMode({})
            }

            // Start attempt
            const res = await apiClient.post(`/exams/${id}/start`)
            const attemptData = res.data?.data

            if (attemptData) {
                setAttempt(attemptData)

                // Load questions
                const qRes = await apiClient.get(`/exams/${id}/questions`)
                setQuestions(qRes.data?.data || [])

                // Set timer
                if (exam?.durationMinutes) {
                    setTimeLeft(exam.durationMinutes * 60)
                }

                setPhase("exam")
            }
        } catch (err: any) {
            const errorCode = err?.response?.data?.error
            if (errorCode === "ATTEMPT_EXISTS") {
                setError("Bu sınava zaten giriş yaptınız. Her sınava yalnızca bir kez girilebilir.")
            } else if (errorCode === "SEB_REQUIRED") {
                setError("Bu sınav Safe Exam Browser gerektirir.")
            } else {
                setError(err?.response?.data?.message || "Sınav başlatılamadı")
            }
        }
    }

    // Timer effect
    useEffect(() => {
        if (phase !== "exam" || timeLeft <= 0) return

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    handleSubmitExam()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [phase, timeLeft])

    // Format time
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    }

    // Answer question
    const handleAnswer = (questionId: string, answer: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }))
    }

    // Submit exam
    const handleSubmitExam = async () => {
        if (submitting) return
        setSubmitting(true)

        try {
            // Submit all answers
            for (const [questionId, answer] of Object.entries(answers)) {
                await apiClient.post(`/attempts/${attempt.id}/answer`, {
                    questionId,
                    answer: { value: answer }
                })
            }

            // Submit attempt
            await apiClient.post(`/attempts/${attempt.id}/submit`)

            setPhase("submitted")

            // Stop camera
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop())
                setMediaStream(null)
            }

            // Quit SEB after 3 seconds
            setTimeout(() => {
                if (isElectron()) {
                    const api = getElectronAPI()
                    api?.forceQuit()
                }
            }, 3000)

        } catch (err) {
            console.error("Submit failed:", err)
            setError("Sınav gönderilemedi")
        } finally {
            setSubmitting(false)
        }
    }

    // Render based on phase
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Hata
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>{error}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Login Phase
    if (phase === "login") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
                <Card className="max-w-md w-full">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <Shield className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle>Güvenli Sınav Girişi</CardTitle>
                        <CardDescription>
                            Sınava girmek için öğrenci hesabınızla giriş yapın
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">E-posta</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="student@example.com"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Şifre</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            {loginError && (
                                <p className="text-sm text-destructive">{loginError}</p>
                            )}
                            <Button type="submit" className="w-full" disabled={loginLoading}>
                                {loginLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <LogIn className="h-4 w-4 mr-2" />
                                )}
                                Giriş Yap
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Ready Phase - Show exam info and require camera permission
    if (phase === "ready" && exam) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
                <Card className="max-w-lg w-full">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <Lock className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle>{exam.title}</CardTitle>
                        <CardDescription>Güvenli Sınav - Safe Exam Browser</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Exam Info */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>Süre: {exam.durationMinutes} dakika</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Camera className="h-4 w-4 text-muted-foreground" />
                                <span>Kamera kaydı aktif</span>
                            </div>
                        </div>

                        {/* Rules */}
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                            <h4 className="font-medium flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                                Sınav Kuralları
                            </h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• Sınav sırasında kamera aktif olacak</li>
                                <li>• Ekran görüntüsü almak yasaktır</li>
                                <li>• Kopyala/yapıştır devre dışı</li>
                                <li>• Sınav penceresinden çıkamazsınız</li>
                                <li>• Her sınava yalnızca bir kez girilebilir</li>
                            </ul>
                        </div>

                        {/* Camera Permission Section - Optional */}
                        <div className="border rounded-lg p-4 space-y-3">
                            <h4 className="font-medium flex items-center gap-2">
                                <Camera className="h-4 w-4" />
                                Kamera ve Mikrofon (Opsiyonel)
                            </h4>

                            {!cameraActive ? (
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        Gözetleme için kamera izni verebilirsiniz (opsiyonel).
                                    </p>
                                    {cameraError && (
                                        <p className="text-sm text-destructive">{cameraError}</p>
                                    )}
                                    <Button
                                        onClick={requestCameraAccess}
                                        variant="outline"
                                        className="w-full"
                                        disabled={requestingCamera}
                                    >
                                        {requestingCamera ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <Camera className="h-4 w-4 mr-2" />
                                        )}
                                        Kamera İzni Ver
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-green-600">
                                        <CheckCircle className="h-4 w-4" />
                                        <span className="text-sm font-medium">Kamera ve mikrofon hazır</span>
                                    </div>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        className="w-full h-32 object-cover rounded border bg-black"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Start Button - Camera is optional */}
                        <Button
                            onClick={handleStartExam}
                            className="w-full"
                            size="lg"
                        >
                            <Shield className="h-5 w-5 mr-2" />
                            Sınava Başla
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Exam Phase
    if (phase === "exam" && questions.length > 0) {
        const currentQuestion = questions[currentIndex]

        return (
            <div className="min-h-screen bg-background flex flex-col">
                {/* Header */}
                <div className="sticky top-0 z-50 border-b bg-card px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Badge variant="outline" className="gap-1">
                            <Shield className="h-3 w-3" />
                            SEB
                        </Badge>
                        <span className="font-medium">{exam?.title}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Badge variant={timeLeft < 300 ? "destructive" : "secondary"} className="gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(timeLeft)}
                        </Badge>
                        {/* Camera preview */}
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-16 h-12 object-cover rounded border"
                        />
                    </div>
                </div>

                {/* Question */}
                <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
                    <div className="mb-4 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                            Soru {currentIndex + 1} / {questions.length}
                        </span>
                        <Badge>{currentQuestion?.type || "multiple_choice"}</Badge>
                    </div>

                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-lg mb-6">{currentQuestion?.prompt}</p>

                            {/* Multiple Choice */}
                            {currentQuestion?.type?.includes("multiple_choice") && currentQuestion?.options?.items && (
                                <div className="space-y-2">
                                    {currentQuestion.options.items.map((option: string, i: number) => (
                                        <label
                                            key={i}
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${answers[currentQuestion.id] === option ? "border-primary bg-primary/5" : ""
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name={`q-${currentQuestion.id}`}
                                                checked={answers[currentQuestion.id] === option}
                                                onChange={() => handleAnswer(currentQuestion.id, option)}
                                                className="h-4 w-4"
                                            />
                                            <span>{option}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {/* True/False */}
                            {currentQuestion?.type === "true_false" && (
                                <div className="flex gap-4">
                                    {["true", "false"].map((val) => (
                                        <Button
                                            key={val}
                                            variant={answers[currentQuestion.id] === val ? "default" : "outline"}
                                            onClick={() => handleAnswer(currentQuestion.id, val)}
                                            className="flex-1"
                                        >
                                            {val === "true" ? "Doğru" : "Yanlış"}
                                        </Button>
                                    ))}
                                </div>
                            )}

                            {/* Short Text */}
                            {currentQuestion?.type === "short_text" && (
                                <Input
                                    value={answers[currentQuestion.id] || ""}
                                    onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                                    placeholder="Cevabınızı yazın..."
                                />
                            )}
                        </CardContent>
                    </Card>

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-6">
                        <Button
                            variant="outline"
                            disabled={currentIndex === 0}
                            onClick={() => setCurrentIndex(prev => prev - 1)}
                        >
                            Önceki
                        </Button>

                        {currentIndex === questions.length - 1 ? (
                            <Button onClick={handleSubmitExam} disabled={submitting}>
                                {submitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                Sınavı Bitir
                            </Button>
                        ) : (
                            <Button onClick={() => setCurrentIndex(prev => prev + 1)}>
                                Sonraki
                            </Button>
                        )}
                    </div>

                    {/* Question dots */}
                    <div className="flex justify-center gap-1 mt-6">
                        {questions.map((q, i) => (
                            <button
                                key={q.id}
                                onClick={() => setCurrentIndex(i)}
                                className={`w-3 h-3 rounded-full transition-colors ${i === currentIndex
                                    ? "bg-primary"
                                    : answers[q.id]
                                        ? "bg-green-500"
                                        : "bg-muted"
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    // Submitted Phase
    if (phase === "submitted") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
                <Card className="max-w-md w-full text-center">
                    <CardHeader>
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <CardTitle>Sınav Tamamlandı!</CardTitle>
                        <CardDescription>
                            Cevaplarınız başarıyla gönderildi.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Uygulama 3 saniye içinde kapanacak...
                        </p>
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return null
}
