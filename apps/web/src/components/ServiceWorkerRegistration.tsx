"use client"

import { useEffect } from "react"

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
            window.addEventListener("load", () => {
                navigator.serviceWorker
                    .register("/sw.js")
                    .then((registration) => {
                        console.log("[SW] Registration successful:", registration.scope)
                    })
                    .catch((error) => {
                        console.log("[SW] Registration failed:", error)
                    })
            })
        }
    }, [])

    return null
}
