"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { }

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <select
                className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none",
                    className
                )}
                ref={ref}
                {...props}
            >
                {children}
            </select>
        )
    }
)
Select.displayName = "Select"

interface SelectContextValue {
    value: string
    onValueChange: (value: string) => void
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

interface SelectRootProps {
    value: string
    onValueChange: (value: string) => void
    children: React.ReactNode
}

function SelectRoot({ value, onValueChange, children }: SelectRootProps) {
    return (
        <SelectContext.Provider value={{ value, onValueChange }}>
            <div className="relative">{children}</div>
        </SelectContext.Provider>
    )
}

interface SelectTriggerProps {
    children: React.ReactNode
    className?: string
}

function SelectTrigger({ children, className }: SelectTriggerProps) {
    return (
        <div
            className={cn(
                "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer",
                className
            )}
        >
            {children}
            <ChevronDown className="h-4 w-4 opacity-50" />
        </div>
    )
}

interface SelectValueProps {
    placeholder?: string
}

function SelectValue({ placeholder }: SelectValueProps) {
    const context = React.useContext(SelectContext)
    return <span>{context?.value || placeholder}</span>
}

interface SelectContentProps {
    children: React.ReactNode
}

function SelectContent({ children }: SelectContentProps) {
    const [open, setOpen] = React.useState(false)
    return open ? (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
            {children}
        </div>
    ) : null
}

interface SelectItemProps {
    value: string
    children: React.ReactNode
}

function SelectItem({ value, children }: SelectItemProps) {
    const context = React.useContext(SelectContext)
    return (
        <div
            className={cn(
                "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                context?.value === value && "bg-accent"
            )}
            onClick={() => context?.onValueChange(value)}
        >
            {children}
        </div>
    )
}

// Simple implementation using native select with styled wrapper
interface SimpleSelectProps {
    value: string
    onValueChange: (value: string) => void
    children: React.ReactNode
    className?: string
}

function SimpleSelect({ value, onValueChange, children, className }: SimpleSelectProps) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
                className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none pr-8",
                    className
                )}
            >
                {children}
            </select>
            <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
        </div>
    )
}

export {
    Select,
    SelectRoot as SelectProvider,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    SimpleSelect
}
