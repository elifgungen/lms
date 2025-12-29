"use client"

import { useState } from "react"
import Link from "next/link"
import { mockCourses } from "@/lib/mockData"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Plus, Search } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"

export default function CoursesPage() {
    const [searchTerm, setSearchTerm] = useState("")
    const { t } = useTranslation()

    const filteredCourses = mockCourses.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'published': return 'default';
            case 'draft': return 'secondary';
            case 'archived': return 'destructive';
            default: return 'outline';
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">{t('courses')}</h1>
                <Button asChild>
                    <Link href="/app/courses/new">
                        <Plus className="mr-2 h-4 w-4" /> {t('create_course')}
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>{t('all_courses')}</CardTitle>
                    <CardDescription>
                        {t('manage_courses_desc')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center py-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('search_placeholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('title')}</TableHead>
                                    <TableHead>{t('status')}</TableHead>
                                    <TableHead>{t('created_at')}</TableHead>
                                    <TableHead className="text-right">{t('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCourses.length > 0 ? (
                                    filteredCourses.map((course) => (
                                        <TableRow key={course.id}>
                                            <TableCell className="font-medium">
                                                <Link href={`/app/courses/${course.id}`} className="hover:underline">
                                                    {course.title}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusVariant(course.status) as any}>
                                                    {course.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{new Date(course.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={`/app/courses/${course.id}`}>{t('edit')}</Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            No results.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
