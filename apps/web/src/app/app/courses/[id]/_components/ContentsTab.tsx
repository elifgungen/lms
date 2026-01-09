"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Video, FileText, ExternalLink, FolderOpen, Loader2, CheckCircle } from "lucide-react"
import { apiClient } from "@/lib/api/client"

interface Content {
    id: string
    title: string
    type: string
    body?: string
    metadata?: { url?: string; duration?: string; pages?: number }
    module?: { title: string }
}

interface Module {
    id: string
    title: string
    contents: Content[]
}

export default function ContentsTab({ canEdit }: { canEdit: boolean }) {
    const params = useParams()
    const courseId = params.id as string
    const [contents, setContents] = useState<Content[]>([])
    const [modules, setModules] = useState<Module[]>([])
    const [loading, setLoading] = useState(true)

    // Form state
    const [selectedModule, setSelectedModule] = useState("")
    const [contentType, setContentType] = useState<"video" | "pdf">("video")
    const [title, setTitle] = useState("")
    const [url, setUrl] = useState("")
    const [description, setDescription] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)

    const fetchData = async () => {
        if (!courseId) return
        try {
            const res = await apiClient.get(`/courses/${courseId}/modules`)
            const fetchedModules: Module[] = res.data?.data || []
            setModules(fetchedModules)

            // Flatten all contents
            const allContents: Content[] = []
            fetchedModules.forEach(module => {
                if (module.contents) {
                    module.contents.forEach(content => {
                        allContents.push({ ...content, module: { title: module.title } })
                    })
                }
            })
            setContents(allContents)

            // Set default module
            if (fetchedModules.length > 0 && !selectedModule) {
                setSelectedModule(fetchedModules[0].id)
            }
        } catch (err) {
            console.error("Failed to fetch contents:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [courseId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedModule || !title) return

        setSubmitting(true)
        setSuccess(false)

        try {
            await apiClient.post(`/modules/${selectedModule}/contents`, {
                title,
                type: contentType,
                body: description,
                metadata: url ? { url } : undefined
            })

            // Reset form
            setTitle("")
            setUrl("")
            setDescription("")
            setSuccess(true)

            // Refresh contents
            await fetchData()

            setTimeout(() => setSuccess(false), 3000)
        } catch (err) {
            console.error("Failed to add content:", err)
            alert("İçerik eklenemedi. Lütfen tekrar deneyin.")
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="p-4 text-muted-foreground">İçerikler yükleniyor...</div>

    return (
        <div className="space-y-6">
            {/* Existing Contents */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5" />
                        Mevcut İçerikler ({contents.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {contents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Henüz içerik eklenmemiş.
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {contents.map(content => (
                                <div key={content.id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                                    {content.type === "video" && <Video className="h-5 w-5 text-red-500 flex-shrink-0" />}
                                    {content.type === "pdf" && <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />}
                                    {content.type !== "video" && content.type !== "pdf" && <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />}

                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{content.title}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="bg-primary/10 px-2 py-0.5 rounded">{content.module?.title}</span>
                                            {content.type === "video" && content.metadata?.duration && (
                                                <span>⏱️ {content.metadata.duration}</span>
                                            )}
                                            {content.type === "pdf" && content.metadata?.pages && (
                                                <span>📄 {content.metadata.pages} sayfa</span>
                                            )}
                                        </div>
                                    </div>

                                    {content.metadata?.url && (
                                        <a
                                            href={content.metadata.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                            Aç
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {canEdit && (
                <Card>
                    <CardHeader>
                        <CardTitle>Yeni İçerik Ekle</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Module Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="module">Modül *</Label>
                                <select
                                    id="module"
                                    value={selectedModule}
                                    onChange={(e) => setSelectedModule(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    required
                                >
                                    <option value="">Modül seçin...</option>
                                    {modules.map((m) => (
                                        <option key={m.id} value={m.id}>{m.title}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Content Type */}
                            <div className="space-y-2">
                                <Label>İçerik Türü</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={contentType === "video" ? "default" : "outline"}
                                        className="flex-1"
                                        size="sm"
                                        onClick={() => setContentType("video")}
                                    >
                                        <Video className="mr-2 h-4 w-4" /> Video
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={contentType === "pdf" ? "default" : "outline"}
                                        className="flex-1"
                                        size="sm"
                                        onClick={() => setContentType("pdf")}
                                    >
                                        <FileText className="mr-2 h-4 w-4" /> PDF
                                    </Button>
                                </div>
                            </div>

                            {/* Title */}
                            <div className="space-y-2">
                                <Label htmlFor="title">Başlık *</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="örn: Ders 1 - Giriş"
                                    required
                                />
                            </div>

                            {/* URL */}
                            <div className="space-y-2">
                                <Label htmlFor="url">URL (Harici Link)</Label>
                                <Input
                                    id="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://youtube.com/watch?v=..."
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label htmlFor="description">Açıklama</Label>
                                <Input
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="İçerik hakkında kısa açıklama"
                                />
                            </div>

                            {/* Submit Button */}
                            <Button type="submit" className="w-full" disabled={submitting || !selectedModule || !title}>
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Ekleniyor...
                                    </>
                                ) : success ? (
                                    <>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Eklendi!
                                    </>
                                ) : (
                                    "İçerik Ekle"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
