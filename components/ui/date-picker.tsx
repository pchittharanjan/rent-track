"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  value?: string // ISO date string (YYYY-MM-DD)
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  id?: string
  required?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  id,
  required,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const date = value ? new Date(value) : undefined

  const formatDate = (date: Date | undefined) => {
    if (!date) return ""
    return format(date, "MMM dd, yyyy")
  }

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const isoString = selectedDate.toISOString().split("T")[0] // YYYY-MM-DD
      onChange?.(isoString)
      setOpen(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    // Try to parse the input as a date
    const parsedDate = new Date(inputValue)
    if (!isNaN(parsedDate.getTime())) {
      const isoString = parsedDate.toISOString().split("T")[0]
      onChange?.(isoString)
    }
  }

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 p-0 hover:bg-transparent"
            )}
            type="button"
          >
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Pick a date</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <Input
        id={id}
        type="text"
        value={date ? formatDate(date) : ""}
        placeholder={placeholder}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        className="pr-10"
        required={required}
      />
    </div>
  )
}
