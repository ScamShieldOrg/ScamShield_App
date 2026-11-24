"use client"

import Link from "next/link"
import {
  AppleLogo,
  CaretRight,
  GooglePlayLogo,
  QrCode,
  ShieldWarning,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { GuestScamCheck } from "@/components/features/check/guest-scam-check"

const recentScams = [
  {
    type: "Mạo danh cơ quan nhà nước",
    time: "15 phút trước",
    title:
      "Giả danh cán bộ Cục Thuế / Công an yêu cầu kích hoạt VNeID mức 2 qua tệp APK",
    description:
      "Dụ nạn nhân tải ứng dụng ngoài kho chính thức qua Zalo để chiếm quyền điều khiển thiết bị và tài khoản ngân hàng.",
    target: "034.777x.xxxx",
    level: "Nguy cơ cao",
    tone: "danger" as const,
  },
  {
    type: "Lừa đảo đầu tư tài chính",
    time: "42 phút trước",
    title: "Sàn đầu tư năng lượng xanh cam kết lợi nhuận 30%/ngày",
    description:
      "Cho rút tiền thử các lần đầu sau đó khóa tài khoản, đòi nộp thêm phí bảo hiểm giao dịch để rút vốn.",
    target: "*.green-fund-vip.xyz",
    level: "Rất rủi ro",
    tone: "warning" as const,
  },
  {
    type: "Mạo danh quà tặng trúng thưởng",
    time: "4 giờ trước",
    title: "Tin nhắn giả mạo trúng thưởng quà tặng Shopee / Tiki từ trạm BTS giả",
    description:
      "Dẫn dụ người dùng nhập thông tin thẻ tín dụng kèm mã OTP để trừ toàn bộ hạn mức số dư.",
    target: "SMS Brandname giả mạo",
    level: "Nguy cơ cao",
    tone: "danger" as const,
  },
]

export default function GuestCheckPage() {
  return (
    <div className="flex w-full flex-col items-center font-sans antialiased">
      <GuestScamCheck />
      <RecentScamsSection />
      <DownloadAppSection />
    </div>
  )
}

function RecentScamsSection() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-heading text-xl font-bold tracking-[-0.02em] text-foreground">
          <ShieldWarning
            aria-hidden="true"
            size={22}
            weight="fill"
            className="text-rose-600 dark:text-rose-400"
          />
          <span>Cảnh báo lừa đảo vừa phát hiện</span>
        </h2>
        <Link
          href="/guest/alerts"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 transition-colors duration-120 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span>Xem tất cả cảnh báo</span>
          <CaretRight aria-hidden="true" size={14} weight="bold" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {recentScams.map((scam, i) => (
          <article
            key={i}
            className="flex h-full flex-col rounded-lg border border-border bg-card p-5 text-card-foreground shadow-2xs transition-[border-color] duration-120 hover:border-foreground/20 dark:border-white/10 dark:hover:border-white/20"
          >
            <div className="mb-3 flex items-center justify-between gap-2 text-xs">
              <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                {scam.type}
              </span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {scam.time}
              </span>
            </div>

            <h3 className="mb-2 line-clamp-2 font-heading text-sm leading-snug font-semibold text-foreground">
              {scam.title}
            </h3>

            <p className="mb-4 line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">
              {scam.description}
            </p>

            <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/80 pt-3 text-xs dark:border-white/10">
              <span className="truncate font-mono font-medium text-foreground">
                {scam.target}
              </span>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 font-semibold",
                  scam.tone === "danger"
                    ? "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-300"
                    : "border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 rounded-full",
                    scam.tone === "danger"
                      ? "bg-rose-600 dark:bg-rose-400"
                      : "bg-amber-500 dark:bg-amber-400"
                  )}
                />
                <span>{scam.level}</span>
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function DownloadAppSection() {
  return (
    <section className="mx-auto mb-12 w-full max-w-5xl px-4 py-4">
      <div className="flex flex-col items-center justify-between gap-8 rounded-xl border border-slate-800 bg-[#0F172A] p-6 text-slate-100 md:flex-row md:p-10 dark:border-white/12">
        <div className="max-w-xl flex-1 space-y-4 text-center md:text-left">
          <h2 className="font-heading text-2xl leading-tight font-bold tracking-[-0.02em] text-balance text-white sm:text-3xl">
            Cài đặt ứng dụng ScamShield VN trên điện thoại
          </h2>
          <p className="mx-auto max-w-[56ch] text-sm leading-relaxed text-slate-300 md:mx-0">
            Phát hiện tin nhắn SMS độc hại và tra cứu tài khoản ngân hàng thụ
            hưởng tức thì ngay trên thiết bị di động của bạn.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row md:justify-start">
            <button
              type="button"
              disabled
              title="Ứng dụng iOS đang hoàn thiện phát hành"
              className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-white px-5 text-left font-semibold text-slate-900 opacity-90 sm:w-auto"
            >
              <AppleLogo aria-hidden="true" weight="fill" size={22} />
              <span className="leading-tight">
                <span className="block text-xs font-normal text-slate-600">
                  Sắp ra mắt trên
                </span>
                <span className="block text-sm">iOS (App Store)</span>
              </span>
            </button>
            <button
              type="button"
              disabled
              title="Ứng dụng Android đang hoàn thiện phát hành"
              className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-slate-700 bg-slate-800/80 px-5 text-left font-semibold text-white opacity-90 sm:w-auto"
            >
              <GooglePlayLogo aria-hidden="true" weight="fill" size={22} />
              <span className="leading-tight">
                <span className="block text-xs font-normal text-slate-300">
                  Sắp ra mắt trên
                </span>
                <span className="block text-sm">Android (Google Play)</span>
              </span>
            </button>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-3 rounded-lg border border-white/10 bg-white p-5 text-slate-900">
          <div className="flex size-32 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 p-2">
            <QrCode
              aria-hidden="true"
              size={112}
              weight="light"
              className="text-slate-900"
            />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-900">Quét mã QR</p>
            <p className="text-xs text-slate-500">Tải nhanh ứng dụng</p>
          </div>
        </div>
      </div>
    </section>
  )
}
