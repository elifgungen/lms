"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

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
import { examsService } from "@/lib/services/exams"
import { questionBankService } from "@/lib/services/questionBank"
import { coursesService } from "@/lib/services/courses"
import { QuestionBank, Course } from "@/types/api"

const formSchema = z.object({
    title: z.string().min(2, {
        message: "Title must be at least 2 characters.",
    }),
    description: z.string().optional(),
    durationMinutes: z.coerce.number().min(1, { message: "Duration must be at least 1 minute" }),
    courseId: z.string().min(1, { message: "Please select a course" }),
    questionBankIds: z.array(z.string()).min(1, { message: "Select at least one question bank" }),
    status: z.enum(["published", "draft", "archived"]),
})

export default function CreateExamPage() {
    const router = useRouter()
    const { t } = useTranslation()
    const [banks, setBanks] = useState<QuestionBank[]>([])
    const [courses, setCourses] = useState<Course[]>([])

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            durationMinutes: 60,
            status: "draft",
            questionBankIds: []
        },
    })

    // Hacky multi-select handling
    const selectedBanks = watch("questionBankIds");

    const handleBankToggle = (id: string) => {
        const current = selectedBanks;
        if (current.includes(id)) {
            setValue("questionBankIds", current.filter(b => b !== id));
        } else {
            setValue("questionBankIds", [...current, id]);
        }
    }

    useEffect(() => {
        const fetchData = async () => {
            const [b, c] = await Promise.all([
                questionBankService.getAll(),
                coursesService.getAll()
            ]);
            setBanks(b);
            setCourses(c);
        }
        fetchData();
    }, [])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        await examsService.create(values)
        router.push("/app/exams")
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild className="pl-0 hover:bg-transparent">
                    <Link href="/app/exams" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                        <ChevronLeft className="h-4 w-4" />
                        {t('back_to_exams')}
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('create_new_exam')}</CardTitle>
                    <CardDescription>
                        {t('create_exam_desc')}
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <CardContent className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="title">{t('title')}</Label>
                            <Input
                                id="title"
                                placeholder="e.g. Midterm Exam"
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
                                placeholder="Exam instructions..."
                                {...register("description")}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="courseId">{t('courses')}</Label>
                            <select
                                id="courseId"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                {...register("courseId")}
                            >
                                <option value="">Select a course</option>
                                {courses.map(c => (
                                    <option key={c.id} value={c.id}>{c.title}</option>
                                ))}
                            </select>
                            {errors.courseId && (
                                <p className="text-xs text-destructive">{errors.courseId.message}</p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="status">{t('status')}</Label>
                            <select
                                id="status"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                {...register("status")}
                            >
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="duration">{t('duration')}</Label>
                            <Input
                                id="duration"
                                type="number"
                                {...register("durationMinutes")}
                            />
                            {errors.durationMinutes && (
                                <p className="text-xs text-destructive">{errors.durationMinutes.message}</p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label>{t('question_banks')}</Label>
                            <div className="border rounded-md p-4 space-y-2 max-h-40 overflow-y-auto">
                                {banks.map(bank => (
                                    <div key={bank.id} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id={`bank-${bank.id}`}
                                            checked={selectedBanks.includes(bank.id)}
                                            onChange={() => handleBankToggle(bank.id)}
                                            className="h-4 w-4 rounded border-gray-300 text-primary"
                                        />
                                        <Label htmlFor={`bank-${bank.id}`} className="font-normal cursor-pointer">
                                            {bank.title} ({bank.questionCount} Qs)
                                        </Label>
                                    </div>
                                ))}
                            </div>
                            {errors.questionBankIds && (
                                <p className="text-xs text-destructive">{errors.questionBankIds.message}</p>
                            )}
                        </div>

                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="outline" type="button" onClick={() => router.back()}>
                            {t('cancel')}
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Creating..." : "Create Exam"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
