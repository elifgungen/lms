"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ModulesTab from "./_components/ModulesTab"
import ContentsTab from "./_components/ContentsTab"
import { mockCourses } from "@/lib/mockData"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"

export default function CourseDetailPage({ params }: { params: { id: string } }) {
    const course = mockCourses.find(c => c.id === params.id) || mockCourses[0]
    const { t } = useTranslation()

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/app/courses">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
                    <p className="text-muted-foreground">{course.description || "No description provided."}</p>
                </div>
            </div>

            <Tabs defaultValue="modules" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="modules">{t('modules')}</TabsTrigger>
                    <TabsTrigger value="contents">{t('contents')}</TabsTrigger>
                </TabsList>
                <TabsContent value="modules">
                    <ModulesTab />
                </TabsContent>
                <TabsContent value="contents">
                    <ContentsTab />
                </TabsContent>
            </Tabs>
        </div>
    )
}
