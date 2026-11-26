"use client"

import type { ComponentPropsWithoutRef, ReactNode } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export type ExpandableActionVariant =
  | "outline"
  | "danger"
  | "warning"
  | "ghost"
  | "primary"

const variantClasses: Record<ExpandableActionVariant, string> = {
  outline:
    "border border-black/10 bg-card text-foreground shadow-2xs hover:bg-muted dark:border-white/10",
  danger:
    "border border-rose-500/25 bg-rose-500/10 text-rose-800 hover:bg-rose-500/20 dark:border-rose-400/25 dark:bg-rose-500/15 dark:text-rose-200 dark:hover:bg-rose-500/25",
  warning:
    "border border-amber-500/25 bg-amber-500/10 text-amber-900 hover:bg-amber-500/20 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25",
  ghost:
    "border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
  primary:
    "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
}

const baseActionClass =
  "group/expand inline-flex min-h-10 min-w-10 shrink-0 cursor-pointer items-center justify-center rounded-full px-2.5 text-xs font-semibold transition-[background-color,border-color,color,opacity,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none"

function ExpandableLabel({
  label,
  expanded = false,
}: {
  label: string
  expanded?: boolean
}) {
  return (
    <span
      className={cn(
        "grid transition-[grid-template-columns,opacity,margin] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
        expanded
          ? "ml-1.5 mr-1 grid-cols-[1fr] opacity-100"
          : "ml-0 mr-0 grid-cols-[0fr] opacity-0 group-hover/expand:ml-1.5 group-hover/expand:mr-1 group-hover/expand:grid-cols-[1fr] group-hover/expand:opacity-100 group-focus-visible/expand:ml-1.5 group-focus-visible/expand:mr-1 group-focus-visible/expand:grid-cols-[1fr] group-focus-visible/expand:opacity-100"
      )}
    >
      <span className="overflow-hidden whitespace-nowrap">{label}</span>
    </span>
  )
}

export interface ExpandableIconButtonProps
  extends Omit<ComponentPropsWithoutRef<"button">, "children"> {
  icon: ReactNode
  label: string
  variant?: ExpandableActionVariant
  /** Keeps label expanded during transient feedback/loading (e.g. "Đã chép", "Đang xuất..."). */
  expanded?: boolean
}

export function ExpandableIconButton({
  icon,
  label,
  variant = "outline",
  expanded = false,
  className,
  type = "button",
  "aria-label": ariaLabel,
  ...rest
}: ExpandableIconButtonProps) {
  return (
    <button
      type={type}
      aria-label={ariaLabel ?? label}
      title={label}
      className={cn(baseActionClass, variantClasses[variant], className)}
      {...rest}
    >
      <span className="inline-flex shrink-0 items-center justify-center">
        {icon}
      </span>
      <ExpandableLabel label={label} expanded={expanded} />
    </button>
  )
}

export interface ExpandableIconLinkProps
  extends Omit<ComponentPropsWithoutRef<typeof Link>, "children"> {
  icon: ReactNode
  label: string
  variant?: ExpandableActionVariant
  expanded?: boolean
}

export function ExpandableIconLink({
  icon,
  label,
  variant = "outline",
  expanded = false,
  className,
  "aria-label": ariaLabel,
  ...rest
}: ExpandableIconLinkProps) {
  return (
    <Link
      aria-label={ariaLabel ?? label}
      title={label}
      className={cn(baseActionClass, variantClasses[variant], className)}
      {...rest}
    >
      <span className="inline-flex shrink-0 items-center justify-center">
        {icon}
      </span>
      <ExpandableLabel label={label} expanded={expanded} />
    </Link>
  )
}
