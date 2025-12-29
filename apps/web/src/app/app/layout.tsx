import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import AuthGuard from "@/components/auth/AuthGuard"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthGuard>
            <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
                <Sidebar className="hidden lg:block border-r" />
                <div className="flex flex-col">
                    <Header />
                    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
                        {children}
                    </main>
                </div>
            </div>
        </AuthGuard>
    )
}
