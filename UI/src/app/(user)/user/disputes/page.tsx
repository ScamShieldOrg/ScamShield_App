"use client"

import React, { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ShieldCheck, FilePlus, ListBullets } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { DisputeTrackingView } from "@/components/features/dispute/dispute-tracking-view"
import { DisputeSubmissionForm } from "@/components/features/dispute/dispute-submission-form"

type DisputeAction = "progress" | "submit"

export default function UserDisputesPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-5xl">
          <p className="text-sm text-muted-foreground">
            Đang chuẩn bị trang khiếu nại...
          </p>
        </div>
      }
    >
      <UserDisputesContent />
    </Suspense>
  )
}

function UserDisputesContent() {
  // `useSearchParams` must be called inside the Suspense boundary above.
  const searchParams = useSearchParams()
  const scanIdParam = searchParams.get("scanId")?.trim() ?? ""
  // A check result links here with `?scanId=...`; arriving that way means the
  // user pressed "Khiếu nại kết quả phân tích", so open the submission form
  // instead of the tracking list. Everything else is the user's own choice.
  const [activeAction, setActiveAction] = useState<DisputeAction>(() =>
    scanIdParam ? "submit" : "progress"
  )

  return (
    <div className="w-full max-w-5xl">
      {/* Title Section */}
      <div className="mb-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <ShieldCheck weight="fill" /> Xác minh chính chủ
          </div>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
            • Thẩm định độc lập A05/NCSC
          </span>
        </div>
        <h1 className="mb-3 text-[28px] font-bold tracking-tight text-slate-900 md:text-3xl dark:text-white">
          Khiếu Nại &amp; Gỡ Nhãn Sai
        </h1>
        <p className="max-w-4xl text-sm leading-relaxed font-medium text-slate-500 dark:text-slate-400">
          Hỗ trợ xác minh chính chủ và giải tỏa các số điện thoại, tên miền hoặc
          số tài khoản bị gán nhãn nhầm vào Blacklist.
        </p>
      </div>

      {/* Action Navigation Buttons */}
      <div className="mb-8 flex flex-col items-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => setActiveAction("progress")}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold shadow-xs transition-colors sm:w-auto",
            activeAction === "progress"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
          )}
        >
          <ListBullets
            weight="bold"
            className={activeAction === "progress" ? "" : "text-slate-500"}
          />
          Tiến Trình Xử Lý Đơn Của Tôi
        </button>

        <button
          type="button"
          onClick={() => setActiveAction("submit")}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold shadow-xs transition-colors sm:w-auto",
            activeAction === "submit"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
          )}
        >
          <FilePlus
            weight="bold"
            className={activeAction === "submit" ? "" : "text-slate-500"}
          />
          Nộp Đơn Khiếu Nại &amp; Phản Chứng
        </button>
      </div>

      {/* View Content */}
      {activeAction === "progress" ? (
        <DisputeTrackingView
          onNavigateToSubmit={() => setActiveAction("submit")}
        />
      ) : (
        <DisputeSubmissionForm onSuccess={() => setActiveAction("progress")} />
      )}
    </div>
  )
}
