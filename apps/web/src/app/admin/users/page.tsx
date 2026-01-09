"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Users, Search, Loader2 } from "lucide-react"
import { usersService, User } from "@/lib/services/users"

const roleLabel: Record<string, string> = {
    student: "Öğrenci",
    instructor: "Eğitmen",
    assistant: "Asistan",
    admin: "Admin",
    super_admin: "Süper Admin",
    guest: "Misafir",
};

const roleColors: Record<string, string> = {
    student: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    instructor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    assistant: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    admin: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    super_admin: "bg-red-500/20 text-red-400 border-red-500/30",
    guest: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function AdminUsersPage() {
    const [search, setSearch] = useState("")
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true)
                const data = await usersService.getAll()
                setUsers(data)
            } catch (err: any) {
                console.error("Failed to load users:", err)
                setError(err?.response?.data?.error || err?.message || "Kullanıcılar yüklenemedi")
            } finally {
                setLoading(false)
            }
        }
        fetchUsers()
    }, [])

    const filtered = useMemo(() => {
        const term = search.toLowerCase()
        return users.filter(
            (u) =>
                u.name?.toLowerCase().includes(term) ||
                u.email.toLowerCase().includes(term) ||
                u.roles.some(r => r.includes(term) || roleLabel[r]?.toLowerCase().includes(term))
        )
    }, [search, users])

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
                    <h1 className="text-2xl font-bold tracking-tight text-white">Kullanıcılar</h1>
                    <p className="text-gray-400">Tüm roller için kayıtlı kullanıcı listesi.</p>
                </div>
                <Badge variant="outline" className="gap-1 border-cyan-500/30 text-cyan-400">
                    <Users className="h-4 w-4" /> {users.length}
                </Badge>
            </div>

            <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardHeader className="pb-2">
                    <CardTitle className="text-white">Kullanıcı Yönetimi</CardTitle>
                    <CardDescription className="text-gray-400">Kayıtlı eğitmen ve öğrencileri inceleyin.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="relative max-w-md">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="İsim, e-posta veya rol ara..."
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
                                    <TableHead className="text-gray-400">İsim</TableHead>
                                    <TableHead className="text-gray-400">E-posta</TableHead>
                                    <TableHead className="text-gray-400">Rol</TableHead>
                                    <TableHead className="text-gray-400">Durum</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((user) => (
                                    <TableRow key={user.id} className="border-white/10 hover:bg-white/5">
                                        <TableCell className="font-medium text-white">{user.name || "-"}</TableCell>
                                        <TableCell className="text-gray-300">{user.email}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-1 flex-wrap">
                                                {user.roles.map(role => (
                                                    <Badge
                                                        key={role}
                                                        variant="outline"
                                                        className={roleColors[role] || roleColors.guest}
                                                    >
                                                        {roleLabel[role] || role}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={user.status === "active"
                                                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                                                    : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                                                }
                                            >
                                                {user.status === "active" ? "Aktif" : "Pasif"}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-gray-500">
                                            Kullanıcı bulunamadı.
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
