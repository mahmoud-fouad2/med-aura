"use client"

import type { ReactNode } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "@/lib/utils"

/**
 * Shared modal shell for add/edit forms — distinct from ConfirmDialog (which
 * is a compact yes/no prompt). Header and an optional footer stay fixed;
 * only the middle content region scrolls, so a long form never pushes the
 * save/cancel buttons off-screen or hides the title.
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
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!preventClose) onOpenChange(next)
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[3px] ease-premium transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <DialogPrimitive.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[92vw] flex-col rounded-2xl border border-border bg-card shadow-elegant-lg outline-none ease-premium transition-all duration-200 [transform:translate(-50%,-50%)] data-ending-style:opacity-0 data-ending-style:[transform:translate(-50%,calc(-50%+0.5rem))_scale(0.97)] data-starting-style:opacity-0 data-starting-style:[transform:translate(-50%,calc(-50%+0.5rem))_scale(0.97)]",
            maxWidthClassName
          )}
        >
          <div className="shrink-0 border-b border-border/60 px-5 py-4">
            <DialogPrimitive.Title className="font-heading text-base font-bold text-foreground">
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <div className="flex shrink-0 justify-end gap-2 border-t border-border/60 px-5 py-4">
              {footer}
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export { DialogPrimitive }
