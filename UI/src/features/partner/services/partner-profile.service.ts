import { isAxiosError } from "axios"

import { authorizeApi } from "@/lib/api/instance"

export interface PartnerProfile {
  legalName: string
  brandName: string
  taxCode: string | null
  corporateEmail: string | null
  contactPhone: string | null
  representativeNameAndTitle: string | null
  legalRepresentative: boolean | null
  officialDomain: string | null
  officialHotline: string | null
  smsBrandName: string | null
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED"
  verifiedAt: string | null
  updatedAt: string | null
}

interface ProfileResponse {
  isSuccess: boolean
  message: string
  data: PartnerProfile | null
}

const profilePath = "/partner/profile"

function unwrapProfile(response: ProfileResponse) {
  if (!response.isSuccess || !response.data) {
    throw new Error(response.message || "Không nhận được hồ sơ đối tác.")
  }

  return response.data
}

export async function getPartnerProfile(
  signal?: AbortSignal
): Promise<PartnerProfile> {
  const { data } = await authorizeApi.get<ProfileResponse>(profilePath, {
    signal,
  })
  return unwrapProfile(data)
}

export async function updatePartnerProfile(update: {
  representativeNameAndTitle?: string
  corporateEmail?: string
  currentPassword?: string
}) {
  const { data } = await authorizeApi.patch<ProfileResponse>(
    profilePath,
    update
  )
  return unwrapProfile(data)
}

export function getPartnerProfileError(error: unknown, fallback: string) {
  if (
    isAxiosError<{
      message?: string
      data?: Record<string, string>
    }>(error)
  ) {
    const response = error.response?.data
    return (
      response?.data?.representativeNameAndTitle ||
      response?.data?.corporateEmail ||
      response?.data?.currentPassword ||
      response?.message ||
      fallback
    )
  }
  return error instanceof Error ? error.message : fallback
}
