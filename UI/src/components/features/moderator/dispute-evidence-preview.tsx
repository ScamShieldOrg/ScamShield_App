"use client"

import { useState } from "react"
import {
  ArrowSquareOut,
  DownloadSimple,
  FileText,
  Image,
} from "@phosphor-icons/react"
import { DisputeEvidence } from "@/features/moderator/types/moderator-dispute.types"

interface DisputeEvidencePreviewProps {
  evidences: DisputeEvidence[]
}

export function DisputeEvidencePreview({ evidences }: DisputeEvidencePreviewProps) {
  const [activeId, setActiveId] = useState<string>(evidences[0]?.id || "")

  const activeEvidence = evidences.find((e) => e.id === activeId) || evidences[0]

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
        BẰNG CHỨNG PHẢN BÁC ({evidences.length} TÀI LIỆU)
      </div>

      {/* File selector chips */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        {evidences.map((ev) => {
          const isActive = ev.id === (activeEvidence?.id || "")
          return (
            <button
              key={ev.id}
              type="button"
              onClick={() => setActiveId(ev.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? "border-slate-900 bg-slate-100 text-slate-950 shadow-xs dark:border-white dark:bg-slate-800 dark:text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:border-slate-700"
              }`}
            >
              {ev.type === "image" ? (
                <Image size={15} weight="bold" className="text-emerald-500" />
              ) : (
                <FileText size={15} weight="bold" className="text-blue-500" />
              )}
              <span>{ev.name}</span>
            </button>
          )
        })}
      </div>

      {/* Dotted Preview Area */}
      <div className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-10 text-center dark:border-slate-800 dark:bg-slate-950/40">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-white shadow-xs dark:bg-slate-800">
          {activeEvidence?.type === "image" ? (
            <Image size={32} weight="duotone" className="text-emerald-500" />
          ) : (
            <FileText size={32} weight="duotone" className="text-blue-500" />
          )}
        </div>

        <div className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
          {activeEvidence?.name || "Chưa có tài liệu đính kèm"}
        </div>
        {activeEvidence?.url || activeEvidence?.downloadUrl ? (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {activeEvidence.url && (
              <a
                href={activeEvidence.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                <ArrowSquareOut size={15} />
                Xem tài liệu
              </a>
            )}
            {activeEvidence.downloadUrl && (
              <a
                href={activeEvidence.downloadUrl}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <DownloadSimple size={15} />
                Tải xuống
              </a>
            )}
          </div>
        ) : (
          <p
            role="status"
            className="mt-3 text-xs text-amber-700 dark:text-amber-400"
          >
            Chưa có liên kết tài liệu khả dụng. Hãy tải lại hồ sơ hoặc kiểm tra cấu hình kho lưu trữ.
          </p>
        )}
      </div>
    </div>
  )
}
