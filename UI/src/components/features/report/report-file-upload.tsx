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
    <div className="space-y-2">
      <label
        htmlFor="report-evidence-files"
        className="text-xs font-bold text-[#131B2E] dark:text-foreground"
      >
        Tệp minh chứng (ảnh chat, biên lai, tin nhắn){" "}
        <span className="text-destructive">*</span>
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
            "flex w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#C6C6CE] bg-[#FAF8FF]/60 p-4 text-left transition-colors hover:border-[#008CC7] hover:bg-sky-50/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008CC7] disabled:cursor-not-allowed disabled:opacity-60 dark:border-border dark:bg-muted/20 dark:hover:border-primary dark:hover:bg-primary/10",
            isDragging &&
              !disabled &&
              "border-[#008CC7] bg-sky-50 ring-2 ring-sky-200 dark:border-primary dark:bg-primary/10 dark:ring-primary/30",
            error && "border-destructive"
          )}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#E2E7FF] text-[#008CC7] dark:bg-primary/20 dark:text-primary">
            <CloudArrowUp size={22} weight="fill" aria-hidden="true" />
          </span>
          <span className="min-w-0 space-y-1">
            <span className="block text-xs font-bold text-[#131B2E] dark:text-foreground">
              {attachments.length >= MAX_REPORT_FILES
                ? `Đã chọn đủ ${MAX_REPORT_FILES} tệp. Xóa bớt tệp để chọn thêm.`
                : isDragging
                  ? "Thả tệp vào đây"
                  : "Nhấn vào đây để chọn hoặc kéo thả tệp minh chứng"}
            </span>
            <span
              id="report-upload-help"
              className="block text-[11px] text-[#45464D] dark:text-muted-foreground"
            >
              PNG, JPG hoặc PDF · Tối đa {MAX_REPORT_FILES} tệp, 5 MB mỗi tệp
            </span>
            <span className="block text-[11px] text-muted-foreground">
              Hãy che thông tin cá nhân không liên quan trước khi tải tệp lên.
            </span>
          </span>
        </button>
      </div>

      <p
        id="report-upload-error"
        role={error ? "alert" : undefined}
        className="text-xs text-destructive"
      >
        {error}
      </p>

      {attachments.length > 0 && (
        <>
          <p role="status" className="text-[11px] text-muted-foreground">
            Đã chọn {attachments.length}/{MAX_REPORT_FILES} tệp ·{" "}
            {formatReportFileSize(
              attachments.reduce((total, item) => total + item.file.size, 0)
            )}
            . Tệp sẽ được tải lên khi gửi báo cáo.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {attachments.map(({ id, file, previewUrl }) => (
              <li
                key={id}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-muted/20 p-2.5"
              >
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
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
