"use client"

import { useRef, useState } from "react"
import { CloudArrowUp, FilePdf, X } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import {
  formatReportFileSize,
  MAX_REPORT_FILES,
  REPORT_FILE_ACCEPT,
} from "@/features/report/utils/report-upload"

export interface ReportAttachment {
  id: string
  file: File
  previewUrl: string
}

interface ReportFileUploadProps {
  attachments: ReportAttachment[]
  disabled: boolean
  error: string | null
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
}

export function ReportFileUpload({
  attachments,
  disabled,
  error,
  onAdd,
  onRemove,
}: ReportFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  return (
    <div className="space-y-2.5">
      <label
        htmlFor="report-evidence-files"
        className="block text-xs font-semibold text-foreground"
      >
        Tệp minh chứng (Ảnh chụp đoạn chat, biên lai){" "}
        <span className="text-rose-600 dark:text-rose-400">*</span>
      </label>
      <input
        ref={inputRef}
        id="report-evidence-files"
        type="file"
        aria-required="true"
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
              PNG, JPG hoặc PDF · Tối đa {MAX_REPORT_FILES} tệp, 5 MB mỗi tệp.
              Hãy che thông tin cá nhân không liên quan trước khi tải lên.
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
            . Tệp sẽ được tải lên khi gửi báo cáo.
          </p>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {attachments.map(({ id, file, previewUrl }) => (
              <li
                key={id}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-black/10 bg-muted/25 p-2.5 dark:border-white/10"
              >
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  aria-label={`Xem tệp ${file.name} trong thẻ mới`}
                >
                  {file.name.toLowerCase().endsWith(".pdf") ? (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/15 dark:text-rose-300">
                      <FilePdf aria-hidden="true" size={24} />
                    </div>
                  ) : (
                    <div
                      role="img"
                      aria-label={`Ảnh xem trước ${file.name}`}
                      className="size-12 shrink-0 rounded-lg border border-border bg-muted bg-contain bg-center bg-no-repeat"
                      style={{ backgroundImage: `url("${previewUrl}")` }}
                    />
                  )}
                  <div className="min-w-0 space-y-0.5">
                    <p
                      className="truncate text-xs font-semibold text-foreground"
                      title={file.name}
                    >
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatReportFileSize(file.size)} · Xem tệp
                    </p>
                  </div>
                </a>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onRemove(id)}
                  aria-label={`Xóa tệp ${file.name}`}
                  className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 dark:hover:text-rose-300"
                >
                  <X aria-hidden="true" size={16} weight="bold" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
