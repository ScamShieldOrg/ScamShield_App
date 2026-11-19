import {
  CheckCircle,
  Clock,
  Info,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react"
import type { PartnerRegistrationDetail } from "@/features/admin/services/admin-partner-registrations"
import { cn } from "@/lib/utils"

type Verification = NonNullable<
  PartnerRegistrationDetail["businessVerification"]
>
type Tone = "success" | "warning" | "error" | "neutral"

const toneStyles: Record<Tone, string> = {
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  error: "border-destructive/20 bg-destructive/5 text-destructive",
  neutral: "border-border bg-muted/30 text-muted-foreground",
}

const activityLabels: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  NOT_ACTIVE: "Không hoạt động / tạm ngừng",
  REVIEW_REQUIRED: "Cần kiểm tra trạng thái",
  UNKNOWN: "Chưa xác định trạng thái",
}

const sourceLabels: Record<string, string> = {
  SUCCESS: "Đã tra cứu",
  NOT_FOUND: "Không tìm thấy doanh nghiệp",
  UNAVAILABLE: "Dịch vụ tạm thời không khả dụng",
  NOT_CONFIGURED: "Chưa thể kết nối dịch vụ",
  UNREADABLE: "Không đọc được dữ liệu",
  NOT_CHECKED: "Chưa kiểm tra",
  DISABLED: "Không yêu cầu kiểm tra",
}

function CheckBadge({ status }: { status: string }) {
  const matched = status === "MATCHED"
  const mismatch = status === "MISMATCH"
  const Icon = matched ? CheckCircle : mismatch ? XCircle : Info
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        toneStyles[matched ? "success" : mismatch ? "error" : "neutral"]
      )}
    >
      <Icon size={13} aria-hidden="true" />
      {matched ? "Trùng khớp" : mismatch ? "Không khớp" : "Chưa đủ dữ liệu"}
    </span>
  )
}

function checkedAtLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date)
}

function getSummary(verification: Verification) {
  if (verification.xinvoice.status !== "SUCCESS") {
    return {
      tone: "warning" as const,
      title: "Chưa thể xác minh doanh nghiệp",
      description: `${sourceLabels[verification.xinvoice.status] || "Chưa có dữ liệu tra cứu"}. Cần kiểm tra lại thông tin và tài liệu trước khi quyết định.`,
    }
  }
  if (
    verification.formNameVsXinvoice === "MISMATCH" ||
    verification.formTaxCodeVsXinvoice === "MISMATCH"
  ) {
    return {
      tone: "error" as const,
      title: "Thông tin doanh nghiệp không khớp",
      description:
        "Có khác biệt giữa hồ sơ đăng ký và dữ liệu Xinvoice. Kiểm tra các mục bên dưới và tài liệu đính kèm.",
    }
  }
  if (verification.outcome === "MATCHED") {
    return {
      tone: "success" as const,
      title: "Thông tin đối soát trùng khớp",
      description:
        "Doanh nghiệp đang hoạt động. Tiếp tục kiểm tra tài liệu và quyền đại diện trước khi phê duyệt.",
    }
  }
  return {
    tone: "warning" as const,
    title: "Cần kiểm tra bổ sung",
    description:
      "Kết quả tự động chưa đủ cơ sở xác nhận. Kiểm tra trạng thái hoạt động, thông tin đối chiếu và giấy phép.",
  }
}

