"use client"

import { useEffect, useRef, useState } from "react"

interface JitsiMeetProps {
    roomId: string
    displayName?: string
    email?: string
    onClose?: () => void
    height?: string
}

export function JitsiMeet({ roomId, displayName, email, onClose, height = "600px" }: JitsiMeetProps) {
    const [isLoading, setIsLoading] = useState(true)

    // Build Jitsi URL with config
    const jitsiUrl = `https://meet.jit.si/${encodeURIComponent(roomId)}#userInfo.displayName="${encodeURIComponent(displayName || 'Katılımcı')}"&config.startWithAudioMuted=true&config.startWithVideoMuted=false&config.prejoinPageEnabled=false&config.disableDeepLinking=true&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_CHROME_EXTENSION_BANNER=false`

    return (
        <div className="relative rounded-lg overflow-hidden bg-slate-900" style={{ height }}>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                        <p className="text-white">Canlı derse bağlanılıyor...</p>
                    </div>
                </div>
            )}
            <iframe
                src={jitsiUrl}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                className="w-full h-full border-0"
                onLoad={() => setIsLoading(false)}
            />
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                    Dersi Bitir
                </button>
            )}
        </div>
    )
}

export default JitsiMeet
