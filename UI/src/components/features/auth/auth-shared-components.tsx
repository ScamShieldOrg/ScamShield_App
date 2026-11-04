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
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputId}
          className="flex items-center gap-1 text-sm font-semibold text-[#131B2E] dark:text-foreground"
        >
          <span>{label}</span>
          {required && <span className="text-[#BA1A1A]">*</span>}
        </label>
        {actionLabel && !inlineAction && (
          <button
            type="button"
            onClick={onActionClick}
            disabled={actionDisabled}
            className="text-[11px] font-semibold tracking-wider text-[#545D7C] uppercase hover:text-[#131B2E] dark:text-muted-foreground dark:hover:text-foreground"
          >
            {actionLabel}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[#76767E]">
            {icon}
          </div>
          <input
            id={inputId}
            aria-invalid={!!error}
            aria-required={required}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={cn(
              "h-12 w-full rounded-lg bg-white pr-4 pl-11 text-sm",
              suffix && "pr-11",
              "text-[#131B2E] placeholder:text-[#76767E]/70",
              "border border-[#C6C6CE] shadow-xs transition-all outline-none",
              "dark:border-border dark:bg-muted/30 dark:text-foreground dark:placeholder:text-muted-foreground",
              error
                ? "border-[#BA1A1A] ring-2 ring-[#BA1A1A]/20 dark:border-destructive dark:ring-destructive/30"
                : "focus:border-[#0B132B] focus:ring-2 focus:ring-[#0B132B]/20 dark:focus:border-primary dark:focus:ring-ring/40",
              className
            )}
            {...props}
          />
          {suffix && (
            <div className="absolute top-1/2 right-3.5 -translate-y-1/2 text-[#76767E]">
              {suffix}
            </div>
          )}
        </div>
        {actionLabel && inlineAction && (
          <button
            type="button"
            onClick={onActionClick}
            disabled={actionDisabled}
            className="h-12 shrink-0 rounded-lg border border-input bg-muted/30 px-3 text-xs font-semibold text-foreground shadow-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLabel}
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1 pt-0.5 text-xs text-[#BA1A1A] dark:text-red-400">
          <WarningCircle size={14} weight="fill" className="shrink-0" />
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
              "flex size-4.5 items-center justify-center rounded-xs border transition-colors",
              checked
                ? "border-[#131A33] bg-[#131A33] text-white dark:border-primary dark:bg-primary"
                : "border-[#767676] bg-white dark:border-border dark:bg-card",
              error && !checked && "border-[#BA1A1A]",
              boxClassName
            )}
          >
            {checked && <Check size={12} weight="bold" />}
          </div>
        </div>
        <div className="text-xs leading-relaxed text-[#45464D] dark:text-muted-foreground">
          {children}
        </div>
      </label>
      {error && (
        <div className="mt-1 flex items-center gap-1 text-xs text-[#BA1A1A] dark:text-red-400">
          <WarningCircle size={14} weight="fill" className="shrink-0" />
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
    <div className="flex items-start gap-3.5 rounded-xl border border-white/5 bg-white/5 p-3 backdrop-blur-xs">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#BDC5E9]/20 text-[#DBE1FF]">
        {icon}
      </div>
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs leading-relaxed text-[#DAE2FD]/70">
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
        <div className="flex -space-x-3">
          {avatars.map((item, idx) => (
            <div
              key={idx}
              className="flex size-9 items-center justify-center rounded-full border-2 border-[#131A33] text-xs font-bold"
              style={{ backgroundColor: item.bg, color: item.color }}
            >
              {item.text}
            </div>
          ))}
          <div className="flex size-9 items-center justify-center rounded-full border-2 border-[#131A33] bg-[#DBE1FF] text-[11px] font-bold text-[#131A33]">
            {badgeText}
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-white">{title}</p>
          <p className="text-xs text-[#DAE2FD]/70">{subtitle}</p>
        </div>
      </div>
    </div>
  )
}
