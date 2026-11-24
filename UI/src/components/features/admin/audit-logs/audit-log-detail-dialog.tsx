"use client"

import { Dialog } from "@base-ui/react/dialog"
import { X } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import {
  actionLabel,
  entityLabel,
  formatAuditTime,
  formatAuditValue,
  UNKNOWN_ACTOR,
  type AuditLogEntry,
} from "./audit-log-data"

export function AuditLogDetailDialog({
  entry,
  onClose,
  returnFocus,
}: {
  entry: AuditLogEntry
  onClose: () => void
  returnFocus: HTMLElement | null
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
        <Dialog.Popup
          finalFocus={() => returnFocus}
          className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xl outline-none sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="font-heading text-lg font-bold">
                Chi tiết nhật ký #{entry.id}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-muted-foreground">
                Bản ghi minh họa · {formatAuditTime(entry.createdAt)} (UTC+7)
              </Dialog.Description>
            </div>
            <Dialog.Close
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Đóng chi tiết nhật ký"
                />
              }
            >
              <X aria-hidden="true" />
            </Dialog.Close>
          </div>
          <dl className="mt-5 grid gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Người thực hiện</dt>
              <dd className="mt-1 text-sm font-semibold break-words">
                {entry.actorName ?? UNKNOWN_ACTOR}
                {entry.actorUserId !== null && (
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    ID {entry.actorUserId}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Đối tượng</dt>
              <dd className="mt-1 text-sm font-semibold">
                {entityLabel(entry.entityType)} ·{" "}
                {entry.entityId === null ? "—" : `#${entry.entityId}`}
                <span className="mt-1 block font-mono text-xs font-normal break-all text-muted-foreground">
                  {entry.entityType}
                </span>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Hành động</dt>
              <dd className="mt-1 text-sm font-semibold">
                {actionLabel(entry.action)}
                <code className="mt-1 block text-xs font-normal break-all text-muted-foreground">
                  {entry.action}
                </code>
              </dd>
            </div>
          </dl>
          <h2 className="mt-5 font-heading text-sm font-semibold">Lý do</h2>
          <p className="mt-2 text-sm leading-6 break-words whitespace-pre-wrap text-muted-foreground">
            {entry.reason}
          </p>
          <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
            {[
              ["Giá trị trước", entry.previousValue],
              ["Giá trị sau", entry.newValue],
            ].map(([label, value]) => (
              <section
                key={label}
                className="min-w-0 rounded-lg border border-border"
              >
                <h2 className="border-b border-border bg-muted/40 px-4 py-3 font-heading text-sm font-semibold">
                  {label}
                </h2>
                <pre className="max-h-80 overflow-y-auto p-4 font-mono text-xs leading-6 break-all whitespace-pre-wrap">
                  {formatAuditValue(value)}
                </pre>
              </section>
            ))}
          </div>
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
