"use client"

import { useEffect, useSyncExternalStore } from "react"

export type ScamCheckThemeId =
  | "shield-emerald"
  | "sentinel-crimson"
  | "cobalt-vault"

export interface ScamCheckThemeConfig {
  id: ScamCheckThemeId
  label: string
  shortLabel: string
  description: string
  swatch: string
  canvasBg: string
  shellBg: string
  chromeFrameBg: string
  canvasFrameBorder: string
  headerBg: string
  leftSidebarBg: string
  brandBadge: string
  navActivePill: string
  guestNavActive: string
  avatarBg: string
  radialTop: string
  dotGrid: string
  spotlightDots: string
  chromeGlow: string
  chromeEdgeGlow: string
  heroPill: string
  heroPillIcon: string
  heroAccent: string
  composerBezel: string
  composerFocus: string
  ctaButton: string
  modeActiveChip: string
  pillHover: string
  pillIcon: string
  tier1Icon: string
  tier2Icon: string
  sidebarBg: string
  sidebarHighlight: string
  authPanelBg: string
  authPanelAccent: string
}

export const SCAM_CHECK_THEME_STORAGE_KEY = "scamshield.scam-check-theme"

export const SCAM_CHECK_THEMES: Record<ScamCheckThemeId, ScamCheckThemeConfig> =
  {
    "shield-emerald": {
      id: "shield-emerald",
      label: "Shield Emerald",
      shortLabel: "Khiên Lục Bảo",
      description: "Slate mát · Deep Navy & Emerald",
      swatch: "bg-emerald-600 dark:bg-emerald-400",
      canvasBg: "bg-[#EDF2F4] dark:bg-[#090F19]",
      shellBg: "bg-[#EDF2F4] dark:bg-[#090F19]",
      chromeFrameBg: "bg-[#E2EAEF] dark:bg-[#060B13]",
      canvasFrameBorder:
        "border-slate-900/12 shadow-[0_1px_12px_rgba(15,23,42,0.06)] dark:border-emerald-400/14 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
      headerBg:
        "border-slate-900/12 bg-[#F8FBFC]/88 shadow-[0_1px_12px_rgba(15,23,42,0.05),inset_0_-1px_0_rgba(255,255,255,0.7)] dark:border-emerald-400/15 dark:bg-[#0B1320]/88 dark:shadow-[0_1px_16px_rgba(0,0,0,0.45)]",
      leftSidebarBg:
        "border-slate-900/12 bg-[#F8FBFC]/92 shadow-[1px_0_16px_rgba(15,23,42,0.04),inset_-1px_0_0_rgba(255,255,255,0.7)] dark:border-emerald-400/15 dark:bg-[#0B1320]/94 dark:shadow-[1px_0_20px_rgba(0,0,0,0.45)]",
      brandBadge:
        "border-emerald-500/25 bg-[#0F172A] text-emerald-400 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-300",
      navActivePill:
        "bg-emerald-500/12 ring-1 ring-emerald-600/25 dark:bg-emerald-500/15 dark:ring-emerald-400/25",
      guestNavActive:
        "bg-[#0F172A] text-white shadow-xs dark:bg-emerald-500 dark:text-slate-950",
      avatarBg:
        "bg-[#0F172A] text-white dark:bg-emerald-500 dark:text-slate-950",
      radialTop:
        "bg-[radial-gradient(ellipse_80%_62%_at_50%_0%,rgba(16,185,129,0.26)_0%,rgba(6,182,212,0.10)_42%,transparent_76%)] dark:bg-[radial-gradient(ellipse_80%_64%_at_50%_0%,rgba(16,185,129,0.28)_0%,rgba(6,182,212,0.12)_45%,transparent_76%)]",
      dotGrid:
        "opacity-[0.85] [background-image:radial-gradient(rgba(15,23,42,0.28)_1.35px,transparent_1.35px)] dark:opacity-[0.55] dark:[background-image:radial-gradient(rgba(148,163,184,0.42)_1.35px,transparent_1.35px)]",
      spotlightDots:
        "[background-image:radial-gradient(rgba(5,150,105,0.88)_1.85px,transparent_1.85px)] dark:[background-image:radial-gradient(rgba(52,211,153,0.92)_1.85px,transparent_1.85px)]",
      chromeGlow:
        "bg-[radial-gradient(240px_circle_at_var(--chrome-x,50%)_var(--chrome-y,50%),rgba(16,185,129,0.16),transparent_72%)] dark:bg-[radial-gradient(240px_circle_at_var(--chrome-x,50%)_var(--chrome-y,50%),rgba(52,211,153,0.16),transparent_72%)]",
      chromeEdgeGlow:
        "bg-[radial-gradient(180px_circle_at_var(--chrome-x,50%)_var(--chrome-y,50%),rgba(16,185,129,0.55),transparent_72%)] dark:bg-[radial-gradient(180px_circle_at_var(--chrome-x,50%)_var(--chrome-y,50%),rgba(52,211,153,0.55),transparent_72%)]",
      heroPill:
        "border-emerald-600/25 bg-white/90 text-slate-800 dark:border-emerald-400/25 dark:bg-slate-900/85 dark:text-slate-100",
      heroPillIcon: "text-emerald-600 dark:text-emerald-400",
      heroAccent:
        "text-emerald-700 underline decoration-emerald-500/35 decoration-[3px] underline-offset-[6px] dark:text-emerald-400 dark:decoration-emerald-400/40",
      composerBezel:
        "border-slate-900/12 bg-white/70 shadow-[0_14px_38px_-12px_rgba(15,23,42,0.14),0_2px_6px_rgba(15,23,42,0.06)] dark:border-emerald-400/20 dark:bg-slate-900/75 dark:shadow-[0_18px_48px_-12px_rgba(0,0,0,0.65)]",
      composerFocus:
        "focus-within:border-emerald-600/55 focus-within:shadow-[0_18px_44px_-10px_rgba(16,185,129,0.22),0_0_0_3px_rgba(16,185,129,0.14)] dark:focus-within:border-emerald-400/55 dark:focus-within:shadow-[0_18px_52px_-10px_rgba(16,185,129,0.25),0_0_0_3px_rgba(52,211,153,0.18)]",
      ctaButton:
        "bg-[#0F172A] text-white shadow-sm hover:bg-[#1E293B] dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400",
      modeActiveChip:
        "border-emerald-600/30 bg-emerald-500/10 text-emerald-900 hover:bg-emerald-500/15 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200",
      pillHover:
        "hover:border-emerald-600/40 hover:bg-white hover:text-slate-950 dark:hover:border-emerald-400/40 dark:hover:bg-slate-900",
      pillIcon: "text-emerald-700 dark:text-emerald-400",
      tier1Icon:
        "border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/15 dark:text-emerald-300",
      tier2Icon:
        "border-slate-900/15 bg-slate-900/8 text-slate-800 dark:border-slate-400/25 dark:bg-slate-500/15 dark:text-slate-200",
      sidebarBg:
        "border-slate-900/10 bg-[#F7FAFB]/90 dark:border-emerald-400/12 dark:bg-[#0D1524]/92",
      sidebarHighlight:
        "border-emerald-600/20 bg-emerald-500/[0.06] dark:border-emerald-400/20 dark:bg-emerald-500/10",
      authPanelBg:
        "bg-[#0B1420] text-slate-100 [background-image:radial-gradient(ellipse_90%_70%_at_15%_0%,rgba(16,185,129,0.28),transparent_68%)]",
      authPanelAccent: "text-emerald-400",
    },

    "sentinel-crimson": {
      id: "sentinel-crimson",
      label: "Sentinel Crimson",
      shortLabel: "Cảnh Giác Đỏ",
      description: "Stone ấm · Charcoal & Crimson",
      swatch: "bg-rose-600 dark:bg-rose-400",
      canvasBg: "bg-[#F4F1EE] dark:bg-[#120C0F]",
      shellBg: "bg-[#F4F1EE] dark:bg-[#120C0F]",
      chromeFrameBg: "bg-[#EAE4DF] dark:bg-[#0B0709]",
      canvasFrameBorder:
        "border-stone-900/12 shadow-[0_1px_12px_rgba(28,25,23,0.06)] dark:border-rose-400/14 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
      headerBg:
        "border-stone-900/12 bg-[#FBF9F7]/88 shadow-[0_1px_12px_rgba(28,25,23,0.05),inset_0_-1px_0_rgba(255,255,255,0.75)] dark:border-rose-400/15 dark:bg-[#181014]/88 dark:shadow-[0_1px_16px_rgba(0,0,0,0.48)]",
      leftSidebarBg:
        "border-stone-900/12 bg-[#FBF9F7]/92 shadow-[1px_0_16px_rgba(28,25,23,0.04),inset_-1px_0_0_rgba(255,255,255,0.75)] dark:border-rose-400/15 dark:bg-[#181014]/94 dark:shadow-[1px_0_20px_rgba(0,0,0,0.48)]",
      brandBadge:
        "border-rose-500/25 bg-rose-700 text-white dark:border-rose-400/30 dark:bg-rose-500/20 dark:text-rose-300",
      navActivePill:
        "bg-rose-500/12 ring-1 ring-rose-600/25 dark:bg-rose-500/15 dark:ring-rose-400/25",
      guestNavActive:
        "bg-rose-700 text-white shadow-xs dark:bg-rose-500 dark:text-white",
      avatarBg: "bg-rose-700 text-white dark:bg-rose-500 dark:text-white",
      radialTop:
        "bg-[radial-gradient(ellipse_80%_62%_at_50%_0%,rgba(225,29,72,0.24)_0%,rgba(245,158,11,0.09)_44%,transparent_76%)] dark:bg-[radial-gradient(ellipse_80%_64%_at_50%_0%,rgba(244,63,94,0.28)_0%,rgba(245,158,11,0.10)_45%,transparent_76%)]",
      dotGrid:
        "opacity-[0.82] [background-image:radial-gradient(rgba(28,25,23,0.28)_1.35px,transparent_1.35px)] dark:opacity-[0.52] dark:[background-image:radial-gradient(rgba(251,113,133,0.40)_1.35px,transparent_1.35px)]",
      spotlightDots:
        "[background-image:radial-gradient(rgba(225,29,72,0.88)_1.85px,transparent_1.85px)] dark:[background-image:radial-gradient(rgba(251,113,133,0.92)_1.85px,transparent_1.85px)]",
      chromeGlow:
        "bg-[radial-gradient(240px_circle_at_var(--chrome-x,50%)_var(--chrome-y,50%),rgba(225,29,72,0.14),transparent_72%)] dark:bg-[radial-gradient(240px_circle_at_var(--chrome-x,50%)_var(--chrome-y,50%),rgba(251,113,133,0.16),transparent_72%)]",
      chromeEdgeGlow:
        "bg-[radial-gradient(180px_circle_at_var(--chrome-x,50%)_var(--chrome-y,50%),rgba(225,29,72,0.52),transparent_72%)] dark:bg-[radial-gradient(180px_circle_at_var(--chrome-x,50%)_var(--chrome-y,50%),rgba(251,113,133,0.55),transparent_72%)]",
      heroPill:
        "border-rose-600/25 bg-white/90 text-stone-800 dark:border-rose-400/25 dark:bg-stone-900/85 dark:text-stone-100",
      heroPillIcon: "text-rose-600 dark:text-rose-400",
      heroAccent:
        "text-rose-700 underline decoration-rose-500/35 decoration-[3px] underline-offset-[6px] dark:text-rose-400 dark:decoration-rose-400/40",
      composerBezel:
        "border-stone-900/12 bg-white/75 shadow-[0_14px_38px_-12px_rgba(28,25,23,0.14),0_2px_6px_rgba(28,25,23,0.06)] dark:border-rose-400/20 dark:bg-stone-900/75 dark:shadow-[0_18px_48px_-12px_rgba(0,0,0,0.68)]",
      composerFocus:
        "focus-within:border-rose-600/50 focus-within:shadow-[0_18px_44px_-10px_rgba(225,29,72,0.20),0_0_0_3px_rgba(225,29,72,0.12)] dark:focus-within:border-rose-400/55 dark:focus-within:shadow-[0_18px_52px_-10px_rgba(244,63,94,0.25),0_0_0_3px_rgba(244,63,94,0.18)]",
      ctaButton:
        "bg-rose-700 text-white shadow-sm hover:bg-rose-800 dark:bg-rose-500 dark:text-white dark:hover:bg-rose-400",
      modeActiveChip:
        "border-rose-600/30 bg-rose-500/10 text-rose-900 hover:bg-rose-500/15 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200",
      pillHover:
        "hover:border-rose-600/40 hover:bg-white hover:text-stone-950 dark:hover:border-rose-400/40 dark:hover:bg-stone-900",
      pillIcon: "text-rose-600 dark:text-rose-400",
      tier1Icon:
        "border-rose-600/20 bg-rose-500/10 text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/15 dark:text-rose-300",
      tier2Icon:
        "border-amber-600/20 bg-amber-500/10 text-amber-800 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-300",
      sidebarBg:
        "border-stone-900/10 bg-[#FAF8F6]/90 dark:border-rose-400/12 dark:bg-[#191115]/92",
      sidebarHighlight:
        "border-rose-600/20 bg-rose-500/[0.06] dark:border-rose-400/20 dark:bg-rose-500/10",
      authPanelBg:
        "bg-[#170C11] text-stone-100 [background-image:radial-gradient(ellipse_90%_70%_at_15%_0%,rgba(244,63,94,0.28),transparent_68%)]",
      authPanelAccent: "text-rose-400",
    },

    "cobalt-vault": {
      id: "cobalt-vault",
      label: "Cobalt Vault",
      shortLabel: "An Ninh Ngân Hàng",
      description: "Ice-Slate · Royal Cobalt & Indigo",
      swatch: "bg-blue-600 dark:bg-blue-400",
      canvasBg: "bg-[#ECF1F9] dark:bg-[#070D1D]",
      shellBg: "bg-[#ECF1F9] dark:bg-[#070D1D]",
      chromeFrameBg: "bg-[#E0E8F5] dark:bg-[#040814]",
      canvasFrameBorder:
        "border-blue-950/12 shadow-[0_1px_12px_rgba(30,58,138,0.06)] dark:border-blue-400/14 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
      headerBg:
        "border-blue-950/12 bg-[#F7FAFE]/88 shadow-[0_1px_12px_rgba(30,58,138,0.05),inset_0_-1px_0_rgba(255,255,255,0.75)] dark:border-blue-400/15 dark:bg-[#0A1226]/88 dark:shadow-[0_1px_16px_rgba(0,0,0,0.48)]",
      leftSidebarBg:
        "border-blue-950/12 bg-[#F7FAFE]/92 shadow-[1px_0_16px_rgba(30,58,138,0.04),inset_-1px_0_0_rgba(255,255,255,0.75)] dark:border-blue-400/15 dark:bg-[#0A1226]/94 dark:shadow-[1px_0_20px_rgba(0,0,0,0.48)]",
      brandBadge:
        "border-blue-500/25 bg-blue-700 text-white dark:border-blue-400/30 dark:bg-blue-500/20 dark:text-blue-300",
      navActivePill:
        "bg-blue-500/12 ring-1 ring-blue-600/25 dark:bg-blue-500/15 dark:ring-blue-400/25",
      guestNavActive:
        "bg-blue-700 text-white shadow-xs dark:bg-blue-500 dark:text-slate-950",
      avatarBg: "bg-blue-700 text-white dark:bg-blue-500 dark:text-slate-950",
      radialTop:
        "bg-[radial-gradient(ellipse_80%_62%_at_50%_0%,rgba(37,99,235,0.26)_0%,rgba(99,102,241,0.11)_44%,transparent_76%)] dark:bg-[radial-gradient(ellipse_80%_64%_at_50%_0%,rgba(59,130,246,0.30)_0%,rgba(99,102,241,0.14)_45%,transparent_76%)]",
      dotGrid:
        "opacity-[0.85] [background-image:radial-gradient(rgba(30,58,138,0.28)_1.35px,transparent_1.35px)] dark:opacity-[0.55] dark:[background-image:radial-gradient(rgba(96,165,250,0.42)_1.35px,transparent_1.35px)]",
      spotlightDots:
        "[background-image:radial-gradient(rgba(37,99,235,0.90)_1.85px,transparent_1.85px)] dark:[background-image:radial-gradient(rgba(96,165,250,0.95)_1.85px,transparent_1.85px)]",
      chromeGlow:
        "bg-[radial-gradient(240px_circle_at_var(--chrome-x,50%)_var(--chrome-y,50%),rgba(37,99,235,0.15),transparent_72%)] dark:bg-[radial-gradient(240px_circle_at_var(--chrome-x,50%)_var(--chrome-y,50%),rgba(96,165,250,0.17),transparent_72%)]",
      chromeEdgeGlow:
        "bg-[radial-gradient(180px_circle_at_var(--chrome-x,50%)_var(--chrome-y,50%),rgba(37,99,235,0.52),transparent_72%)] dark:bg-[radial-gradient(180px_circle_at_var(--chrome-x,50%)_var(--chrome-y,50%),rgba(96,165,250,0.55),transparent_72%)]",
      heroPill:
        "border-blue-600/25 bg-white/90 text-slate-800 dark:border-blue-400/25 dark:bg-slate-900/85 dark:text-slate-100",
      heroPillIcon: "text-blue-600 dark:text-blue-400",
      heroAccent:
        "text-blue-700 underline decoration-blue-500/35 decoration-[3px] underline-offset-[6px] dark:text-blue-400 dark:decoration-blue-400/40",
      composerBezel:
        "border-blue-950/12 bg-white/75 shadow-[0_14px_38px_-12px_rgba(30,58,138,0.14),0_2px_6px_rgba(15,23,42,0.06)] dark:border-blue-400/20 dark:bg-slate-900/75 dark:shadow-[0_18px_48px_-12px_rgba(0,0,0,0.68)]",
      composerFocus:
        "focus-within:border-blue-600/55 focus-within:shadow-[0_18px_44px_-10px_rgba(37,99,235,0.22),0_0_0_3px_rgba(37,99,235,0.14)] dark:focus-within:border-blue-400/55 dark:focus-within:shadow-[0_18px_52px_-10px_rgba(59,130,246,0.26),0_0_0_3px_rgba(96,165,250,0.18)]",
      ctaButton:
        "bg-blue-700 text-white shadow-sm hover:bg-blue-800 dark:bg-blue-500 dark:text-slate-950 dark:hover:bg-blue-400",
      modeActiveChip:
        "border-blue-600/30 bg-blue-500/10 text-blue-900 hover:bg-blue-500/15 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-200",
      pillHover:
        "hover:border-blue-600/40 hover:bg-white hover:text-slate-950 dark:hover:border-blue-400/40 dark:hover:bg-slate-900",
      pillIcon: "text-blue-600 dark:text-blue-400",
      tier1Icon:
        "border-blue-600/20 bg-blue-500/10 text-blue-700 dark:border-blue-400/25 dark:bg-blue-500/15 dark:text-blue-300",
      tier2Icon:
        "border-indigo-600/20 bg-indigo-500/10 text-indigo-700 dark:border-indigo-400/25 dark:bg-indigo-500/15 dark:text-indigo-300",
      sidebarBg:
        "border-blue-950/10 bg-[#F6F9FD]/90 dark:border-blue-400/12 dark:bg-[#0B1328]/92",
      sidebarHighlight:
        "border-blue-600/20 bg-blue-500/[0.06] dark:border-blue-400/20 dark:bg-blue-500/10",
      authPanelBg:
        "bg-[#091229] text-slate-100 [background-image:radial-gradient(ellipse_90%_70%_at_15%_0%,rgba(59,130,246,0.32),transparent_68%)]",
      authPanelAccent: "text-blue-400",
    },
  }

