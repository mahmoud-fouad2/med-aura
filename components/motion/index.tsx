"use client"

import { motion, useReducedMotion, type Variants } from "motion/react"
import type { ReactNode } from "react"

const EASE = [0.22, 1, 0.36, 1] as const

/** Fade + slide-up when scrolled into view (once). Respects reduced motion. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 18,
}: {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/** Container that staggers its <StaggerItem> children into view. */
export function Stagger({
  children,
  className,
  gap = 0.08,
}: {
  children: ReactNode
  className?: string
  gap?: number
}) {
  const variants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: gap } },
  }
  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
  y = 18,
}: {
  children: ReactNode
  className?: string
  y?: number
}) {
  const reduce = useReducedMotion()
  const variants: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
  }
  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  )
}

/** Simple mount fade-in (for above-the-fold content, not scroll-triggered). */
export function FadeIn({
  children,
  className,
  delay = 0,
  y = 14,
}: {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}
