"use client"

import { useState, useTransition, isValidElement, cloneElement } from "react"
import type { ReactElement } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * In-app replacement for `window.confirm()` — native browser dialogs can't be
 * themed, break RTL/keyboard flow, and hang headless/automated renderers.
 * Closes on Escape, outside click, or the close button (Base UI Dialog
 * default). `onConfirm` returning `false` keeps the dialog open (e.g. the
 * server rejected the action) so the caller's toast stays visible and the
 * user can retry without re-opening.
 *
 * Two usage modes:
 * - Uncontrolled (pass `trigger`): the dialog owns its own open state and
 *   the trigger element opens it directly. Fine as long as the trigger and
 *   the dialog live in the same part of the tree.
 * - Controlled (pass `open`/`onOpenChange`, omit `trigger`): for triggers
 *   that live inside a *different* dismissible layer — e.g. a dropdown menu
 *   item. Rendering a ConfirmDialog nested inside a Menu.Popup breaks it:
 *   selecting the item closes the menu, which unmounts the ConfirmDialog
 *   (and its portal) before it can ever show. Render the dialog as a
 *   *sibling* of the menu instead, lift the open flag to the parent, and
 *   have the menu item's onClick just flip that flag.
 */
export function ConfirmDialog({
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  title,
  description,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  tone = "default",
  onConfirm,
}: {
  trigger?: ReactElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: "default" | "destructive"
  onConfirm: () => Promise<boolean | void> | boolean | void
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const [pending, start] = useTransition()

  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : uncontrolledOpen
  const setOpen = isControlled ? (onOpenChangeProp ?? (() => {})) : setUncontrolledOpen

  const triggerEl =
    trigger && isValidElement<{ onClick?: (e: unknown) => void }>(trigger)
      ? cloneElement(trigger, {
          onClick: (e: unknown) => {
            ;(trigger.props as { onClick?: (e: unknown) => void }).onClick?.(e)
            setOpen(true)
          },
        })
      : trigger

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next)
      }}
    >
      {triggerEl}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-elegant-lg outline-none transition duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="flex items-start gap-3">
            {tone === "destructive" && (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <TriangleAlert className="size-5" />
              </span>
            )}
            <div className="min-w-0 flex-1 text-start">
              <DialogPrimitive.Title className="font-heading text-base font-bold text-foreground">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <DialogPrimitive.Close
              render={<Button type="button" variant="ghost" size="sm" disabled={pending} />}
            >
              {cancelLabel}
            </DialogPrimitive.Close>
            <Button
              type="button"
              size="sm"
              variant={tone === "destructive" ? "destructive" : "default"}
              loading={pending}
              onClick={() =>
                start(async () => {
                  const result = await onConfirm()
                  if (result !== false) setOpen(false)
                })
              }
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
