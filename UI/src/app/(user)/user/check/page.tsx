import type { Metadata } from "next"
import { UserScamCheck } from "@/components/features/check/user-scam-check"

export const metadata: Metadata = {
  title: "Kiểm Tra Lừa Đảo | ScamShield",
  description:
    "Hệ thống phân tích thông minh và cố vấn an toàn cho công dân trước tin nhắn, cuộc gọi và website lừa đảo.",
}

export default function UserCheckPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 font-sans antialiased">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] text-foreground">
          Kiểm tra nội dung đáng ngờ
        </h1>
        <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
          Đối chiếu tin nhắn, đường dẫn, số điện thoại hoặc số tài khoản với
          danh sách cảnh báo và hệ thống phân tích AI đa chiều.
        </p>
      </header>

      <UserScamCheck />
    </div>
  )
}
