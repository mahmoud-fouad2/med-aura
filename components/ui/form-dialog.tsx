"use client"

import type { ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

/**
 * Shared modal shell for add/edit forms whose trigger is managed externally
 * by the caller (an arbitrary ReactNode, not a single Button-like element) —
 * distinct from ConfirmDialog (a compact yes/no prompt) and from Dialog's own
 * DialogTrigger-based API (for callers happy to hand Dialog one element to
 * wrap). Built on the same Dialog primitives so there's one modal shell
 * underneath both calling conventions.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  maxWidthClassName = "max-w-md",
  preventClose,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  maxWidthClassName?: string
  preventClose?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !preventClose && onOpenChange(next)}>
      <DialogContent className={maxWidthClassName} showCloseButton={false}>
        <DialogHeader className="pe-4">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription className="mt-1">{description}</DialogDescription>}
        </DialogHeader>
        <DialogBody>{children}</DialogBody>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
