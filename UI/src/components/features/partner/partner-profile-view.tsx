"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  getPartnerProfile,
  getPartnerProfileError,
  type PartnerProfile,
} from "@/features/partner/services/partner-profile.service"
import {
  formatPartnerProfileDate,
  PartnerProfileFields,
  PartnerProfileSection,
} from "./partner-profile-fields"

import { PartnerProfileContact } from "./partner-profile-contact"

const statusLabel = {
  VERIFIED: "Đã xác thực",
  PENDING: "Đang chờ xác thực",
  REJECTED: "Từ chối xác thực",
} satisfies Record<PartnerProfile["verificationStatus"], string>

export function PartnerProfileView() {
  const [profile, setProfile] = useState<PartnerProfile | null>(null)
  const [loadError, setLoadError] = useState("")
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    const request = new AbortController()
    getPartnerProfile(request.signal)
      .then((result) => {
        if (!request.signal.aborted) setProfile(result)
      })
      .catch((error: unknown) => {
        if (!request.signal.aborted) {
          setLoadError(
            getPartnerProfileError(error, "Không thể tải hồ sơ đối tác.")
          )
        }
      })
    return () => request.abort()
  }, [loadAttempt])

  return (
    <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Hồ sơ đối tác</h1>
        {profile && (
          <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
            {statusLabel[profile.verificationStatus]}
          </span>
        )}
      </header>
      {loadError && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <p role="alert" className="text-sm text-destructive">
            {loadError}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setLoadError("")
              setLoadAttempt((attempt) => attempt + 1)
            }}
          >
            Thử lại
          </Button>
        </div>
      )}
      {!profile && !loadError && <p role="status">Đang tải hồ sơ đối tác…</p>}
      {profile && (
        <>
          <PartnerProfileSection title="Thông tin doanh nghiệp">
            <PartnerProfileFields
              fields={[
                ["Tên pháp lý", profile.legalName],
                ["Tên thương hiệu", profile.brandName],
                ["Mã số thuế", profile.taxCode],
                [
                  "Thời điểm xác thực",
                  formatPartnerProfileDate(profile.verifiedAt),
                ],
                [
                  "Cập nhật lần cuối",
                  formatPartnerProfileDate(profile.updatedAt),
                ],
              ]}
            />
          </PartnerProfileSection>

          <PartnerProfileSection title="Người đại diện và liên hệ">
            <PartnerProfileContact profile={profile} onSave={setProfile} />
          </PartnerProfileSection>

          <PartnerProfileSection title="Kênh chính thức">
            <PartnerProfileFields
              fields={[
                ["Tên miền", profile.officialDomain],
                ["Hotline", profile.officialHotline],
                ["Tên định danh SMS", profile.smsBrandName],
              ]}
            />
          </PartnerProfileSection>
        </>
      )}
    </div>
  )
}
