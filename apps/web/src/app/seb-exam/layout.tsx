/**
 * SEB Exam Layout - Completely isolated, no navigation
 * This layout ensures students in SEB mode can ONLY see the exam page
 */
export default function SebExamLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-background">
            {/* No header, no sidebar, no navigation - completely locked */}
            {children}
        </div>
    )
}
