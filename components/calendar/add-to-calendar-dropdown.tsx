"use client"

import * as React from "react"
import { Calendar, Download, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  buildIcsContent,
  type CalendarEvent,
} from "@/lib/calendar"

export function AddToCalendarDropdown({
  event,
  className,
}: {
  event: CalendarEvent
  className?: string
}) {
  const handleDownloadIcs = () => {
    const ics = buildIcsContent(event)
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `medaura-consultation-${event.startTime.toISOString().slice(0, 10)}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const googleUrl = buildGoogleCalendarUrl(event)
  const outlookUrl = buildOutlookCalendarUrl(event)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={`rounded-xl border-border/80 bg-card hover:bg-secondary/40 text-xs font-semibold ${className ?? ""}`}
          >
            <Calendar className="size-3.5 text-primary" />
            إضافة إلى التقويم
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5 shadow-elegant">
        <DropdownMenuItem
          render={
            <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between w-full">
              <span>Google Calendar</span>
              <ExternalLink className="size-3 text-muted-foreground" />
            </a>
          }
          className="rounded-lg cursor-pointer text-xs font-medium"
        />
        <DropdownMenuItem
          render={
            <a href={outlookUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between w-full">
              <span>Outlook Calendar</span>
              <ExternalLink className="size-3 text-muted-foreground" />
            </a>
          }
          className="rounded-lg cursor-pointer text-xs font-medium"
        />
        <DropdownMenuItem
          onClick={handleDownloadIcs}
          className="rounded-lg cursor-pointer text-xs font-medium flex items-center justify-between"
        >
          <span>Apple / iCal (.ics)</span>
          <Download className="size-3 text-muted-foreground" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
