"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type SwitchProps = {
    checked?: boolean
    defaultChecked?: boolean
    onCheckedChange?: (checked: boolean) => void
    disabled?: boolean
    className?: string
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
    ({ checked, defaultChecked, onCheckedChange, disabled, className }, ref) => (
        <label
            className={cn(
                "relative inline-flex h-6 w-10 cursor-pointer items-center rounded-full bg-muted transition-colors",
                checked ? "bg-primary" : "bg-muted",
                disabled && "opacity-60 cursor-not-allowed",
                className
            )}
        >
            <input
                ref={ref}
                type="checkbox"
                className="sr-only"
                checked={checked}
                defaultChecked={defaultChecked}
                onChange={(e) => onCheckedChange?.(e.target.checked)}
                disabled={disabled}
            />
            <span
                className={cn(
                    "inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform",
                    checked ? "translate-x-4" : "translate-x-1"
                )}
            />
        </label>
    )
)
Switch.displayName = "Switch"

export { Switch }
