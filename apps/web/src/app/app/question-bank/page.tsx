"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { questionBankService } from "@/lib/services/questionBank"
import { QuestionBank } from "@/types/api"
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Plus, Search } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"

export default function QuestionBankPage() {
    const [banks, setBanks] = useState<QuestionBank[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const { t } = useTranslation()

    useEffect(() => {
        const fetchBanks = async () => {
            try {
                const data = await questionBankService.getAll()
                setBanks(data)
            } catch (err) {
                setError("Soru bankaları yüklenemedi")
            } finally {
                setLoading(false)
            }
        }
        fetchBanks()
    }, [])

    const filtered = banks.filter(b =>
        (b.title || "").toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleCreate = async () => {
        try {
            const newBank = await questionBankService.create({
                title: "New Question Bank",
                description: "Created via quick add",
            });
            setBanks([newBank, ...banks]);
        } catch {
            setError("Yeni bank oluşturulamadı")
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">{t('question_banks')}</h1>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" /> {t('create_new_bank')}
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>{t('question_banks')}</CardTitle>
                    <CardDescription>
                        {t('manage_banks_desc')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center py-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('search_banks')}
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
                                    <TableHead>{t('question_count')}</TableHead>
                                    <TableHead>{t('created_at')}</TableHead>
                                    <TableHead className="text-right">{t('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!loading && filtered.length > 0 ? filtered.map((bank) => (
                                    <TableRow key={bank.id}>
                                        <TableCell className="font-medium">
                                            <Link href={`/app/question-bank/${bank.id}`} className="hover:underline">
                                                {bank.title}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{bank.questionCount ?? 0}</TableCell>
                                        <TableCell>{bank.createdAt ? new Date(bank.createdAt).toLocaleDateString() : "-"}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/app/question-bank/${bank.id}`}>{t('edit')}</Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            {loading ? "Loading..." : "No results."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {error && <p className="text-sm text-destructive mt-2">{error}</p>}
                </CardContent>
            </Card>
        </div>
    )
}
