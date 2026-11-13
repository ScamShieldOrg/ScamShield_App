import { Suspense } from "react"
import { PartnerPasswordForm } from "@/components/features/auth/partner-password-form"

export default function AuthResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-6 text-sm">
          Đang tải nội dung...
        </p>
      }
    >
      <PartnerPasswordForm />
    </Suspense>
  )
}
