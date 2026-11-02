"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ScamCheckVerdict } from "@/components/features/check/scam-check-verdict"
import { getScamCheckResult } from "@/features/check/services/check.service"
import type { ScamCheckResult } from "@/features/check/types/scam-check.types"

export function UserHistoryDetail({ checkId }: { checkId: number }) {
  const [result, setResult] = useState<ScamCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    if (!Number.isSafeInteger(checkId) || checkId < 1) return
    getScamCheckResult(checkId).then((value) => {
      if (active) setResult(value)
    }).catch(() => {
      if (active) setError("Không thể tải kết quả. Kết quả có thể đã hết hạn hoặc bạn không có quyền xem.")
    })
    return () => { active = false }
  }, [checkId])

  return <div className="space-y-6">
    <Link href="/user/history" className="text-sm font-medium text-primary hover:underline">← Quay lại lịch sử</Link>
    <h1 className="font-heading text-2xl font-bold">Chi tiết kết quả kiểm tra</h1>
    {(error || !Number.isSafeInteger(checkId) || checkId < 1) && <p role="alert" className="rounded-lg border border-destructive/30 p-4 text-destructive">{error || "Mã kết quả không hợp lệ."}</p>}
    {!error && Number.isSafeInteger(checkId) && checkId > 0 && !result && <p role="status" className="text-muted-foreground">Đang tải kết quả…</p>}
    {result && <ScamCheckVerdict result={result} />}
  </div>
}
