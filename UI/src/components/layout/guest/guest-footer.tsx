"use client"

import Link from "next/link"
import { ShieldCheck } from "@phosphor-icons/react"
import { useScamCheckTheme } from "@/components/features/check/scam-check-theme"
import {
  ChromeAmbientOverlay,
  useChromePointerGlow,
} from "@/components/shared/chrome-ambient-surface"
import { cn } from "@/lib/utils"

export function GuestFooter() {
  const { theme } = useScamCheckTheme()
  const { glowLayerRef, handlePointerMove, handlePointerLeave } =
    useChromePointerGlow()

  return (
    <footer
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn(
        "relative w-full border-t font-sans text-muted-foreground antialiased backdrop-blur-md transition-colors duration-200",
        theme.headerBg
      )}
    >
      <ChromeAmbientOverlay
        glowLayerRef={glowLayerRef}
        theme={theme}
        edge="top"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 border-b border-border/80 pb-8 md:grid-cols-4 dark:border-white/10">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg border shadow-xs transition-colors duration-200",
                  theme.brandBadge
                )}
              >
                <ShieldCheck aria-hidden="true" size={20} weight="fill" />
              </div>
              <span className="font-heading text-lg font-bold tracking-[-0.02em] text-foreground">
                ScamShield Việt Nam
              </span>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Hệ thống phân tích và xác minh an toàn số cộng đồng, hỗ trợ phát
              hiện tin nhắn, cuộc gọi, tài khoản ngân hàng và liên kết lừa đảo
              ứng dụng trí tuệ nhân tạo.
            </p>
          </div>

          {/* Quick Legal & Standards Links */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold tracking-wider text-foreground uppercase">
              Quy chuẩn &amp; pháp lý
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/guest/education"
                  className="transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Quy trình kiểm tra dữ liệu
                </Link>
              </li>
              <li>
                <Link
                  href="/guest/education"
                  className="transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Quy tắc đạo đức cộng đồng
                </Link>
              </li>
              <li>
                <Link
                  href="/guest/education"
                  className="transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Chính sách bảo mật dữ liệu
                </Link>
              </li>
              <li>
                <Link
                  href="/guest/education"
                  className="transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Điều khoản dịch vụ an toàn
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact / Partnership */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold tracking-wider text-foreground uppercase">
              Kết nối an toàn
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Đồng hành cùng Trung tâm Giám sát an toàn không gian mạng quốc gia
              (NCSC) và các tổ chức tài chính.
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-500/15 dark:text-emerald-300">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse"
                />
                <span>Cơ sở dữ liệu thời gian thực</span>
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col items-center justify-between gap-4 pt-6 text-xs text-muted-foreground md:flex-row">
          <p>
            © 2025 ScamShield Vietnam. Hợp tác bảo vệ người dùng số và giao dịch
            ngân hàng điện tử.
          </p>
          <div className="flex items-center gap-2 font-semibold text-foreground/85">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-emerald-500"
            />
            <span>Phản ứng nhanh 24/7</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
