import type { Metadata } from "next"
import { UserScamCheck } from "@/components/features/check/user-scam-check"

export const metadata: Metadata = {
  title: "Kiểm Tra Lừa Đảo | ScamShield",
  description:
    "Hệ thống phân tích thông minh và cố vấn an toàn cho công dân trước tin nhắn, cuộc gọi và website lừa đảo.",
}

export default function UserCheckPage() {
  return <UserScamCheck />
}
