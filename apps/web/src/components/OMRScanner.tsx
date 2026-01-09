"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Camera, Upload, X, Loader2, RotateCcw, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type Point = { x: number; y: number } // normalized 0-1
type AnchorKey = "q1A" | "q1E" | "q53A"

interface OMRScannerProps {
  onScanComplete: (result: any) => void
  examId?: string
}

const cornerLabels = ["Sol Üst", "Sağ Üst", "Sağ Alt", "Sol Alt"] as const

export function OMRScanner({ onScanComplete, examId }: OMRScannerProps) {
  const [mode, setMode] = useState<"idle" | "camera" | "preview" | "processing">("idle")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [sourceBlob, setSourceBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Manual corners on original image (normalized 0-1)
  const [cornerMode, setCornerMode] = useState<"auto" | "manual">("auto")
  const [manualCorners, setManualCorners] = useState<Point[]>([])
  const previewImgRef = useRef<HTMLImageElement>(null)
  const [previewBox, setPreviewBox] = useState<{ x0: number; y0: number; w: number; h: number }>({
    x0: 0,
    y0: 0,
    w: 1,
    h: 1,
  })

  // Warp preview (server-side)
  const [warpOpen, setWarpOpen] = useState(false)
  const [warpedImage, setWarpedImage] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null)
  const [autoAnchors, setAutoAnchors] = useState<Record<string, Point>>({})
  const [anchors, setAnchors] = useState<Record<string, Point>>({})
  const [activeAnchor, setActiveAnchor] = useState<AnchorKey>("q1A")
  const warpedImgRef = useRef<HTMLImageElement>(null)
  const [warpBox, setWarpBox] = useState<{ x0: number; y0: number; w: number; h: number }>({
    x0: 0,
    y0: 0,
    w: 1,
    h: 1,
  })

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

  const computeContainBox = useCallback((imgEl: HTMLImageElement | null) => {
    if (!imgEl) return { x0: 0, y0: 0, w: 1, h: 1 }
    const rect = imgEl.getBoundingClientRect()
    const ew = rect.width
    const eh = rect.height
    const nw = imgEl.naturalWidth || 0
    const nh = imgEl.naturalHeight || 0
    if (!ew || !eh || !nw || !nh) return { x0: 0, y0: 0, w: 1, h: 1 }
    const scale = Math.min(ew / nw, eh / nh)
    const rw = nw * scale
    const rh = nh * scale
    const ox = (ew - rw) / 2
    const oy = (eh - rh) / 2
    return { x0: ox / ew, y0: oy / eh, w: rw / ew, h: rh / eh }
  }, [])

  const clientToNormalized = useCallback(
    (
      imgEl: HTMLImageElement | null,
      box: { x0: number; y0: number; w: number; h: number },
      clientX: number,
      clientY: number,
    ): Point | null => {
      if (!imgEl) return null
      const rect = imgEl.getBoundingClientRect()
      if (!rect.width || !rect.height) return null
      const rx = (clientX - rect.left) / rect.width
      const ry = (clientY - rect.top) / rect.height
      const x = (rx - box.x0) / box.w
      const y = (ry - box.y0) / box.h
      if (x < 0 || x > 1 || y < 0 || y > 1) return null
      return { x, y }
    },
    [],
  )

  const reset = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setMode("idle")
    setPreviewUrl(null)
    setError(null)
    setCornerMode("auto")
    setManualCorners([])
    setWarpOpen(false)
    setWarpedImage(null)
    setPageSize(null)
    setAutoAnchors({})
    setAnchors({})
    setActiveAnchor("q1A")
  }, [])

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setMode("camera")
    } catch (err) {
      console.error("Camera error:", err)
      setError("Kameraya erişilemedi. Lütfen izin verin veya dosya yükleyin.")
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setMode("idle")
  }, [])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9)
    canvas.toBlob(
      (blob) => {
        if (blob) setSourceBlob(blob)
      },
      "image/jpeg",
      0.9
    )
    stopCamera()
    setPreviewUrl(dataUrl)
    setCornerMode("auto")
    setManualCorners([])
    setWarpedImage(null)
    setAutoAnchors({})
    setAnchors({})
    setMode("preview")
  }, [stopCamera])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSourceBlob(file)
    const reader = new FileReader()
    reader.onload = (evt) => {
      setPreviewUrl(evt.target?.result as string)
      setCornerMode("auto")
      setManualCorners([])
      setWarpedImage(null)
      setAutoAnchors({})
      setAnchors({})
      setMode("preview")
    }
    reader.readAsDataURL(file)
  }, [])

  const handleCornerClick = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      if (cornerMode !== "manual") return
      const pt = clientToNormalized(previewImgRef.current, previewBox, e.clientX, e.clientY)
      if (!pt) return
      const next = [...manualCorners, pt].slice(0, 4)
      setManualCorners(next)
    },
    [clientToNormalized, cornerMode, manualCorners, previewBox]
  )

  const cornersPayload = useMemo(() => {
    if (cornerMode !== "manual" || manualCorners.length !== 4) return null
    return manualCorners
  }, [cornerMode, manualCorners])

  const getImageBlob = useCallback(async () => {
    if (sourceBlob) return sourceBlob
    if (!previewUrl) return null
    // Fallback for older sessions: derive blob from data URL
    const res = await fetch(previewUrl)
    return await res.blob()
  }, [previewUrl, sourceBlob])

  const getErrorPayload = async (res: Response) => {
    const contentType = res.headers.get("content-type") || ""
    try {
      if (contentType.includes("application/json")) {
        const json = await res.json()
        return typeof json?.error === "string" ? json.error : JSON.stringify(json)
      }
      const text = await res.text()
      return text || null
    } catch {
      return null
    }
  }

  const requestWarpPreview = useCallback(async () => {
    if (!previewUrl) return
    setMode("processing")
    setError(null)

    try {
      const blob = await getImageBlob()
      if (!blob) throw new Error("Görsel alınamadı")
      const formData = new FormData()
      const file = new File([blob], "scan.jpg", { type: blob.type || "image/jpeg" })
      formData.append("image", file)
      if (examId) formData.append("examId", examId)
      if (cornersPayload) formData.append("corners", JSON.stringify(cornersPayload))

      const token = localStorage.getItem("accessToken")
      const res = await fetch(`${apiUrl}/omr/preview`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      })
      if (!res.ok) {
        const payload = await getErrorPayload(res)
        throw new Error(payload ? `Önizleme başarısız (${res.status}): ${payload}` : `Önizleme başarısız (${res.status})`)
      }
      const json = await res.json()
      const data = json.data

      setWarpedImage(data.warpedImage || null)
      if (data.pageSize && Array.isArray(data.pageSize) && data.pageSize.length === 2) {
        setPageSize({ width: data.pageSize[0], height: data.pageSize[1] })
      } else if (data.pageSize?.width && data.pageSize?.height) {
        setPageSize({ width: data.pageSize.width, height: data.pageSize.height })
      } else {
        setPageSize(null)
      }

      // normalize auto anchors to 0-1
      const psize = data.pageSize && Array.isArray(data.pageSize) ? { width: data.pageSize[0], height: data.pageSize[1] } : null
      const nextAuto: Record<string, Point> = {}
      if (data.anchors && typeof data.anchors === "object" && psize) {
        for (const [k, v] of Object.entries<any>(data.anchors)) {
          const x = Array.isArray(v) ? v[0] : v?.x
          const y = Array.isArray(v) ? v[1] : v?.y
          if (typeof x === "number" && typeof y === "number") {
            nextAuto[k] = { x: x / psize.width, y: y / psize.height }
          }
        }
      }
      setAutoAnchors(nextAuto)
      setAnchors({}) // force manual confirmation (auto is available via button)
      setWarpOpen(true)
      setMode("preview")
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Önizleme alınamadı.")
      setMode("preview")
    }
  }, [apiUrl, cornersPayload, examId, getImageBlob, previewUrl])

  const handleWarpClick = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      const pt = clientToNormalized(warpedImgRef.current, warpBox, e.clientX, e.clientY)
      if (!pt) return
      setAnchors((prev) => ({ ...prev, [activeAnchor]: pt }))
    },
    [activeAnchor, clientToNormalized, warpBox]
  )

  useEffect(() => {
    const onResize = () => {
      setPreviewBox(computeContainBox(previewImgRef.current))
      setWarpBox(computeContainBox(warpedImgRef.current))
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [computeContainBox])

  const canRead = useMemo(() => {
    return !!anchors.q1A && !!anchors.q1E
  }, [anchors.q1A, anchors.q1E])

  const runOcr = useCallback(async () => {
    if (!previewUrl) return
    if (!canRead) {
      setError("Lütfen önce warp önizlemede Q1A ve Q1E noktalarını seçin.")
      return
    }

    setMode("processing")
    setError(null)
    try {
      const blob = await getImageBlob()
      if (!blob) throw new Error("Görsel alınamadı")
      const formData = new FormData()
      const file = new File([blob], "scan.jpg", { type: blob.type || "image/jpeg" })
      formData.append("image", file)
      if (examId) formData.append("examId", examId)
      if (cornersPayload) formData.append("corners", JSON.stringify(cornersPayload))
      formData.append("anchors", JSON.stringify(anchors))

      const token = localStorage.getItem("accessToken")
      const res = await fetch(`${apiUrl}/omr/process`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      })
      if (!res.ok) {
        const payload = await getErrorPayload(res)
        throw new Error(payload ? `İşleme başarısız (${res.status}): ${payload}` : `İşleme başarısız (${res.status})`)
      }
      const json = await res.json()
      onScanComplete(json.data)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Form işlenemedi.")
      setMode("preview")
    }
  }, [anchors, apiUrl, canRead, cornersPayload, examId, getImageBlob, onScanComplete, previewUrl])

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-2">
          <X className="h-5 w-5" />
          {error}
        </div>
      )}

      {mode === "idle" && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={startCamera}
            className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-dashed border-cyan-500/30 hover:border-cyan-500/60 transition-all"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <Camera className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-900 dark:text-white">Kamera ile Tara</p>
              <p className="text-sm text-gray-500">Formu kamera ile çekin</p>
            </div>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 transition-all"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Upload className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-900 dark:text-white">Dosya Yükle</p>
              <p className="text-sm text-gray-500">Bilgisayardan resim seçin</p>
            </div>
          </button>
        </div>
      )}

      {mode === "camera" && (
        <div className="relative rounded-2xl overflow-hidden bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-[4/3] object-cover" />
          <div className="absolute inset-4 border-2 border-white/50 border-dashed rounded-lg pointer-events-none" />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            <Button variant="outline" onClick={stopCamera} className="bg-white/10 backdrop-blur">
              <X className="h-4 w-4 mr-2" /> İptal
            </Button>
            <Button onClick={capturePhoto} className="bg-cyan-500 hover:bg-cyan-600">
              <Camera className="h-4 w-4 mr-2" /> Çek
            </Button>
          </div>
        </div>
      )}

      {mode === "preview" && previewUrl && (
        <div className="space-y-4">
          <div className="p-3 rounded-xl border border-dashed border-cyan-300 bg-cyan-50/50 dark:bg-gray-800/50">
            <p className="text-sm text-gray-700 dark:text-gray-200 font-semibold">1) Perspektif Düzeltme</p>
            <p className="text-xs text-gray-500">
              Auto Detect ile devam edebilir veya manuelde 4 köşeyi sırayla seçebilirsin. Sonra “Perspektif Düzelt (Önizle)” ile
              backend’in düzelttiği görüntüyü tam ekranda görüp anchor’ları seç.
            </p>
            <div className="flex gap-2 mt-3 flex-wrap">
              <Button type="button" variant={cornerMode === "auto" ? "default" : "outline"} onClick={() => { setCornerMode("auto"); setManualCorners([]) }}>
                Auto Detect
              </Button>
              <Button type="button" variant={cornerMode === "manual" ? "default" : "outline"} onClick={() => { setCornerMode("manual"); setManualCorners([]) }}>
                Manuel Köşe Seç
              </Button>
              {manualCorners.length > 0 && (
                <Button type="button" variant="ghost" onClick={() => setManualCorners([])}>
                  Köşeleri Sıfırla
                </Button>
              )}
            </div>
            <div className="mt-3">
              <Button onClick={requestWarpPreview} className="bg-gradient-to-r from-purple-500 to-cyan-500">
                <Maximize2 className="h-4 w-4 mr-2" /> Perspektif Düzelt (Önizle)
              </Button>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
            <img
              ref={previewImgRef}
              src={previewUrl}
              alt="Preview"
              className={`w-full aspect-[4/3] object-contain ${cornerMode === "manual" ? "cursor-crosshair" : ""}`}
              onLoad={() => setPreviewBox(computeContainBox(previewImgRef.current))}
              onClick={handleCornerClick}
            />
            {cornerMode === "manual" && manualCorners.length > 0 && (
              <div className="absolute inset-0 pointer-events-none">
                {manualCorners.map((c, idx) => (
                  <div
                    key={idx}
                    className="absolute w-5 h-5 -mt-2.5 -ml-2.5 rounded-full border-2 border-white bg-cyan-500 shadow"
                    style={{
                      left: `${(previewBox.x0 + c.x * previewBox.w) * 100}%`,
                      top: `${(previewBox.y0 + c.y * previewBox.h) * 100}%`,
                    }}
                  >
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] bg-black/70 text-white px-1 rounded">
                      {cornerLabels[idx] || `P${idx + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={reset} className="flex-1">
              <RotateCcw className="h-4 w-4 mr-2" /> Tekrar
            </Button>
            <Button onClick={() => setWarpOpen(true)} disabled={!warpedImage} className="flex-1" variant="outline">
              Önizlemeyi Aç
            </Button>
            <Button onClick={runOcr} disabled={!warpedImage || !canRead} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500">
              İşle ve Oku
            </Button>
          </div>
        </div>
      )}

      {mode === "processing" && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 animate-pulse" />
            <Loader2 className="absolute inset-0 m-auto h-10 w-10 text-white animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-900 dark:text-white">İşleniyor...</p>
            <p className="text-sm text-gray-500">Perspektif düzeltme / anchor hizalama</p>
          </div>
        </div>
      )}

      {warpOpen && warpedImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col">
          <div className="p-4 flex items-center justify-between text-white">
            <div>
              <div className="font-semibold">2) Bubble Correction (Anchor)</div>
              <div className="text-xs text-white/70">
                Sırayla Q1A, Q1E (gerekirse Q53A) baloncuklarının merkezine tıkla. Sonra “Oku”.
              </div>
            </div>
            <Button variant="outline" className="bg-white/10 text-white" onClick={() => setWarpOpen(false)}>
              Kapat
            </Button>
          </div>

          <div className="px-4 pb-3 flex gap-2 flex-wrap">
            {(["q1A", "q1E", "q53A"] as const).map((k) => (
              <Button
                key={k}
                variant={activeAnchor === k ? "default" : "outline"}
                className={activeAnchor === k ? "" : "bg-white/10 text-white border-white/20"}
                onClick={() => setActiveAnchor(k)}
              >
                {k.toUpperCase()}
              </Button>
            ))}
            <Button
              variant="outline"
              className="bg-white/10 text-white border-white/20"
              onClick={() => setAnchors(autoAnchors)}
            >
              Auto Doldur
            </Button>
            <Button
              variant="outline"
              className="bg-white/10 text-white border-white/20"
              onClick={() => setAnchors({})}
            >
              Sıfırla
            </Button>
          </div>

          <div className="flex-1 overflow-auto px-4 pb-4">
            <div className="relative inline-block">
              <img
                ref={warpedImgRef}
                src={warpedImage}
                alt="Warped"
                className="max-h-[80vh] w-auto rounded-lg cursor-crosshair select-none"
                onLoad={() => setWarpBox(computeContainBox(warpedImgRef.current))}
                onClick={handleWarpClick}
              />
              {Object.entries(anchors).map(([k, p]) => (
                <div
                  key={k}
                  className="absolute w-5 h-5 -mt-2.5 -ml-2.5 rounded-full border-2 border-white bg-orange-500 shadow pointer-events-none"
                  style={{
                    left: `${(warpBox.x0 + p.x * warpBox.w) * 100}%`,
                    top: `${(warpBox.y0 + p.y * warpBox.h) * 100}%`,
                  }}
                >
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] bg-black/70 text-white px-1 rounded">
                    {k.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 flex gap-3">
            <Button variant="outline" className="flex-1 bg-white/10 text-white border-white/20" onClick={() => setWarpOpen(false)}>
              Geri
            </Button>
            <Button className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500" disabled={!canRead} onClick={runOcr}>
              Oku
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default OMRScanner
