"use client"

import Link from "next/link"
import { CaretRight, ShieldWarning } from "@phosphor-icons/react"
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
      <GuestScamCheck idleFooter={<RecentScamsSection />} />
    </div>
  )
}

function RecentScamsSection() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 pt-6 pb-14">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold tracking-[-0.02em] text-foreground sm:text-xl">
            <ShieldWarning
              aria-hidden="true"
              size={20}
              weight="fill"
              className="text-rose-600 dark:text-rose-400"
            />
            <span>Cảnh báo lừa đảo vừa phát hiện</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Cập nhật liên tục các thủ đoạn mạo danh và đường dẫn độc hại phổ biến
          </p>
        </div>

        <Link
          href="/guest/alerts"
          className="inline-flex h-9 items-center gap-1 rounded-full border border-border bg-card px-3.5 text-xs font-semibold text-foreground shadow-2xs transition-[border-color,background-color] duration-150 hover:border-foreground/20 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-white/12"
        >
          <span>Xem tất cả cảnh báo</span>
          <CaretRight aria-hidden="true" size={13} weight="bold" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {recentScams.map((scam, i) => (
          <article
            key={i}
            className="flex h-full flex-col rounded-xl border border-border/90 bg-card/95 p-5 text-card-foreground shadow-2xs transition-[border-color,box-shadow] duration-150 hover:border-foreground/20 hover:shadow-sm dark:border-white/10 dark:shadow-[inset_0_1px_0_rgb(255,255,255,0.04)] dark:hover:border-white/20"
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
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold",
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