export function BusinessVerificationPanel({
  verification,
  documentStatus,
}: {
  verification: PartnerRegistrationDetail["businessVerification"]
  documentStatus: PartnerRegistrationDetail["documentVerificationStatus"]
}) {
  const summary = verification ? getSummary(verification) : null
  const SummaryIcon = summary?.tone === "success" ? CheckCircle : WarningCircle
  const checkedAt = verification ? checkedAtLabel(verification.checkedAt) : null
  const registryAvailable = verification?.xinvoice.status === "SUCCESS"
  const ocrWaiting =
    documentStatus === "PENDING_OCR" || documentStatus === "RUNNING_OCR"

  return (
    <section
      aria-label="Đối soát doanh nghiệp"
      className="min-w-0 rounded-lg border border-border bg-card p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-sm font-bold">
          Đối soát doanh nghiệp
        </h3>
        <span className="rounded border border-border bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">
          Nguồn: Xinvoice
        </span>
      </div>
      {verification && summary ? (
        <>
          <div
            className={cn(
              "mt-3 flex items-start gap-2.5 rounded-lg border p-3",
              toneStyles[summary.tone]
            )}
          >
            <SummaryIcon
              size={20}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold">{summary.title}</p>
              <p className="mt-1 text-xs leading-relaxed">
                {summary.description}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground">
              Trạng thái doanh nghiệp
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold",
                toneStyles[
                  registryAvailable &&
                  verification.xinvoice.activityStatus === "ACTIVE"
                    ? "success"
                    : "warning"
                ]
              )}
            >
              {registryAvailable &&
              verification.xinvoice.activityStatus === "ACTIVE" ? (
                <CheckCircle size={13} aria-hidden="true" />
              ) : (
                <Info size={13} aria-hidden="true" />
              )}
              {registryAvailable
                ? activityLabels[verification.xinvoice.activityStatus] ||
                  "Chưa xác định trạng thái"
                : "Chưa xác định trạng thái"}
            </span>
          </div>
          <dl className="mt-3 divide-y divide-border rounded-lg border border-border px-3">
            {[
              {
                label: "Tên pháp nhân",
                value: verification.xinvoice.legalName,
                status: verification.formNameVsXinvoice,
                mono: false,
              },
              {
                label: "Mã số thuế",
                value: verification.xinvoice.taxCode,
                status: verification.formTaxCodeVsXinvoice,
                mono: true,
              },
            ].map((field) => (
              <div key={field.label} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <dt className="font-medium">{field.label}</dt>
                  <dd>
                    <CheckBadge
                      status={registryAvailable ? field.status : "INCONCLUSIVE"}
                    />
                  </dd>
                </div>
                <dd
                  className={cn(
                    "mt-2 leading-relaxed break-words",
                    field.mono && "font-mono tabular-nums"
                  )}
                >
                  {field.value || "Chưa có dữ liệu từ Xinvoice"}
                </dd>
                <dd className="mt-1 text-[11px] text-muted-foreground">
                  Thông tin trên Xinvoice
                </dd>
              </div>
            ))}
          </dl>
          {checkedAt && (
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock size={13} aria-hidden="true" />
              Đối soát lúc {checkedAt} (giờ Việt Nam)
            </p>
          )}
          {verification.ocrEnabled && (
            <div className="mt-4 border-t border-border pt-3">
              <h4 className="font-semibold">Đọc thông tin giấy phép (OCR)</h4>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                {ocrWaiting
                  ? "Giấy phép đang được xử lý. Vui lòng chờ kết quả trước khi phê duyệt."
                  : documentStatus === "FLAGGED"
                    ? "Giấy phép cần được kiểm tra thủ công. Vui lòng mở tài liệu để đối chiếu."
                    : documentStatus === "PASSED"
                      ? "Đã hoàn tất đối soát giấy phép."
                      : "Chưa có kết quả đối soát giấy phép."}
              </p>
              {verification.documents.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {verification.documents.map((document, index) => (
                    <li
                      key={`${document.fileName}-${index}`}
                      className="rounded border border-border bg-muted/20 px-2.5 py-2"
                    >
                      <p className="font-medium break-all">
                        {document.fileName}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {document.status === "SUCCESS"
                          ? "Đã đọc thông tin · xem kết quả đối soát giấy phép ở trên"
                          : sourceLabels[document.status] ||
                            "Chưa xác định kết quả đọc tài liệu"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-dashed border-border bg-muted/20 p-3 text-muted-foreground">
          <Info size={20} className="shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold text-foreground">
              Chưa có kết quả đối soát
            </p>
            <p className="mt-1 leading-relaxed">
              Hồ sơ chưa có dữ liệu xác minh được lưu. Kiểm tra thông tin doanh
              nghiệp và tài liệu đính kèm.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
