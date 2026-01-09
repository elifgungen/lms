"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ModulesTab from "./_components/ModulesTab"
import ContentsTab from "./_components/ContentsTab"
import RosterTab from "./_components/RosterTab"
import { coursesService } from "@/lib/services/courses"
import { apiClient } from "@/lib/api/client"
import { Course } from "@/types/api"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Copy, Loader2 } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"
import { useAuth } from "@/lib/hooks/useAuth"

function getBasePath(roles: string[]): string {
    if (roles.includes("super_admin") || roles.includes("admin")) return "/admin"
    if (roles.includes("instructor") || roles.includes("assistant")) return "/instructor"
    return "/student"
}

export default function CourseDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string
    const [course, setCourse] = useState<Course | null>(null)
    const [error, setError] = useState("")
    const [cloning, setCloning] = useState(false)
    const { t, locale } = useTranslation()
    const { user } = useAuth()
    const basePath = getBasePath(user?.roles || [])
    const isInstructor = user?.roles?.some(r => ["super_admin", "admin", "instructor", "assistant"].includes(r))

    useEffect(() => {
        if (!id) return
        const fetchCourse = async () => {
            try {
                const data = await coursesService.getById(id)
                if (data) setCourse(data)
            } catch {
                setError("Kurs bulunamadı")
            }
        }
        fetchCourse()
    }, [id])

    const handleClone = async () => {
        if (!course) return
        setCloning(true)
        try {
            const res = await apiClient.post(`/courses/${course.id}/clone`)
            const newCourse = res.data?.data
            if (newCourse) {
                router.push(`${basePath}/courses/${newCourse.id}`)
            } else {
                throw new Error("Yanıt boş geldi")
            }
        } catch (err: any) {
            console.error("Clone failed:", err)
            const errorMessage = err?.response?.data?.error || err?.message || "Bilinmeyen hata"
            alert(`${locale === "tr" ? "Klonlama başarısız" : "Clone failed"}: ${errorMessage}`)
        } finally {
            setCloning(false)
        }
    }

    if (error) return <div className="text-destructive">{error}</div>
    if (!course) return <div>Loading...</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`${basePath}/courses`}>
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
                        <p className="text-muted-foreground">{course.description || "No description provided."}</p>
                    </div>
                </div>
                {isInstructor && (
                    <Button variant="outline" onClick={handleClone} disabled={cloning}>
                        {cloning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                        {locale === "tr" ? "Dersi Kopyala" : "Clone Course"}
                    </Button>
                )}
            </div>

            <Tabs defaultValue="modules" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="modules">{t('modules')}</TabsTrigger>
                    <TabsTrigger value="contents">{t('contents')}</TabsTrigger>
                    {isInstructor && <TabsTrigger value="roster">{t('students') || "Öğrenciler"}</TabsTrigger>}
                </TabsList>
                <TabsContent value="modules">
                    <ModulesTab canEdit={isInstructor} />
                </TabsContent>
                <TabsContent value="contents">
                    <ContentsTab canEdit={isInstructor} />
                </TabsContent>
                {isInstructor && (
                    <TabsContent value="roster">
                        <RosterTab />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    )
}
