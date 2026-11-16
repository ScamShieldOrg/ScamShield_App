"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { EscalationQueue } from "./escalation-queue"
import { EscalationDetail } from "./escalation-detail"
import { EscalationDecisionPanel } from "./escalation-decision-panel"
import {
  mockEscalations,
  type Decision,
  type EscalationStatus,
} from "./mock-escalations"

const statusBadges: Record<
  EscalationStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "CHỜ DUYỆT",
    className:
      "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  },
  reviewing: {
    label: "ĐANG XEM XÉT",
    className: "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-300",
  },
  resolved: {
    label: "ĐÃ XỬ LÝ",
    className:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
}

export function AdminEscalationsWorkspace() {
  const [selectedId, setSelectedId] = useState(mockEscalations[0].id)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"pending" | "all">("all")
  const [decisions, setDecisions] = useState<
    Record<string, { decision: Decision; reason: string }>
  >({})

  const cases = useMemo(
    () =>
      mockEscalations.map((item) => ({
        ...item,
        status: (decisions[item.id]
          ? "resolved"
          : item.status) as EscalationStatus,
      })),
    [decisions]
  )
  const selected = cases.find((item) => item.id === selectedId) ?? cases[0]
  const pendingCount = cases.filter((item) => item.status === "pending").length
  const visibleCases = cases.filter((item) => {
    const matchesFilter = filter === "all" || item.status === "pending"
    const query = search.trim().toLocaleLowerCase("vi-VN")
    return (
      matchesFilter &&
      (!query ||
        `${item.id} ${item.name} ${item.userId} ${item.email}`
          .toLocaleLowerCase("vi-VN")
          .includes(query))
    )
  })

  function handleDecision(decision: Decision, reason: string) {
    setDecisions((current) => ({
      ...current,
      [selected.id]: { decision, reason },
    }))
    setFilter("all")
  }

  function handleFilter(next: "pending" | "all") {
    setFilter(next)
    if (next === "pending" && selected.status !== "pending") {
      const firstPending = cases.find((item) => item.status === "pending")
      if (firstPending) setSelectedId(firstPending.id)
    }
  }

  return (
    <div className="mx-auto max-w-[1800px] overflow-hidden rounded-lg border border-border bg-background shadow-sm">
      <div className="grid min-w-0 lg:grid-cols-[300px_minmax(0,1fr)]">
        <EscalationQueue
          cases={visibleCases}
          selectedId={selectedId}
          pendingCount={pendingCount}
          search={search}
          filter={filter}
          onSearch={setSearch}
          onFilter={handleFilter}
          onSelect={setSelectedId}
        />
        <div className="min-w-0 bg-background p-4 sm:p-6">
          <header className="mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-[10px] font-bold",
                  statusBadges[selected.status].className
                )}
              >
                {statusBadges[selected.status].label}
              </span>
            </div>
            <h1 className="mt-2 font-heading text-xl font-bold tracking-tight sm:text-2xl">
              Xem xét báo cáo lạm dụng tài khoản
            </h1>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {selected.id} · Kiểm duyệt viên {selected.moderator} gửi ·{" "}
              {selected.submittedAt}
            </p>
          </header>
          <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(340px,35%)]">
            <EscalationDetail item={selected} />
            <EscalationDecisionPanel
              key={selected.id}
              caseId={selected.id}
              resolved={selected.status === "resolved"}
              onSubmit={handleDecision}
            />
          </div>
          <p className="pt-5 text-[11px] text-muted-foreground">
            Bằng chứng và mọi thao tác quản trị đều được lưu để kiểm toán.
          </p>
        </div>
      </div>
    </div>
  )
}
