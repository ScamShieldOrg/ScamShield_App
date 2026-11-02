"use client"

import { useEffect, useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { ArrowRight, CheckCircle, FileText, X } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import {
  adminPartnerRegistrations,
  PartnerReviewApiError,
  type PartnerRegistrationDetail,
  type PartnerRegistrationItem,
  type PartnerDocumentMetadata,
} from "@/features/admin/services/admin-partner-registrations"
import { WhitelistStatusBadge } from "./whitelist-status-badge"

const documentLabels: Record<string, string> = {
  BUSINESS_LICENSE: "Giấy phép kinh doanh",
  OWNERSHIP_PROOF: "Chứng minh quyền sở hữu",
  AUTHORIZATION: "Giấy ủy quyền",
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function WhitelistReviewDialog({
  item,
  onUpdated,
}: {
  item: PartnerRegistrationItem
  onUpdated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<PartnerRegistrationDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [openingDocument, setOpeningDocument] = useState<number | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [detailRevision, setDetailRevision] = useState(0)

  useEffect(() => {
    if (!open) return
    let active = true
    adminPartnerRegistrations
      .detail(item.id)
      .then((data) => {
        if (active) {
          setDetail(data)
          setError(null)
        }
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Không thể tải hồ sơ."
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, item.id, detailRevision])

  function handleOpenChange(next: boolean) {
    if (saving) return
    setOpen(next)
    if (next) {
      setLoading(true)
      setDetail(null)
      setError(null)
      setRejecting(false)
      setReason("")
    }
  }

  async function openDocument(document: PartnerDocumentMetadata) {
    const tab = window.open("", "_blank")
    setOpeningDocument(document.id)
    setError(null)
    try {
      const response = await adminPartnerRegistrations.document(
        item.id,
        document.id
      )
      const blob = new Blob([decodeBase64(response.contentBase64)], {
        type: response.contentType,
      })
      const url = URL.createObjectURL(blob)
      if (tab) {
        tab.location.href = url
      } else {
        const link = window.document.createElement("a")
        link.href = url
        link.download = response.fileName
        link.click()
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (cause) {
      tab?.close()
      setError(
        cause instanceof Error ? cause.message : "Không thể mở tài liệu."
      )
    } finally {
      setOpeningDocument(null)
    }
  }

  async function review(status: "VERIFIED" | "REJECTED") {
    if (status === "REJECTED" && !reason.trim()) {
      setError("Vui lòng nhập lý do từ chối.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await adminPartnerRegistrations.review(
        item.id,
        status,
        reason.trim() || undefined
      )
      onUpdated()
      setOpen(false)
    } catch (cause) {
      if (cause instanceof PartnerReviewApiError && cause.status === 409) {
        try {
          setDetail(await adminPartnerRegistrations.detail(item.id))
        } catch {
          // Keep the conflict message visible if the refresh also fails.
        }
      }
      setError(
        cause instanceof Error ? cause.message : "Không thể xét duyệt hồ sơ."
      )
    } finally {
      setSaving(false)
    }
  }

  const verification = detail?.businessVerification

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 bg-card text-xs"
            aria-label={`Xem hồ sơ ${item.legalName}`}
          />
        }
      >
        Xem xét <ArrowRight size={12} aria-hidden="true" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[92dvh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-6 text-card-foreground shadow-2xl outline-none">
          <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
            <div>
              <Dialog.Title className="font-heading text-lg font-bold">
                Xét duyệt hồ sơ đối tác
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-muted-foreground">
                Hồ sơ #{item.id} · {item.legalName}
              </Dialog.Description>
            </div>
            <Dialog.Close
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Đóng hộp thoại"
                  disabled={saving}
                />
              }
            >
              <X size={16} />
            </Dialog.Close>
          </div>

          {loading ? (
            <p
              role="status"
              className="py-10 text-center text-sm text-muted-foreground"
            >
              Đang tải chi tiết hồ sơ...
            </p>
          ) : !detail ? (
            <div role="alert" className="py-8 text-sm">
              <p>{error || "Không thể tải chi tiết hồ sơ."}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLoading(true)
                  setDetailRevision((value) => value + 1)
                }}
                className="mt-3"
              >
                Thử lại
              </Button>
            </div>
          ) : (
            <div className="mt-5 space-y-5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <WhitelistStatusBadge status={detail.verificationStatus} />
                <span className="text-muted-foreground">
                  Gửi {formatDate(detail.createdAt)}
                </span>
              </div>
              <dl className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Tên pháp nhân</dt>
                  <dd className="mt-0.5 font-semibold">{detail.legalName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Mã số thuế</dt>
                  <dd className="mt-0.5 font-mono font-semibold">
                    {detail.taxCode}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Người đăng ký</dt>
                  <dd className="mt-0.5 font-semibold">
                    {detail.representativeNameAndTitle}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Đại diện pháp luật</dt>
                  <dd className="mt-0.5">
                    {detail.legalRepresentative ? "Có" : "Được ủy quyền"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="mt-0.5 break-all">{detail.corporateEmail}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    Số điện thoại liên hệ
                  </dt>
                  <dd className="mt-0.5">{detail.contactPhone}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Tên miền</dt>
                  <dd className="mt-0.5 font-mono break-all">
                    {detail.officialDomain}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Hotline</dt>
                  <dd className="mt-0.5 font-mono">{detail.officialHotline}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">SMS Brandname</dt>
                  <dd className="mt-0.5 font-mono">{detail.smsBrandName}</dd>
                </div>
              </dl>

              <section
                aria-label="Đối soát doanh nghiệp"
                className="rounded-lg border border-border p-4"
              >
                <h3 className="font-heading text-sm font-bold">
                  Đối soát doanh nghiệp
                </h3>
                {verification ? (
                  <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Kết quả</dt>
                      <dd className="font-semibold">{verification.outcome}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        Trạng thái hoạt động
                      </dt>
                      <dd>{verification.xinvoice.activityStatus}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        Tên trên XinVoice
                      </dt>
                      <dd>{verification.xinvoice.legalName || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        MST trên XinVoice
                      </dt>
                      <dd>{verification.xinvoice.taxCode || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Khớp tên / MST</dt>
                      <dd>
                        {verification.formNameVsXinvoice} /{" "}
                        {verification.formTaxCodeVsXinvoice}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">OCR</dt>
                      <dd>
                        {verification.ocrEnabled
                          ? verification.documents
                              .map(
                                (entry) => `${entry.fileName}: ${entry.status}`
                              )
                              .join(", ") || "Chưa có"
                          : "Đang tắt"}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-2 text-muted-foreground">
                    Chưa có kết quả đối soát được lưu.
                  </p>
                )}
              </section>

              <section aria-label="Tài liệu đính kèm">
                <h3 className="font-heading text-sm font-bold">
                  Tài liệu đính kèm ({detail.documents.length})
                </h3>
                <ul className="mt-2 space-y-2">
                  {detail.documents.map((document) => (
                    <li
                      key={document.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText size={17} className="shrink-0 text-primary" />
                        <span className="truncate">{document.fileName}</span>
                        <span className="hidden text-muted-foreground sm:inline">
                          ·{" "}
                          {documentLabels[document.documentType] ||
                            document.documentType}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={openingDocument !== null}
                        onClick={() => openDocument(document)}
                      >
                        {openingDocument === document.id ? "Đang mở..." : "Mở"}
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>

              {detail.verificationStatus !== "PENDING" && (
                <div className="rounded-lg bg-muted/30 p-3">
                  <p>
                    Người xét duyệt: {detail.reviewedBy || "—"}
                    {detail.reviewedAt
                      ? ` · ${formatDate(detail.reviewedAt)}`
                      : ""}
                  </p>
                  {detail.reviewReason && (
                    <p className="mt-1">Lý do: {detail.reviewReason}</p>
                  )}
                </div>
              )}

              {detail.verificationStatus === "PENDING" && (
                <div className="space-y-3 border-t border-border pt-4">
                  {rejecting && (
                    <div>
                      <label
                        htmlFor={`rejection-reason-${item.id}`}
                        className="font-semibold"
                      >
                        Lý do từ chối{" "}
                        <span className="text-destructive">*</span>
                      </label>
                      <textarea
                        id={`rejection-reason-${item.id}`}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        maxLength={2000}
                        rows={3}
                        className="mt-1 w-full rounded-lg border border-input bg-card p-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      />
                    </div>
                  )}
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={saving}
                      onClick={() => {
                        if (rejecting) setRejecting(false)
                        else setOpen(false)
                      }}
                    >
                      Đóng
                    </Button>
                    {rejecting ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={saving || !reason.trim()}
                        onClick={() => review("REJECTED")}
                      >
                        Xác nhận từ chối
                      </Button>
                    ) : (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={saving}
                        onClick={() => setRejecting(true)}
                      >
                        Từ chối
                      </Button>
                    )}
                    {!rejecting && (
                      <Button
                        size="sm"
                        disabled={saving}
                        onClick={() => review("VERIFIED")}
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <CheckCircle size={15} />
                        {saving ? "Đang lưu..." : "Phê duyệt"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {error && (
                <p role="alert" className="text-xs text-destructive">
                  {error}
                </p>
              )}
            </div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
