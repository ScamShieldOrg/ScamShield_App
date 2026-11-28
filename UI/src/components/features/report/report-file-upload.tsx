"use client"

import { useRef, useState } from "react"
import { CloudArrowUp, FilePdf, Shield, ShieldCheck, X } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import type { ReportAttachment } from "@/features/report/hooks/use-report-attachments"
import { EvidenceImageEditor } from "./evidence-image-editor"
import {
  formatReportFileSize,
  MAX_REPORT_FILES,
  REPORT_FILE_ACCEPT,
} from "@/features/report/utils/report-upload"

interface ReportFileUploadProps {
  attachments: ReportAttachment[]
  disabled: boolean
  error: string | null
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
  onReview: (id: string, file: File) => void
  editingId: string | null
  onEdit: (id: string | null) => void
  optional?: boolean
}

export function ReportFileUpload({
  attachments,
  disabled,
  error,
  onAdd,
  onRemove,
  onReview,
  editingId,
  onEdit,
  optional = false,
}: ReportFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const editing = attachments.find(item => item.id === editingId)

  return (
    <div className="space-y-2.5">
      <label
        htmlFor="report-evidence-files"
        className="block text-xs font-semibold text-foreground"
      >
        Tệp minh chứng (Ảnh chụp đoạn chat, biên lai){" "}
        {!optional && <span className="text-destructive">*</span>}
      </label>
      <input
        ref={inputRef}
        id="report-evidence-files"
        type="file"
        aria-required={!optional}
        aria-invalid={Boolean(error)}
        accept={REPORT_FILE_ACCEPT}
        multiple
        tabIndex={-1}
        disabled={disabled}
        className="sr-only"
        aria-describedby="report-upload-help report-upload-error"
        onChange={(event) => {
          const files = Array.from(event.target.files || [])
          event.target.value = ""
          if (!disabled && files.length) onAdd(files)
        }}
      />
      <div
        onDragEnter={(event) => {
          event.preventDefault()
          if (disabled || !event.dataTransfer.types.includes("Files")) return
          dragDepth.current++
          setIsDragging(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = disabled ? "none" : "copy"
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          dragDepth.current = Math.max(0, dragDepth.current - 1)
          if (!dragDepth.current) setIsDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          dragDepth.current = 0
          setIsDragging(false)
          if (!disabled) onAdd(Array.from(event.dataTransfer.files))
        }}
      >
        <button
          type="button"
          aria-label="Chọn tệp minh chứng"
          aria-describedby="report-upload-help report-upload-error"
          disabled={disabled || attachments.length >= MAX_REPORT_FILES}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex min-h-20 w-full cursor-pointer items-center gap-3.5 rounded-xl border border-dashed border-black/20 bg-muted/25 p-4 text-left transition-colors hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-muted/20 dark:hover:border-primary/60 dark:hover:bg-primary/10",
            isDragging &&
            !disabled &&
            "border-primary bg-primary/10 ring-2 ring-primary/25",
            error && "border-rose-500/60"
          )}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/15 dark:text-sky-300">
            <CloudArrowUp size={22} weight="fill" aria-hidden="true" />
          </span>
          <span className="min-w-0 space-y-1">
            <span className="block text-sm font-semibold text-foreground">
              {attachments.length >= MAX_REPORT_FILES
                ? `Đã chọn đủ ${MAX_REPORT_FILES} tệp. Xóa bớt tệp để chọn thêm.`
                : isDragging
                  ? "Thả tệp vào đây"
                  : "Nhấn để chọn hoặc kéo thả tệp minh chứng"}
            </span>
            <span
              id="report-upload-help"
              className="block text-xs text-muted-foreground"
            >
              PNG, JPG hoặc PDF · Tối đa {MAX_REPORT_FILES} tệp, 5 MB mỗi tệp
            </span>
            <span className="block text-[11px] text-muted-foreground">
              Bạn có thể che thông tin nhạy cảm trên ảnh nếu cần.
            </span>
          </span>
        </button>
      </div>

      {error && (
        <p
          id="report-upload-error"
          role="alert"
          className="text-xs font-medium text-rose-700 dark:text-rose-300"
        >
          {error}
        </p>
      )}

      {attachments.length > 0 && (
        <>
          <p
            role="status"
            className="text-xs text-muted-foreground tabular-nums"
          >
            Đã chọn {attachments.length}/{MAX_REPORT_FILES} tệp ·{" "}
            {formatReportFileSize(
              attachments.reduce((total, item) => total + item.file.size, 0)
            )}
            . {optional ? "Tệp sẽ được tải lên khi lưu thay đổi." : "Tệp sẽ được tải lên khi gửi báo cáo."}
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {attachments.map(({ id, file, previewUrl, reviewed }) => (
              <li
                key={id}
                className={cn(
                  "min-w-0 space-y-2 rounded-xl border p-2.5",
                  editing?.id === id
                    ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-muted/20"
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-primary"
                    aria-label={`Xem tệp ${file.name} trong thẻ mới`}
                  >
                    {file.name.toLowerCase().endsWith(".pdf") ? (
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                        <FilePdf size={26} />
                      </div>
                    ) : (
                      <div
                        role="img"
                        aria-label={`Ảnh xem trước ${file.name}`}
                        className="size-12 shrink-0 rounded-lg bg-muted bg-contain bg-center bg-no-repeat"
                        style={{ backgroundImage: `url("${previewUrl}")` }}
                      />
                    )}
                    <div className="min-w-0">
                      <p
                        className="truncate text-xs font-semibold text-foreground"
                        title={file.name}
                      >
                        {file.name}
                      </p>
                      {editing?.id === id && (
                        <span className="inline-block rounded-md bg-sky-100 px-1.5 py-0.5 text-[11px] font-semibold text-sky-800 dark:bg-sky-900/60 dark:text-sky-200">
                          Đang chỉnh sửa
                        </span>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        {formatReportFileSize(file.size)} · Xem tệp
                      </p>
                    </div>
                  </a>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onRemove(id)}
                    aria-label={`Xóa tệp ${file.name}`}
                    className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    <X size={15} weight="bold" />
                  </button>
                </div>
                {!file.name.toLowerCase().endsWith(".pdf") && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onEdit(id)}
                    className={cn(
                      "mt-1 flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50",
                      reviewed
                        ? "border-border bg-background hover:bg-muted"
                        : "border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100 dark:hover:bg-sky-900"
                    )}
                  >
                    {reviewed ? <ShieldCheck size={16} aria-hidden="true" /> : <Shield size={16} aria-hidden="true" />}
                    {reviewed ? "Đã rà soát" : "Che thông tin nhạy cảm"}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {editing && (
            <EvidenceImageEditor
              key={editing.id}
              source={editing.previewUrl}
              originalFile={editing.file === editing.originalFile ? undefined : editing.originalFile}
              fileName={editing.file.name}
              saveLabel="Xác nhận"
              onSave={file => onReview(editing.id, file)}
              onCancel={() => onEdit(null)}
            />
          )}
        </>
      )}
    </div>
  )
}
