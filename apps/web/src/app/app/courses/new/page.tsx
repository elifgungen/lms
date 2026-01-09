"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"

import { coursesService } from "@/lib/services/courses"

const formSchema = z.object({
    title: z.string().min(2, {
        message: "Title must be at least 2 characters.",
    }),
    description: z.string().optional(),
    itemStatus: z.enum(["published", "draft", "archived"]),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    group: z.string().optional(),
    password: z.string().optional(),
})

export default function CreateCoursePage() {
    const router = useRouter()
    const { t } = useTranslation()
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            itemStatus: "draft",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            await coursesService.create({
                title: values.title,
                description: values.description,
            })
            router.push("/instructor/courses")
        } catch (error) {
            console.error("Failed to create course:", error)
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild className="pl-0 hover:bg-transparent">
                    <Link href="/app/courses" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                        <ChevronLeft className="h-4 w-4" />
                        {t('back_to_courses')}
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('create_new_course')}</CardTitle>
                    <CardDescription>
                        {t('create_course_desc')}
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <CardContent className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="title">{t('course_title')}</Label>
                            <Input
                                id="title"
                                placeholder="e.g. Advanced Mathematics"
                                {...register("title")}
                            />
                            {errors.title && (
                                <p className="text-xs text-destructive">{errors.title.message}</p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">{t('description')}</Label>
                            <Textarea
                                id="description"
                                placeholder="Course description..."
                                {...register("description")}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="itemStatus">{t('status')}</Label>
                            <select
                                id="itemStatus"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                {...register("itemStatus")}
                            >
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="startDate">{t('start_date')}</Label>
                                <Input
                                    id="startDate"
                                    type="datetime-local"
                                    {...register("startDate")}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="endDate">{t('end_date')}</Label>
                                <Input
                                    id="endDate"
                                    type="datetime-local"
                                    {...register("endDate")}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="group">{t('group_access')}</Label>
                                <Input
                                    id="group"
                                    placeholder="e.g. Class A"
                                    {...register("group")}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password">{t('access_password')}</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Optional"
                                    {...register("password")}
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="outline" type="button" onClick={() => router.back()}>
                            {t('cancel')}
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Creating..." : t('create_course')}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
