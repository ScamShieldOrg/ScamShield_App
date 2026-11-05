import type { Metadata } from "next"
import { UserScamCheck } from "@/components/features/check/user-scam-check"

export const metadata: Metadata = {
  title: "Kiểm Tra Lừa Đảo | ScamShield",
  description:
    "Hệ thống phân tích thông minh và cố vấn an toàn cho công dân trước tin nhắn, cuộc gọi và website lừa đảo.",
}

export default function UserCheckPage() {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-[#131B2E] dark:text-foreground">
          Kiểm Tra & Phân Tích Tin Nhắn Đáng Ngờ
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Hệ thống phân tích thông minh kết hợp rà soát nhanh và phân tích chuyên sâu đa chiều từ các chuyên gia AI.
        </p>
      </div>

      <UserScamCheck />
    </div>
  )
}
