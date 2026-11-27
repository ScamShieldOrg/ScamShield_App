"use client"

import { useCallback, useRef, type RefObject } from "react"
import { cn } from "@/lib/utils"
import type { ScamCheckThemeConfig } from "@/components/features/check/scam-check-theme"

const CHROME_GRAIN_DATA_URI =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

export function useChromePointerGlow() {
  const glowLayerRef = useRef<HTMLDivElement>(null)

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.pointerType !== "mouse") return
      const layer = glowLayerRef.current
      if (!layer) return
      const rect = event.currentTarget.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      layer.style.setProperty("--chrome-x", `${x}px`)
      layer.style.setProperty("--chrome-y", `${y}px`)
      layer.style.opacity = "1"
    },
    []
  )

  const handlePointerLeave = useCallback(() => {
    const layer = glowLayerRef.current
    if (layer) {
      layer.style.opacity = "0"
    }
  }, [])

  return {
    glowLayerRef,
    handlePointerMove,
    handlePointerLeave,
  }
}

interface ChromeAmbientOverlayProps {
  glowLayerRef: RefObject<HTMLDivElement | null>
  theme: ScamCheckThemeConfig
  /** Which border receives the interactive specular hairline accent. */
  edge?: "bottom" | "right" | "left" | "none"
}

export function ChromeAmbientOverlay({
  glowLayerRef,
  theme,
  edge = "none",
}: ChromeAmbientOverlayProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Subtle tactile matte grain so Light Mode chrome never looks flat */}
      <div
        style={{ backgroundImage: CHROME_GRAIN_DATA_URI }}
        className="absolute inset-0 opacity-[0.028] mix-blend-multiply dark:opacity-[0.04] dark:mix-blend-screen"
      />

      {/* Subtle micro dot-grid texture */}
      <div className="absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgba(15,23,42,0.14)_1px,transparent_1px)] [background-size:18px_18px] dark:opacity-[0.18] dark:[background-image:radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)]" />

      {/* Pointer-tracking ambient wash + optional hairline edge glow (zero re-renders) */}
      <div
        ref={glowLayerRef}
        style={{ opacity: 0 }}
        className="absolute inset-0 transition-opacity duration-300 motion-reduce:hidden"
      >
        <div className={cn("absolute inset-0", theme.chromeGlow)} />
        {edge !== "none" && (
          <div
            className={cn(
              "absolute",
              edge === "bottom" && "inset-x-0 bottom-0 h-[1.5px]",
              edge === "right" && "inset-y-0 right-0 w-[1.5px]",
              edge === "left" && "inset-y-0 left-0 w-[1.5px]",
              theme.chromeEdgeGlow
            )}
          />
        )}
      </div>
    </div>
  )
}
