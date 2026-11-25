import type { Metadata } from "next"
import { UserScamCheck } from "@/components/features/check/user-scam-check"

export const metadata: Metadata = {
  title: "Kiểm Tra Lừa Đảo | ScamShield",
  description:
    "Hệ thống phân tích thông minh và cố vấn an toàn cho công dân trước tin nhắn, cuộc gọi và website lừa đảo.",
}

export default function UserCheckPage() {
  return (
    <section className="relative -mx-4 -mt-4 overflow-x-clip font-sans antialiased sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8">
      {/* Localized Railway-inspired tactile dot-grid + radial atmospheric wash (1 layer synced with /guest) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[440px] bg-[radial-gradient(ellipse_65%_50%_at_50%_0%,rgba(14,165,233,0.10),transparent_72%)] dark:bg-[radial-gradient(ellipse_65%_55%_at_50%_0%,rgba(56,189,248,0.14),transparent_72%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[380px] opacity-[0.45] [background-image:radial-gradient(rgba(15,23,42,0.14)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_20%,#000_30%,transparent_100%)] dark:opacity-[0.25] dark:[background-image:radial-gradient(rgba(255,255,255,0.22)_1px,transparent_1px)]"
      />

      <div className="relative mx-auto w-full max-w-3xl px-4 pt-10 pb-10 sm:pt-14 sm:pb-12">
        {/* Focused Centered Hero */}
        <header className="mb-8 space-y-2 text-center">
          <h1 className="font-heading text-3xl leading-tight font-bold tracking-[-0.025em] text-balance text-foreground sm:text-4xl">
            Kiểm tra trước khi tin tưởng
          </h1>
          <p className="mx-auto max-w-[54ch] text-sm leading-relaxed text-muted-foreground sm:text-base">
            Dán tin nhắn, liên kết lạ, số điện thoại hoặc số tài khoản để đối
            chiếu cảnh báo và phân tích rủi ro tức thì.
          </p>
        </header>

        <UserScamCheck />
      </div>
    </section>
  )
}
