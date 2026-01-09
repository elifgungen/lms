"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { WifiOff, RefreshCw } from "lucide-react"
import { useTranslation } from "@/i18n/LanguageContext"

export default function OfflinePage() {
    const handleRetry = () => {
        window.location.reload()
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="max-w-md w-full text-center">
                <CardHeader>
                    <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                        <WifiOff className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-2xl">Çevrimdışısınız</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                        İnternet bağlantınız yok. Lütfen bağlantınızı kontrol edin ve tekrar deneyin.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        You are offline. Please check your connection and try again.
                    </p>
                    <Button onClick={handleRetry} className="w-full">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Tekrar Dene / Retry
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
