"use client"

import React, { useId } from "react"
import { WarningCircle, Check } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

/* ─────────────────────────────────────────────────────────────
 * 1. Reusable Auth Input with Icon & Validation Error
 * ───────────────────────────────────────────────────────────── */
interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  required?: boolean
  icon: React.ReactNode
  error?: string
  actionLabel?: string
  onActionClick?: () => void
  inlineAction?: boolean
  actionDisabled?: boolean
  suffix?: React.ReactNode
}

export function AuthInput({
  label,
  required,
  icon,
  error,
  actionLabel,
  onActionClick,
  inlineAction = false,
  actionDisabled = false,
  suffix,
  id,
  className,
  ...props
}: AuthInputProps) {
  const generatedId = useId()
  const inputId = id || props.name || generatedId

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={inputId}
          className="flex items-center gap-1 text-sm font-semibold text-foreground"
        >
          <span>{label}</span>
          {required && (
            <span className="text-rose-600 dark:text-rose-400">*</span>
          )}
        </label>
        {actionLabel && !inlineAction && (
          <button
            type="button"
            onClick={onActionClick}
            disabled={actionDisabled}
            className="cursor-pointer text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLabel}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
          <input
            id={inputId}
            aria-invalid={!!error}
            aria-required={required}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={cn(
              "h-11 w-full rounded-xl bg-background/85 pr-4 pl-10 text-sm text-foreground placeholder:text-muted-foreground/75",
              suffix && "pr-11",
              "border border-border shadow-2xs transition-[border-color,box-shadow] outline-none",
              "dark:border-white/12 dark:bg-white/[0.04]",
              error
                ? "border-rose-500/70 ring-2 ring-rose-500/20"
                : "focus:border-foreground/40 focus:ring-2 focus:ring-ring/25 dark:focus:border-white/30",
              className
            )}
            {...props}
          />
          {suffix && (
            <div className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">
              {suffix}
            </div>
          )}
        </div>
        {actionLabel && inlineAction && (
          <button
            type="button"
            onClick={onActionClick}
            disabled={actionDisabled}
            className="h-11 shrink-0 cursor-pointer rounded-full border border-border bg-card px-4 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/12"
          >
            {actionLabel}
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 pt-0.5 text-xs font-medium text-rose-700 dark:text-rose-400">
          <WarningCircle
            aria-hidden="true"
            size={14}
            weight="fill"
            className="shrink-0"
          />
          <span id={`${inputId}-error`}>{error}</span>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
 * 2. Reusable Auth Checkbox
 * ───────────────────────────────────────────────────────────── */
interface AuthCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  error?: string
  children: React.ReactNode
  boxClassName?: string
}

export function AuthCheckbox({
  checked,
  onChange,
  error,
  children,
  boxClassName,
}: AuthCheckboxProps) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-2.5 select-none">
        <div className="relative mt-0.5 flex size-4.5 shrink-0 items-center justify-center">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only"
          />
          <div
            className={cn(
              "flex size-4.5 items-center justify-center rounded-sm border transition-colors",
              checked
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background dark:border-white/20 dark:bg-card",
              error && !checked && "border-rose-500",
              boxClassName
            )}
          >
            {checked && <Check aria-hidden="true" size={12} weight="bold" />}
          </div>
        </div>
        <div className="text-xs leading-relaxed text-muted-foreground">
          {children}
        </div>
      </label>
      {error && (
        <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
          <WarningCircle
            aria-hidden="true"
            size={14}
            weight="fill"
            className="shrink-0"
          />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
 * 3. Reusable Left Card Feature / Privilege Pill
 * ───────────────────────────────────────────────────────────── */
interface PrivilegePillProps {
  icon: React.ReactNode
  title: string
  description: string
}

export function PrivilegePill({
  icon,
  title,
  description,
}: PrivilegePillProps) {
  return (
    <div className="flex items-start gap-3.5 rounded-xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur-xs">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white">
        {icon}
      </div>
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs leading-relaxed text-slate-300/85">
          {description}
        </p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
 * 4. Reusable Left Card Social Proof Banner
 * ───────────────────────────────────────────────────────────── */
interface SocialProofBannerProps {
  avatars: { text: string; bg: string; color: string }[]
  badgeText: string
  title: string
  subtitle: string
}

export function SocialProofBanner({
  avatars,
  badgeText,
  title,
  subtitle,
}: SocialProofBannerProps) {
  return (
    <div className="relative z-10 mt-8 border-t border-white/10 pt-5">
      <div className="flex items-center gap-4">
        <div className="flex -space-x-2.5">
          {avatars.map((item, idx) => (
            <div
              key={idx}
              className="flex size-9 items-center justify-center rounded-full border-2 border-slate-900 text-xs font-bold"
              style={{ backgroundColor: item.bg, color: item.color }}
            >
              {item.text}
            </div>
          ))}
          <div className="flex size-9 items-center justify-center rounded-full border-2 border-slate-900 bg-white/90 text-xs font-bold text-slate-900 tabular-nums">
            {badgeText}
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-white">{title}</p>
          <p className="text-xs text-slate-300/80">{subtitle}</p>
        </div>
      </div>
    </div>
  )
}
