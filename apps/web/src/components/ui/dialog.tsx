"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface DialogContextValue {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

interface DialogProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children: React.ReactNode
}

function Dialog({ open = false, onOpenChange, children }: DialogProps) {
    return (
        <DialogContext.Provider value={{ open, onOpenChange: onOpenChange || (() => { }) }}>
            {children}
        </DialogContext.Provider>
    )
}

interface DialogTriggerProps {
    children: React.ReactNode
    asChild?: boolean
}

function DialogTrigger({ children }: DialogTriggerProps) {
    const context = React.useContext(DialogContext)
    return (
        <div onClick={() => context?.onOpenChange(true)} className="cursor-pointer">
            {children}
        </div>
    )
}

interface DialogContentProps {
    children: React.ReactNode
    className?: string
}

function DialogContent({ children, className }: DialogContentProps) {
    const context = React.useContext(DialogContext)

    if (!context?.open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50"
                onClick={() => context?.onOpenChange(false)}
            />
            {/* Content */}
            <div
                className={cn(
                    "relative z-50 w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg",
                    className
                )}
            >
                <button
                    onClick={() => context?.onOpenChange(false)}
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>
                {children}
            </div>
        </div>
    )
}

interface DialogHeaderProps {
    children: React.ReactNode
    className?: string
}

function DialogHeader({ children, className }: DialogHeaderProps) {
    return (
        <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}>
            {children}
        </div>
    )
}

interface DialogFooterProps {
    children: React.ReactNode
    className?: string
}

function DialogFooter({ children, className }: DialogFooterProps) {
    return (
        <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}>
            {children}
        </div>
    )
}

interface DialogTitleProps {
    children: React.ReactNode
    className?: string
}

function DialogTitle({ children, className }: DialogTitleProps) {
    return (
        <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>
            {children}
        </h2>
    )
}

interface DialogDescriptionProps {
    children: React.ReactNode
    className?: string
}

function DialogDescription({ children, className }: DialogDescriptionProps) {
    return (
        <p className={cn("text-sm text-muted-foreground", className)}>
            {children}
        </p>
    )
}

export {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription
}
