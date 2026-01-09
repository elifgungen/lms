"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, Mic, MicOff, VideoOff, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface ProctoringOverlayProps {
    enabled: boolean
    attemptId?: string
    onPermissionDenied?: () => void
}

export function ProctoringOverlay({ enabled, attemptId, onPermissionDenied }: ProctoringOverlayProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [hasCamera, setHasCamera] = useState(false)
    const [hasMic, setHasMic] = useState(false)
    const [permissionDenied, setPermissionDenied] = useState(false)
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [minimized, setMinimized] = useState(false)

    useEffect(() => {
        if (!enabled) return

        const startMedia = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 320 },
                        height: { ideal: 240 },
                        facingMode: "user"
                    },
                    audio: true
                })

                setStream(mediaStream)
                setHasCamera(true)
                setHasMic(true)

                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream
                }
            } catch (err: any) {
                console.error("Proctoring media error:", err)
                setPermissionDenied(true)
                if (onPermissionDenied) {
                    onPermissionDenied()
                }
            }
        }

        startMedia()

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop())
            }
        }
    }, [enabled])

    // Update video ref when stream changes
    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream
        }
    }, [stream, minimized])

    if (!enabled) return null

    if (permissionDenied) {
        return (
            <div className="fixed bottom-4 right-4 z-50 max-w-sm">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Kamera/Mikrofon İzni Gerekli</AlertTitle>
                    <AlertDescription>
                        Bu sınav için kamera ve mikrofon erişimi gereklidir. Lütfen izin verin veya tarayıcı ayarlarınızı kontrol edin.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    if (minimized) {
        return (
            <div
                className="fixed bottom-4 right-4 z-50 cursor-pointer"
                onClick={() => setMinimized(false)}
            >
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-xl shadow-lg border border-white/10">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <Camera className="h-4 w-4 text-white" />
                    <span className="text-white text-sm">Gözetim Aktif</span>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="relative bg-slate-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-white text-xs font-medium">Gözetim Aktif</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasCamera && <Camera className="h-4 w-4 text-green-400" />}
                        {!hasCamera && <VideoOff className="h-4 w-4 text-red-400" />}
                        {hasMic && <Mic className="h-4 w-4 text-green-400" />}
                        {!hasMic && <MicOff className="h-4 w-4 text-red-400" />}
                        <button
                            onClick={() => setMinimized(true)}
                            className="ml-2 text-gray-400 hover:text-white"
                        >
                            −
                        </button>
                    </div>
                </div>

                {/* Video Preview */}
                <div className="w-48 h-36 bg-black">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                </div>
            </div>
        </div>
    )
}

export default ProctoringOverlay
