"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Users, Search, GraduationCap, ClipboardList, Loader2 } from "lucide-react"
import { usersService, StudentWithCourses } from "@/lib/services/users"

export default function InstructorStudentsPage() {
    const [search, setSearch] = useState("")
    const [students, setStudents] = useState<StudentWithCourses[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                setLoading(true)
                const data = await usersService.getStudents()
                setStudents(data)
            } catch (err: any) {
                console.error("Failed to load students:", err)
                setError(err?.response?.data?.error || err?.message || "Öğrenciler yüklenemedi")
            } finally {
                setLoading(false)
            }
        }
        fetchStudents()
    }, [])

    const filtered = useMemo(() => {
        const term = search.toLowerCase()
        return students.filter(
            (s) =>
                s.name?.toLowerCase().includes(term) ||
                s.email.toLowerCase().includes(term) ||
                s.courses.some((c) => c.title.toLowerCase().includes(term))
        )
    }, [search, students])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6 text-center">
                <p className="text-red-400">{error}</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Öğrencilerim</h1>
                    <p className="text-gray-400">Sınav ve ödev planlayacağınız öğrenci listesi.</p>
                </div>
                <Badge variant="outline" className="gap-1 border-cyan-500/30 text-cyan-400">
                    <Users className="h-4 w-4" /> {students.length}
                </Badge>
            </div>

            <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardHeader className="pb-2">
                    <CardTitle className="text-white">Sınıf Listesi</CardTitle>
                    <CardDescription className="text-gray-400">Öğrenci bazlı sınav/ödev durumu</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="relative max-w-md">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="İsim, e-posta veya ders ara..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8 bg-white/5 border-white/10 text-white placeholder-gray-500"
                            />
                        </div>
                    </div>
                    <div className="rounded-md border border-white/10 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-white/10 hover:bg-white/5">
                            <TableHead className="text-gray-400">Öğrenci</TableHead>
                            <TableHead className="text-gray-400">Dersler</TableHead>
                            <TableHead className="text-gray-400">Sınav</TableHead>
                            <TableHead className="text-gray-400">Ödev</TableHead>
                            <TableHead className="text-gray-400 text-right">Detay</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map((s) => (
                            <TableRow key={s.id} className="border-white/10 hover:bg-white/5">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-white">{s.name || "-"}</span>
                                                <span className="text-xs text-gray-500">{s.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm space-y-1">
                                            <div className="flex flex-wrap gap-1">
                                                {s.courses.map((c) => (
                                                    <Badge
                                                        key={c.id}
                                                        variant="outline"
                                                        className="bg-purple-500/20 text-purple-400 border-purple-500/30"
                                                    >
                                                        {c.title}
                                                    </Badge>
                                                ))}
                                                {s.courses.length === 0 && (
                                                    <span className="text-gray-500 text-sm">Kayıtlı ders yok</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={s.pendingExams > 0
                                                    ? "gap-1 bg-orange-500/20 text-orange-400 border-orange-500/30"
                                                    : "gap-1 bg-green-500/20 text-green-400 border-green-500/30"
                                                }
                                            >
                                                <GraduationCap className="h-3 w-3" />
                                                {s.pendingExams} bekleyen
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={s.pendingAssignments > 0
                                                    ? "gap-1 bg-orange-500/20 text-orange-400 border-orange-500/30"
                                                    : "gap-1 bg-green-500/20 text-green-400 border-green-500/30"
                                                }
                                        >
                                            <ClipboardList className="h-3 w-3" />
                                            {s.pendingAssignments} bekleyen
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link
                                            href={`/instructor/students/${s.id}`}
                                            className="text-cyan-400 hover:text-cyan-300 text-sm"
                                        >
                                            Görüntüle
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filtered.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                                        {students.length === 0
                                            ? "Henüz derslerinize kayıtlı öğrenci yok."
                                            : "Arama sonucu bulunamadı."
                                        }
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
