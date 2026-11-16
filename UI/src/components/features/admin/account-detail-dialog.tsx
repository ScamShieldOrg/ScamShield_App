"use client"

import { Dialog } from "@base-ui/react/dialog"
import { X } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import {
  formatAccountDate,
  type AdminAccount,
} from "@/features/admin/services/admin-users"
import { AccountRoleBadge, AccountStatusBadge } from "./account-badges"

export function AccountDetailDialog({ account }: { account: AdminAccount }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 bg-card text-xs"
            aria-label={`Chi tiết tài khoản ${account.fullName || account.email}`}
          />
        }
      >
        Chi tiết
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg outline-none">
          <Dialog.Title className="pr-8 font-heading text-xl font-bold">
            Chi tiết tài khoản
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-xs text-muted-foreground">
            {account.userCode || account.id}
          </Dialog.Description>
          <Dialog.Close
            render={
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4"
                aria-label="Đóng chi tiết tài khoản"
              />
            }
          >
            <X size={18} />
          </Dialog.Close>
          <div className="mt-6 border-b border-border pb-5">
            <h3 className="font-heading text-lg font-semibold">
              {account.fullName || "Chưa có tên"}
            </h3>
            <p className="mt-1 text-sm break-all text-muted-foreground">
              {account.email}
            </p>
          </div>
          <dl className="mt-5 grid grid-cols-2 items-start gap-5 text-xs">
            <div>
              <dt className="mb-2 text-muted-foreground">Vai trò</dt>
              <dd>
                <AccountRoleBadge
                  role={account.role}
                  label={account.roleLabel}
                />
              </dd>
            </div>
            <div>
              <dt className="mb-2 text-muted-foreground">Trạng thái</dt>
              <dd>
                <AccountStatusBadge
                  status={account.status}
                  label={account.statusLabel}
                  isFlagged={account.isFlagged}
                />
              </dd>
            </div>
            <div>
              <dt className="mb-2 text-muted-foreground">Tham gia</dt>
              <dd>{formatAccountDate(account.joinedAt)}</dd>
            </div>
            <div>
              <dt className="mb-2 text-muted-foreground">Báo cáo đã gửi</dt>
              <dd className="font-semibold tabular-nums">
                {account.reportCount.toLocaleString("vi-VN")}
              </dd>
            </div>
          </dl>
          {account.isFlagged && (
            <p className="mt-6 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              Tài khoản cần được kiểm tra. {account.flagReasons?.join(", ")}
            </p>
          )}
          <div className="mt-6 flex justify-end">
            <Dialog.Close render={<Button variant="outline" />}>
              Đóng
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