export const SCAM_CHECK_THEME_ORDER: readonly ScamCheckThemeId[] = [
  "shield-emerald",
  "sentinel-crimson",
  "cobalt-vault",
]

function isValidThemeId(value: string | null): value is ScamCheckThemeId {
  return (
    value === "shield-emerald" ||
    value === "sentinel-crimson" ||
    value === "cobalt-vault"
  )
}

// Module-level store synced across Sidebar, Header, Shell, and Scam Check pages instantly.
let currentThemeId: ScamCheckThemeId = "shield-emerald"
let hydrated = false
const listeners = new Set<() => void>()

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function hydrateFromStorage() {
  if (hydrated || typeof window === "undefined") return
  hydrated = true
  try {
    const stored = window.localStorage.getItem(SCAM_CHECK_THEME_STORAGE_KEY)
    if (isValidThemeId(stored) && stored !== currentThemeId) {
      currentThemeId = stored
      emitChange()
    }
  } catch {
    // Ignore storage errors in restricted browsing contexts.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === SCAM_CHECK_THEME_STORAGE_KEY &&
      isValidThemeId(event.newValue) &&
      event.newValue !== currentThemeId
    ) {
      currentThemeId = event.newValue
      emitChange()
    }
  }
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage)
  }
  return () => {
    listeners.delete(listener)
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage)
    }
  }
}

function getSnapshot(): ScamCheckThemeId {
  return currentThemeId
}

function getServerSnapshot(): ScamCheckThemeId {
  return "shield-emerald"
}

export function setScamCheckTheme(next: ScamCheckThemeId) {
  if (next === currentThemeId) return
  currentThemeId = next
  hydrated = true
  try {
    window.localStorage.setItem(SCAM_CHECK_THEME_STORAGE_KEY, next)
  } catch {
    // Ignore storage errors.
  }
  emitChange()
}

export function useScamCheckTheme() {
  const themeId = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      hydrateFromStorage()
    })
    return () => window.cancelAnimationFrame(rafId)
  }, [])

  return {
    themeId,
    theme: SCAM_CHECK_THEMES[themeId],
    selectTheme: setScamCheckTheme,
  }
}
