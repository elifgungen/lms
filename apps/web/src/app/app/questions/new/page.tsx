"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, Trash } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"
import { questionsService } from "@/lib/services/questions"

const formSchema = z.object({
    type: z.enum(['multiple_choice_single', 'multiple_choice_multi', 'true_false', 'fill_blank', 'matching', 'ordering']),
    prompt: z.string().min(1, "Question prompt is required"),
    points: z.coerce.number().min(0),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    options: z.array(z.object({
        text: z.string()
    })).optional(),
    correctAnswer: z.string().optional(),
})

export default function CreateQuestionPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const bankId = searchParams.get('bankId')
    const { t } = useTranslation()

    const {
        register,
        control,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            type: 'multiple_choice_single',
            prompt: "",
            points: 1,
            difficulty: 'medium',
            options: [{ text: "" }, { text: "" }], // Default 2 options
        },
    })

    // Dynamic fields for options
    const { fields, append, remove } = useFieldArray({
        control,
        name: "options"
    });

    const questionType = watch("type");

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!bankId) return;

        // Map form values to Question interface structure
        await questionsService.create({
            bankId,
            type: values.type,
            prompt: values.prompt,
            points: values.points,
            difficulty: values.difficulty,
            options: values.options?.map((o, i) => ({ id: `o${i}`, text: o.text })),
            correctAnswer: values.correctAnswer
        })

        router.push(`/app/question-bank/${bankId}`)
    }

    if (!bankId) {
        return <div>Error: No bank ID provided.</div>
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild className="pl-0 hover:bg-transparent">
                    <Link href={`/app/question-bank/${bankId}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                        <ChevronLeft className="h-4 w-4" />
                        {t('back_to_bank')}
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('create_question')}</CardTitle>
                </CardHeader>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <CardContent className="space-y-6">

                        <div className="grid gap-2">
                            <Label htmlFor="type">{t('question_type')}</Label>
                            <select
                                {...register("type")}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="multiple_choice_single">Multiple Choice (Single)</option>
                                <option value="multiple_choice_multi">Multiple Choice (Multi)</option>
                                <option value="true_false">True / False</option>
                                <option value="fill_blank">Fill in the Blank</option>
                                <option value="matching">Matching</option>
                                <option value="ordering">Ordering</option>
                            </select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="prompt">Prompt / Text</Label>
                            <Textarea
                                id="prompt"
                                placeholder="What is the capital of France?"
                                {...register("prompt")}
                            />
                            {errors.prompt && (
                                <p className="text-xs text-destructive">{errors.prompt.message}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="points">{t('points')}</Label>
                                <Input
                                    id="points"
                                    type="number"
                                    {...register("points")}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="difficulty">{t('difficulty')}</Label>
                                <select
                                    {...register("difficulty")}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                        </div>

                        {/* Type Specific Rendering - keeping it simple for now */}
                        {(questionType === 'multiple_choice_single' || questionType === 'multiple_choice_multi') && (
                            <div className="space-y-2">
                                <Label>Options</Label>
                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex gap-2">
                                        <Input {...register(`options.${index}.text` as const)} placeholder={`Option ${index + 1}`} />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => append({ text: "" })}>
                                    {t('add_option')}
                                </Button>
                            </div>
                        )}

                        {questionType === 'true_false' && (
                            <div className="space-y-2">
                                <Label>{t('correct_answer')}</Label>
                                <select
                                    {...register("correctAnswer")}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="true">True</option>
                                    <option value="false">False</option>
                                </select>
                            </div>
                        )}

                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="outline" type="button" onClick={() => router.back()}>
                            {t('cancel')}
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            Create Question
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
