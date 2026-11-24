"use client"

import { Dialog } from "@base-ui/react/dialog"
import { X } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { GROUP_LABELS, type RateLimitRule } from "./rate-limit-data"

export function EnforcementBadge({ enforced }: { enforced: boolean }) {
  return (
    <span
      className={
        enforced
          ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
          : "inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
      }
    >
      <span aria-hidden="true">{enforced ? "●" : "○"}</span>
      {enforced ? "Đã có thực thi" : "Chưa thực thi"}
    </span>
  )
}

export function RateLimitDetailDialog({
  rule,
  onClose,
}: {
  rule: RateLimitRule
  onClose: () => void
}) {
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/45" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xl outline-none sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="mb-2 text-xs text-muted-foreground">
                {GROUP_LABELS[rule.group]}
              </p>
              <Dialog.Title className="font-heading text-lg font-bold">
                {rule.name}
              </Dialog.Title>
            </div>
            <Dialog.Close
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Đóng chi tiết"
                />
              }
            >
              <X aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
            {rule.description}
          </Dialog.Description>
          <div className="mt-4">
            <EnforcementBadge enforced={rule.enforced} />
          </div>
          <dl className="mt-5 grid grid-cols-1 gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-2">
            {[
              ["Phạm vi", rule.scope],
              ["Hạn mức mẫu", rule.limit],
              ["Khoảng thời gian", rule.window],
              ["Nguồn thiết lập", rule.source],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-sm font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <h2 className="mt-5 font-heading text-sm font-semibold">
            Cách áp dụng
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {rule.behavior}
          </p>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Dữ liệu minh họa từ cấu hình và chính sách mẫu. Chưa xác nhận cấu
            hình trên môi trường đang chạy.
          </p>
          <div className="mt-5 flex justify-end border-t border-border pt-4">
            <Dialog.Close render={<Button variant="outline" />}>
              Đóng
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
