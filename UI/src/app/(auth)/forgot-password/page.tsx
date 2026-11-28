"use client"

import Link from "next/link"
import { ArrowLeft, Key, ShieldCheck } from "@phosphor-icons/react"
import { useScamCheckTheme } from "@/components/features/check/scam-check-theme"
import { cn } from "@/lib/utils"

export default function AuthForgotPasswordPage() {
  const { theme } = useScamCheckTheme()

  return (
    <section className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
        <div
          className={cn(
            "rounded-3xl border p-1.5 transition-[border-color,box-shadow] duration-200",
            theme.composerBezel
          )}
        >
          <div className="rounded-2xl border border-black/8 bg-card/95 p-6 backdrop-blur-md sm:p-8 dark:border-white/10">
            <div className="mb-5 flex items-center justify-between gap-2">
              <Link
                href="/login"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background/80 px-3.5 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/12"
              >
                <ArrowLeft aria-hidden="true" size={14} weight="bold" />
                <span>Quay lại</span>
              </Link>

              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl border",
                  theme.brandBadge
                )}
              >
                <Key aria-hidden="true" size={18} weight="fill" />
              </div>
            </div>

            <h1 className="font-heading text-2xl font-bold tracking-[-0.025em] text-foreground">
              Khôi phục mật khẩu
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Tính năng tự đặt lại mật khẩu qua email đang được hoàn thiện. Nếu
              bạn cần hỗ trợ khôi phục quyền truy cập tài khoản, vui lòng liên
              hệ quản trị viên ScamShield VN hoặc sử dụng đường dẫn đặt lại mật
              khẩu đã được cấp.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                href="/login"
                className={cn(
                  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all",
                  theme.ctaButton
                )}
              >
                <ShieldCheck aria-hidden="true" size={17} weight="fill" />
                <span>Về trang đăng nhập</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
