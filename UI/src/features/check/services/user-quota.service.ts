import { authorizeApi } from "@/lib/api/instance"

export interface UserScamCheckQuota {
  userId: number
  fullName: string
  rankName: string | null
  limit: number
  used: number
  remaining: number
  resetsAt: string
}

export async function getUserScamCheckQuota(): Promise<UserScamCheckQuota> {
  const { data } = await authorizeApi.get<{
    isSuccess: boolean
    message: string
    data: UserScamCheckQuota
  }>("/users/me/scam-check-quota")
  if (!data.isSuccess || !data.data)
    throw new Error(data.message || "Không thể tải hạn mức.")
  return data.data
}
