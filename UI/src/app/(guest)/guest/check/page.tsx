"use client"

import {
  ShieldWarning,
  CaretRight,
  AppleLogo,
  GooglePlayLogo,
  QrCode,
  Sparkle,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { GuestScamCheck } from "@/components/features/check/guest-scam-check"
// Data mock cho phần "Cảnh báo lừa đảo"
const recentScams = [
  {
    type: "MẠO DANH CƠ QUAN CHÍNH QUYỀN",
    time: "15 phút trước",
    title:
      "Giả danh cán bộ Cục Thuế / Công an gọi thông báo kích hoạt định danh VNeID mức 2",
    description:
      "Yêu cầu nạn nhân tải ứng dụng chưa rõ gốc (APK) từ liên kết giả qua Zalo để chiếm quyền điều khiển tài khoản ngân hàng từ xa.",
    target: "034.777x.xxxx",
    level: "Cực kỳ nguy hiểm",
    levelColor: "text-red-600 bg-red-50",
  },
  {
    type: "LỪA ĐẢO ĐẦU TƯ TÀI CHÍNH",
    time: "42 phút trước",
    title: "Sàn đầu tư năng lượng xanh quốc tế cam kết lợi nhuận 30%/ngày",
    description:
      "Kêu gọi nộp tiền vào ví trung gian, cho rút tiền thử các lần đầu sau đó khóa tài khoản đòi nộp thêm phí bảo hiểm giao dịch.",
    target: "*.green-fund-vip.xyz",
    level: "Rất rủi ro",
    levelColor: "text-orange-600 bg-orange-50",
  },
  {
    type: "MẠO DANH QUÀ TẶNG TRÚNG THƯỞNG",
    time: "4 giờ trước",
    title:
      "Trạm phát sóng BTS giả mạo gửi tin nhắn trúng thưởng quà tặng Shopee / Tiki",
    description:
      "Dẫn dụ người dùng nhập số thẻ tín dụng hoặc thông tin thẻ ghi nợ kèm mã OTP để trừ toàn bộ hạn mức số dư.",
    target: "SMS: Brandname giả mạo",
    level: "Cực kỳ nguy hiểm",
    levelColor: "text-red-600 bg-red-50",
  },
]

export default function GuestCheckPage() {
  return (
    <div className="flex w-full flex-col items-center">
      <GuestScamCheck />
      <RecentScamsSection />
      <DownloadAppSection />
    </div>
  )
}

function RecentScamsSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900 dark:text-white">
          <ShieldWarning weight="fill" className="text-3xl text-red-500" /> Cảnh
          báo lừa đảo vừa phát hiện
        </h2>
        <a
          href="#"
          className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:underline dark:text-blue-400"
        >
          Xem chi tiết <CaretRight weight="bold" />
        </a>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {recentScams.map((scam, i) => (
          <div
            key={i}
            className="group flex h-full flex-col rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold tracking-widest text-slate-600 uppercase">
                {scam.type}
              </span>
              <span className="text-xs font-medium text-slate-400">
                {scam.time}
              </span>
            </div>
            <h3 className="mb-3 line-clamp-2 text-[15px] leading-snug font-bold text-slate-900 transition-colors group-hover:text-blue-600">
              {scam.title}
            </h3>
            <p className="mb-6 line-clamp-3 flex-1 text-xs leading-relaxed font-medium text-slate-500">
              {scam.description}
            </p>

            <div className="mt-auto flex items-center justify-between border-t border-slate-100/80 pt-4">
              <div className="text-[11px]">
                <span className="font-medium text-slate-400">Đầu số/URL: </span>
                <span className="font-mono font-bold text-slate-700">
                  {scam.target}
                </span>
              </div>
              <span
                className={cn(
                  "text-[11px] font-bold tracking-wider uppercase",
                  scam.levelColor.split(" ")[0]
                )}
              >
                {scam.level}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function DownloadAppSection() {
  return (
    <section className="mx-auto mb-16 w-full max-w-6xl px-4 py-8">
      <div className="relative flex flex-col items-center justify-between gap-10 overflow-hidden rounded-[32px] bg-[#0F172A] p-8 md:flex-row md:p-14">
        {/* Decorative elements */}
        <div className="pointer-events-none absolute top-0 right-0 h-[500px] w-[500px] translate-x-1/3 -translate-y-1/2 rounded-full bg-blue-500/20 blur-[80px]"></div>
        <div className="pointer-events-none absolute bottom-0 left-0 h-[400px] w-[400px] -translate-x-1/4 translate-y-1/3 rounded-full bg-indigo-500/20 blur-[80px]"></div>

        <div className="relative z-10 max-w-xl flex-1 text-center md:text-left">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-bold text-slate-300 backdrop-blur-sm">
            <Sparkle weight="fill" className="text-blue-400" /> Ứng dụng di động
            tiện ích
          </div>
          <h2 className="mb-6 text-3xl leading-tight font-bold text-white md:text-[40px]">
            Cài đặt ứng dụng ScamShield VN trực tiếp trên điện thoại
          </h2>
          <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed font-medium text-slate-400 md:mx-0 md:text-base">
            Phát hiện tin nhắn SMS độc hại và kiểm tra tài khoản ngân hàng thụ
            hưởng tức thì, tiện lợi ngay trên chiếc điện thoại của bạn.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row md:justify-start">
            <Button className="flex w-full items-center gap-3 rounded-2xl bg-white px-6 py-7 font-bold text-slate-900 transition-transform hover:scale-105 hover:bg-slate-100 active:scale-95 sm:w-auto">
              <AppleLogo weight="fill" size={28} />
              <div className="text-left leading-tight">
                <div className="mb-0.5 text-[10px] font-semibold tracking-wider uppercase opacity-60">
                  Tải về cho
                </div>
                <div className="text-sm">iOS (App Store)</div>
              </div>
            </Button>
            <Button className="flex w-full items-center gap-3 rounded-2xl border border-slate-700 bg-slate-800/80 px-6 py-7 font-bold text-white backdrop-blur-sm transition-transform hover:scale-105 hover:bg-slate-700 active:scale-95 sm:w-auto">
              <GooglePlayLogo weight="fill" size={28} />
              <div className="text-left leading-tight">
                <div className="mb-0.5 text-[10px] font-semibold tracking-wider uppercase opacity-60">
                  Tải về cho
                </div>
                <div className="text-sm">Android (Google Play)</div>
              </div>
            </Button>
          </div>
        </div>

        <div className="relative z-10 flex w-full max-w-[240px] shrink-0 flex-col items-center justify-center gap-4 rounded-[28px] border border-slate-100 bg-white p-7 shadow-2xl md:w-auto">
          <div className="flex h-40 w-40 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-2">
            <QrCode size={140} weight="light" className="text-slate-900" />
          </div>
          <div className="text-center">
            <p className="mb-1 text-[13px] font-bold tracking-widest text-slate-900 uppercase">
              Quét mã QR
            </p>
            <p className="text-[11px] font-medium text-slate-500">
              Tải nhanh ứng dụng
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
