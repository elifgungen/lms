"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { assignmentsService } from "@/lib/services/assignments"
import { coursesService } from "@/lib/services/courses"
import { Course } from "@/types/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default function CreateAssignmentPage() {
    const router = useRouter()
    const [courses, setCourses] = useState<Course[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [formData, setFormData] = useState({
        courseId: "",
        title: "",
        description: "",
        dueDate: "",
        allowedFileTypes: "pdf,docx,zip",
        maxFileSizeMb: 10
    })

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const data = await coursesService.getAll()
                setCourses(data)
            } catch {
                setError("Failed to load courses")
            }
        }
        fetchCourses()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            await assignmentsService.create(formData)
            router.push("/instructor/assignments")
        } catch (err: any) {
            setError(err.message || "Failed to create assignment")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/instructor/assignments">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Yeni Ödev Oluştur</h1>
                    <p className="text-muted-foreground">Bir derse ödev ekleyin.</p>
                </div>
            </div>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Ödev Bilgileri</CardTitle>
                    <CardDescription>Ödev başlığı, açıklama ve teslim tarihi belirleyin.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="courseId">Ders *</Label>
                            <select
                                id="courseId"
                                value={formData.courseId}
                                onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                required
                            >
                                <option value="">Ders seçin...</option>
                                {courses.map((course) => (
                                    <option key={course.id} value={course.id}>
                                        {course.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="title">Başlık *</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                                placeholder="Ödev başlığı"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Açıklama</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Ödev açıklaması ve yönergeleri..."
                                rows={4}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="dueDate">Teslim Tarihi</Label>
                                <Input
                                    id="dueDate"
                                    type="datetime-local"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="maxFileSizeMb">Maks. Dosya Boyutu (MB)</Label>
                                <Input
                                    id="maxFileSizeMb"
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={formData.maxFileSizeMb}
                                    onChange={(e) => setFormData({ ...formData, maxFileSizeMb: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="allowedFileTypes">İzin Verilen Dosya Türleri</Label>
                            <Input
                                id="allowedFileTypes"
                                value={formData.allowedFileTypes}
                                onChange={(e) => setFormData({ ...formData, allowedFileTypes: e.target.value })}
                                placeholder="pdf,docx,zip"
                            />
                            <p className="text-xs text-muted-foreground">Virgülle ayırarak birden fazla uzantı belirtin.</p>
                        </div>

                        {error && <p className="text-sm text-destructive">{error}</p>}

                        <div className="flex gap-2 pt-4">
                            <Button type="submit" disabled={loading || !formData.courseId || !formData.title}>
                                {loading ? "Oluşturuluyor..." : "Ödev Oluştur"}
                            </Button>
                            <Button type="button" variant="outline" asChild>
                                <Link href="/instructor/assignments">İptal</Link>
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
