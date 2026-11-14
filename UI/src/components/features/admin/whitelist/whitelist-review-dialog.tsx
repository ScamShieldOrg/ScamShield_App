"use client"

import { useEffect, useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { ArrowRight, CheckCircle, FileText, X } from "@phosphor-icons/react"
import { toast } from "react-toastify"
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

const documentTypes = ["BUSINESS_LICENSE", "OWNERSHIP_PROOF", "AUTHORIZATION"]

function getDocumentGroups(detail: PartnerRegistrationDetail) {
  if (detail.documentGroups) return detail.documentGroups
  return documentTypes.map((documentType) => ({
    documentType,
    documents: (detail.documents ?? []).filter(
      (document) => document.documentType === documentType
    ),
  }))
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
  const [resending, setResending] = useState(false)
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
    if (!tab) {
      setError(
        "Trình duyệt đã chặn cửa sổ xem tài liệu. Vui lòng cho phép cửa sổ bật lên và thử lại."
      )
      return
    }
    setOpeningDocument(document.id)
    setError(null)
    let blobUrl: string | undefined
    try {
      const response = await adminPartnerRegistrations.document(
        item.id,
        document.id
      )
      if (response.downloadUrl) {
        tab.location.href = response.downloadUrl
      } else if (response.contentBase64) {
        const blob = new Blob([decodeBase64(response.contentBase64)], {
          type: response.contentType,
        })
        blobUrl = URL.createObjectURL(blob)
        tab.location.href = blobUrl
      } else {
        throw new Error("Không nhận được liên kết xem tài liệu.")
      }
      if (blobUrl)
        window.setTimeout(() => URL.revokeObjectURL(blobUrl!), 60_000)
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
    if (!reason.trim()) {
      setError(
        status === "VERIFIED"
          ? "Vui lòng nhập lý do phê duyệt."
          : "Vui lòng nhập lý do từ chối."
      )
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
      if (status === "VERIFIED") {
        try {
          const updated = await adminPartnerRegistrations.detail(item.id)
          if (updated.passwordLinkEmailStatus === "SENT") {
            toast.success("Đã gửi email đặt mật khẩu cho doanh nghiệp.")
          }
        } catch {
          // Approval succeeded; an unavailable status refresh must not report failure.
        }
      }
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

  async function resendPasswordLink() {
    setResending(true)
    setError(null)
    try {
      await adminPartnerRegistrations.resendPasswordLink(item.id)
      const updated = await adminPartnerRegistrations.detail(item.id)
      setDetail(updated)
      if (updated.passwordLinkEmailStatus === "SENT") {
        toast.success("Đã gửi lại email đặt mật khẩu cho doanh nghiệp.")
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể gửi lại link."
      )
    } finally {
      setResending(false)
    }
  }

  const verification = detail?.businessVerification
  const approvalWaiting =
    detail?.documentVerificationStatus === "PENDING_OCR" ||
    detail?.documentVerificationStatus === "RUNNING_OCR" ||
    (detail
      ? getDocumentGroups(detail).some((group) =>
          group.documents.some(
            (document) => document.storageStatus === "MOVING"
          )
        )
      : false)
  const emailStatusLabel = detail?.passwordSetupCompletedAt
    ? "Đã đặt mật khẩu"
    : detail?.passwordLinkEmailStatus === "SENT"
      ? "Đã gửi"
      : detail?.passwordLinkEmailStatus === "FAILED"
        ? "Gửi thất bại"
        : detail?.passwordLinkEmailStatus === "PENDING"
          ? "Đang gửi"
          : "Chưa gửi"
  const emailStatusStyle =
    detail?.passwordSetupCompletedAt ||
    detail?.passwordLinkEmailStatus === "SENT"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
      : detail?.passwordLinkEmailStatus === "FAILED"
        ? "bg-destructive/10 text-destructive"
        : detail?.passwordLinkEmailStatus === "PENDING"
          ? "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
          : "bg-muted text-muted-foreground"

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
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[92dvh] w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-4 text-card-foreground shadow-2xl outline-none sm:p-6">
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
              <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                <section
                  aria-labelledby="partner-info-title"
                  className="min-w-0 rounded-lg border border-border bg-muted/20 p-4"
                >
                  <h3
                    id="partner-info-title"
                    className="font-heading text-sm font-bold"
                  >
                    Thông tin doanh nghiệp
                  </h3>
                  <dl className="mt-4 grid gap-y-3 sm:grid-cols-2 sm:gap-x-8">
                    <div>
                      <dt className="text-muted-foreground">Tên pháp nhân</dt>
                      <dd className="mt-0.5 font-semibold">
                        {detail.legalName}
                      </dd>
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
                      <dt className="text-muted-foreground">
                        Đại diện pháp luật
                      </dt>
                      <dd className="mt-0.5">
                        {detail.legalRepresentative ? "Có" : "Được ủy quyền"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Email</dt>
                      <dd className="mt-0.5 break-all">
                        {detail.corporateEmail}
                      </dd>
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
                      <dd className="mt-0.5 font-mono">
                        {detail.officialHotline}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">SMS Brandname</dt>
                      <dd className="mt-0.5 font-mono">
                        {detail.smsBrandName}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section
                  aria-label="Đối soát doanh nghiệp"
                  className="min-w-0 rounded-lg border border-border p-4"
                >
                  <h3 className="font-heading text-sm font-bold">
                    Đối soát doanh nghiệp
                  </h3>
                  {verification ? (
                    <dl className="mt-4 grid gap-y-3 sm:grid-cols-2 sm:gap-x-8">
                      <div>
                        <dt className="text-muted-foreground">Kết quả</dt>
                        <dd className="font-semibold">
                          {verification.outcome}
                        </dd>
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
                        <dd className="break-words">
                          {verification.xinvoice.legalName || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">
                          MST trên XinVoice
                        </dt>
                        <dd>{verification.xinvoice.taxCode || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">
                          Khớp tên / MST
                        </dt>
                        <dd>
                          {verification.formNameVsXinvoice} /{" "}
                          {verification.formTaxCodeVsXinvoice}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-2 text-muted-foreground">
                      Chưa có kết quả đối soát được lưu.
                    </p>
                  )}
                  {verification?.ocrEnabled && (
                    <div className="mt-4 border-t border-border pt-3">
                      <h4 className="font-semibold">Đối soát OCR giấy phép</h4>
                      {verification.documents.length ? (
                        verification.documents.map((document) => (
                          <p
                            key={document.fileName}
                            className="mt-1 text-muted-foreground"
                          >
                            {document.fileName}: {document.status}
                          </p>
                        ))
                      ) : (
                        <p className="mt-1 text-muted-foreground">
                          Đang chờ kết quả OCR.
                        </p>
                      )}
                    </div>
                  )}
                </section>
              </div>

              <section aria-label="Tài liệu đính kèm">
                <Button
                  variant="outline"
                  size="sm"
                  className="mb-2"
                  onClick={() => setDetailRevision((value) => value + 1)}
                >
                  Làm mới trạng thái
                </Button>
                <p className="mb-2 text-muted-foreground">
                  Đối soát tài liệu:{" "}
                  {detail.documentVerificationStatus === "PENDING_OCR" ||
                  detail.documentVerificationStatus === "RUNNING_OCR"
                    ? "Đang xử lý OCR"
                    : detail.documentVerificationStatus === "PASSED"
                      ? "Đã đối soát"
                      : detail.documentVerificationStatus === "FLAGGED"
                        ? "Cần quản trị viên kiểm tra"
                        : "Không yêu cầu OCR"}
                </p>
                <h3 className="font-heading text-sm font-bold">
                  Tài liệu đính kèm (
                  {getDocumentGroups(detail).reduce(
                    (count, group) => count + group.documents.length,
                    0
                  )}
                  )
                </h3>
                <div className="mt-3 space-y-4">
                  {getDocumentGroups(detail).map((group) => (
                    <div
                      key={group.documentType}
                      className="rounded-xl border border-border bg-muted/20 p-4"
                    >
                      <h4 className="border-b border-border pb-2 font-heading text-sm font-semibold">
                        {documentLabels[group.documentType] ||
                          group.documentType}{" "}
                        ({group.documents.length})
                      </h4>
                      {group.documents.length === 0 ? (
                        <p className="mt-2 text-muted-foreground">
                          Chưa có tài liệu.
                        </p>
                      ) : (
                        <ul className="mt-2 space-y-2">
                          {group.documents.map((document) => (
                            <li
                              key={document.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <FileText
                                  size={17}
                                  className="shrink-0 text-primary"
                                />
                                <span className="truncate">
                                  {document.fileName}
                                </span>
                                {document.storageStatus === "MOVING" && (
                                  <span className="text-muted-foreground">
                                    Đang chuẩn bị
                                  </span>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={
                                  openingDocument !== null ||
                                  document.storageStatus === "MOVING"
                                }
                                onClick={() => openDocument(document)}
                              >
                                {openingDocument === document.id
                                  ? "Đang mở..."
                                  : "Mở"}
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {detail.verificationStatus !== "PENDING" && (
                <section
                  aria-labelledby="review-result-title"
                  className="rounded-lg border border-border bg-muted/20 p-4"
                >
                  <h3
                    id="review-result-title"
                    className="font-heading text-sm font-bold"
                  >
                    Kết quả xét duyệt
                  </h3>
                  <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Người xét duyệt</dt>
                      <dd className="mt-1 text-sm font-semibold">
                        {detail.reviewedBy || "—"}
                      </dd>
                      {detail.reviewedAt && (
                        <dd className="mt-0.5 text-muted-foreground">
                          {formatDate(detail.reviewedAt)}
                        </dd>
                      )}
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        {detail.verificationStatus === "VERIFIED"
                          ? "Lý do phê duyệt"
                          : "Lý do từ chối"}
                      </dt>
                      <dd className="mt-1 text-sm font-medium break-words">
                        {detail.reviewReason ||
                          (detail.verificationStatus === "VERIFIED"
                            ? "Chưa có lý do phê duyệt"
                            : "—")}
                      </dd>
                    </div>
                  </dl>
                </section>
              )}

              {detail.verificationStatus === "VERIFIED" && (
                <section
                  className="rounded-lg border border-border bg-card p-4"
                  aria-label="Email đặt mật khẩu"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-heading text-sm font-bold">
                      Email đặt mật khẩu
                    </h3>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${emailStatusStyle}`}
                    >
                      {emailStatusLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    Gửi tới {detail.corporateEmail}
                  </p>
                  {!detail.passwordSetupCompletedAt && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={resending}
                      onClick={resendPasswordLink}
                      className="mt-3"
                    >
                      {resending ? "Đang gửi..." : "Gửi lại link đặt mật khẩu"}
                    </Button>
                  )}
                </section>
              )}

              {detail.verificationStatus === "PENDING" && (
                <div className="space-y-3 border-t border-border pt-4">
                  <div>
                    <label
                      htmlFor={`review-reason-${item.id}`}
                      className="font-semibold"
                    >
                      {rejecting ? "Lý do từ chối" : "Lý do phê duyệt"}{" "}
                      <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      id={`review-reason-${item.id}`}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      required
                      maxLength={2000}
                      rows={3}
                      placeholder={
                        rejecting
                          ? "Nêu lý do từ chối hồ sơ"
                          : "Nêu căn cứ phê duyệt hồ sơ"
                      }
                      className="mt-1 w-full rounded-lg border border-input bg-card p-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={saving}
                      onClick={() => {
                        if (rejecting) {
                          setRejecting(false)
                          setReason("")
                        } else setOpen(false)
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
                        onClick={() => {
                          setRejecting(true)
                          setReason("")
                        }}
                      >
                        Từ chối
                      </Button>
                    )}
                    {!rejecting && (
                      <Button
                        size="sm"
                        disabled={saving || !reason.trim() || approvalWaiting}
                        onClick={() => review("VERIFIED")}
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <CheckCircle size={15} />
                        {saving ? "Đang lưu..." : "Phê duyệt"}
                      </Button>
                    )}
                  </div>
                  {approvalWaiting && !rejecting && (
                    <p className="mt-2 text-muted-foreground">
                      Chờ tài liệu sẵn sàng và OCR hoàn tất trước khi phê duyệt.
                    </p>
                  )}
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
