"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  ChartBar,
  FileText,
  Scales,
  ShieldCheck,
} from "@phosphor-icons/react"
import {
  getModeratorDashboard,
  type ModeratorDashboardData,
} from "@/features/moderator/services/moderator-dashboard.service"

const groups = [
  {
    key: "reports",
    title: "Báo cáo",
    accepted: "Phê duyệt",
    total: "Đã xử lý",
    icon: FileText,
    href: "/moderator/reports",
  },
  {
    key: "disputes",
    title: "Khiếu nại",
    accepted: "Chấp nhận",
    total: "Đã xử lý",
    icon: Scales,
    href: "/moderator/disputes",
  },
  {
    key: "partnerSubmissions",
    title: "Thẩm định đối tác",
    accepted: "Đã xác minh",
    total: "Đã thẩm định",
    icon: ShieldCheck,
    href: "/moderator/indicators",
  },
] as const

const format = new Intl.NumberFormat("vi-VN")

export function ModeratorDashboard() {
  const [data, setData] = useState<ModeratorDashboardData | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    void getModeratorDashboard(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true)
      })
    return () => controller.abort()
  }, [attempt])

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-5 sm:p-7">
      <header className="rounded-2xl bg-slate-950 p-6 text-white dark:border dark:border-slate-800">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-emerald-300">
          <ChartBar size={18} aria-hidden="true" />
          Không gian kiểm duyệt
        </div>
        <h1 className="text-2xl font-bold">Tổng quan kiểm duyệt</h1>
        <p className="mt-2 text-sm text-slate-300">
          Thống kê các hồ sơ bạn đã trực tiếp ra quyết định.
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-border bg-card p-5 text-sm"
        >
          <p>Không thể tải số liệu kiểm duyệt.</p>
          <button
            type="button"
            className="mt-2 underline"
            onClick={() => {
              setError(false)
              setAttempt((value) => value + 1)
            }}
          >
            Thử lại
          </button>
        </div>
      ) : !data ? (
        <p
          role="status"
          className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground"
        >
          Đang tải số liệu kiểm duyệt…
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const counts = data[group.key]
            const Icon = group.icon
            return (
              <article
                key={group.key}
                className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-muted p-2.5">
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <h2 className="font-semibold">{group.title}</h2>
                </div>
                <p className="mt-5 text-sm text-muted-foreground">
                  {group.total}
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums">
                  {format.format(counts.total)}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4 text-sm">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                    <dt>{group.accepted}</dt>
                    <dd className="font-bold tabular-nums">
                      {format.format(counts.accepted)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-rose-50 p-2 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                    <dt>Từ chối</dt>
                    <dd className="font-bold tabular-nums">
                      {format.format(counts.rejected)}
                    </dd>
                  </div>
                </dl>
                <Link
                  href={group.href}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold hover:underline"
                >
                  Mở hàng đợi <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
