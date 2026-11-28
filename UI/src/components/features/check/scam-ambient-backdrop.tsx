"use client"

import { useCallback, useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { ScamCheckThemeConfig } from "./scam-check-theme"

interface ScamAmbientBackdropProps {
  theme: ScamCheckThemeConfig
  className?: string
  children: ReactNode
}

// Inline SVG fractal noise for tactile matte surface feel (2-4% opacity)
const FILM_GRAIN_DATA_URI =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

export function ScamAmbientBackdrop({
  theme,
  className,
  children,
}: ScamAmbientBackdropProps) {
  const containerRef = useRef<HTMLElement>(null)
  const spotlightRef = useRef<HTMLDivElement>(null)

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.pointerType !== "mouse") return
      const el = containerRef.current
      const spot = spotlightRef.current
      if (!el || !spot) return
      const rect = el.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      spot.style.setProperty("--spot-x", `${x}px`)
      spot.style.setProperty("--spot-y", `${y}px`)
      spot.style.opacity = "1"
    },
    []
  )

  const handlePointerLeave = useCallback(() => {
    const spot = spotlightRef.current
    if (spot) {
      spot.style.opacity = "0"
    }
  }, [])

  return (
    <section
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn("relative", className)}
    >
      {/* 1. Atmospheric Radial Wash */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-[560px] transition-all duration-300",
          theme.radialTop
        )}
      />

      {/* 2. Base Prominent Dot-Grid */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 [background-size:22px_22px] [mask-image:radial-gradient(ellipse_92%_85%_at_50%_32%,#000_48%,transparent_100%)]",
          theme.dotGrid
        )}
      />

      {/* 3. Interactive Pointer-Tracking Colored Dot-Grid Spotlight (zero re-renders) */}
      <div
        ref={spotlightRef}
        aria-hidden="true"
        style={{
          opacity: 0,
          maskImage:
            "radial-gradient(240px circle at var(--spot-x, 50%) var(--spot-y, 30%), #000 0%, transparent 74%)",
          WebkitMaskImage:
            "radial-gradient(240px circle at var(--spot-x, 50%) var(--spot-y, 30%), #000 0%, transparent 74%)",
        }}
        className={cn(
          "pointer-events-none absolute inset-0 [background-size:22px_22px] transition-opacity duration-300 motion-reduce:hidden",
          theme.spotlightDots
        )}
      />

      {/* 4. Subtle Tactile Film Grain Texture */}
      <div
        aria-hidden="true"
        style={{ backgroundImage: FILM_GRAIN_DATA_URI }}
        className="pointer-events-none absolute inset-0 opacity-[0.032] mix-blend-multiply dark:opacity-[0.045] dark:mix-blend-screen"
      />

      {children}
    </section>
  )
}
