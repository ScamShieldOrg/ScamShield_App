"use client"

import { useEffect, useState } from "react"
import { Flag, MagnifyingGlass, Users, X } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import {
  adminUsers,
  formatAccountDate,
  type AdminUserPage,
} from "@/features/admin/services/admin-users"
import { cn } from "@/lib/utils"
import { AccountRoleBadge, AccountStatusBadge } from "./account-badges"
import { AccountDetailDialog } from "./account-detail-dialog"

export function AdminAccountsDashboard() {
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<AdminUserPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const accounts = loading ? [] : (result?.items ?? [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = search.trim()
      if (nextQuery !== query) {
        setLoading(true)
        setPage(1)
        setQuery(nextQuery)
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [search, query])

  useEffect(() => {
    let active = true
    adminUsers
      .list(query, page)
      .then((data) => {
        if (!active) return
        setResult(data)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setResult(null)
        setError(
          cause instanceof Error ? cause.message : "Không thể tải tài khoản."
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [query, page, revision])

  return (
    <section
      aria-labelledby="accounts-heading"
      className="mx-auto max-w-screen-2xl"
    >
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            id="accounts-heading"
            className="font-heading text-2xl font-bold tracking-tight"
          >
            Quản lý Tài khoản
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-red-800 dark:text-red-300">
            <Flag size={13} weight="fill" aria-hidden="true" />
            {result?.flaggedAccountsCount ?? "—"} tài khoản cần kiểm tra
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute top-3 left-3 text-muted-foreground"
            aria-hidden="true"
          />
          <label htmlFor="admin-account-search" className="sr-only">
            Tìm tài khoản theo tên, email hoặc mã
          </label>
          <input
            id="admin-account-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm tên, email..."
            className="h-10 w-full rounded-lg border border-input bg-card pr-10 pl-9 text-xs placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Xóa tìm kiếm"
              onClick={() => setSearch("")}
              className="absolute top-1 right-1"
            >
              <X size={14} />
            </Button>
          )}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div
          role="region"
          aria-label="Danh sách tài khoản, cuộn ngang để xem đầy đủ"
          tabIndex={0}
          className="overflow-x-auto focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <table className="w-full min-w-4xl border-collapse text-left text-xs">
            <caption className="sr-only">
              Danh sách tài khoản quản trị, có thể tìm kiếm theo tên, email hoặc
              mã.
            </caption>
            <thead className="border-b border-border bg-muted/30 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              <tr>
                {[
                  "ID",
                  "Tên / Email",
                  "Vai trò",
                  "Tham gia",
                  "Báo cáo",
                  "Trạng thái",
                  "Thao tác",
                ].map((title) => (
                  <th key={title} scope="col" className="px-4 py-3 font-medium">
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {accounts.map((account) => (
                <tr
                  key={account.id}
                  className={cn(
                    "transition-colors hover:bg-muted/40",
                    account.isFlagged &&
                      "bg-orange-50/80 hover:bg-orange-100/60 dark:bg-amber-950/20 dark:hover:bg-amber-950/40"
                  )}
                >
                  <td className="px-4 py-3.5 text-[11px] text-muted-foreground">
                    {account.userCode || `#${account.id}`}
                  </td>
                  <th scope="row" className="px-4 py-3.5 font-normal">
                    <span className="block font-semibold">
                      {account.fullName || "Chưa có tên"}
                    </span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {account.email}
                    </span>
                  </th>
                  <td className="px-4 py-3.5">
                    <AccountRoleBadge
                      role={account.role}
                      label={account.roleLabel}
                    />
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground tabular-nums">
                    {formatAccountDate(account.joinedAt)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3.5 tabular-nums",
                      account.isFlagged &&
                        "font-semibold text-red-800 dark:text-red-300"
                    )}
                  >
                    {account.reportCount.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-3.5">
                    <AccountStatusBadge
                      status={account.status}
                      label={account.statusLabel}
                      isFlagged={account.isFlagged}
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <AccountDetailDialog account={account} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && (
          <p
            role="status"
            className="px-4 py-10 text-center text-sm text-muted-foreground"
          >
            Đang tải tài khoản...
          </p>
        )}
        {error && !loading && (
          <div role="alert" className="px-4 py-10 text-center text-sm">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                setLoading(true)
                setRevision((value) => value + 1)
              }}
            >
              Thử lại
            </Button>
          </div>
        )}
        {!loading && !error && accounts.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
            <Users
              size={28}
              className="text-muted-foreground"
              aria-hidden="true"
            />
            <h2 className="font-heading text-base font-semibold">
              Không tìm thấy tài khoản
            </h2>
            <p className="text-xs text-muted-foreground">
              {query
                ? "Thử tên, email hoặc mã tài khoản khác."
                : "Chưa có tài khoản nào."}
            </p>
            {query && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setSearch("")}
              >
                Xóa tìm kiếm
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground">
        <p role="status" aria-live="polite">
          Hiển thị {accounts.length} / {result?.totalItems ?? 0} tài khoản
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={loading || !result?.hasPrevious}
            onClick={() => {
              setLoading(true)
              setPage((value) => value - 1)
            }}
          >
            Trước
          </Button>
          <span>
            Trang {result?.currentPage ?? page} /{" "}
            {Math.max(result?.totalPages ?? 0, 1)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || !result?.hasNext}
            onClick={() => {
              setLoading(true)
              setPage((value) => value + 1)
            }}
          >
            Sau
          </Button>
        </div>
      </div>
    </section>
  )
}
