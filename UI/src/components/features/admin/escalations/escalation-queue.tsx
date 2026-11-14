import { MagnifyingGlass } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import type { Escalation, EscalationStatus } from "./mock-escalations"

const statusLabels: Record<EscalationStatus, string> = {
  pending: "CHỜ DUYỆT",
  reviewing: "ĐANG XEM XÉT",
  resolved: "ĐÃ XỬ LÝ",
}

export function EscalationQueue({
  cases,
  selectedId,
  pendingCount,
  search,
  filter,
  onSearch,
  onFilter,
  onSelect,
}: {
  cases: Escalation[]
  selectedId: string
  pendingCount: number
  search: string
  filter: "pending" | "all"
  onSearch: (value: string) => void
  onFilter: (value: "pending" | "all") => void
  onSelect: (id: string) => void
}) {
  return (
    <aside
      aria-label="Danh sách hồ sơ lạm dụng"
      className="min-w-0 border-b border-border bg-card lg:border-r lg:border-b-0"
    >
      <div className="p-4">
        <h2 className="font-heading text-lg font-bold tracking-tight">
          Hồ sơ lạm dụng tài khoản
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {pendingCount} hồ sơ chờ Quản trị viên duyệt
        </p>
        <div className="relative mt-4">
          <MagnifyingGlass
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute top-2.5 left-3 text-muted-foreground"
          />
          <label htmlFor="escalation-search" className="sr-only">
            Tìm tài khoản hoặc mã hồ sơ
          </label>
          <input
            id="escalation-search"
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Tìm tài khoản hoặc mã hồ sơ"
            className="h-10 w-full rounded-md border border-input bg-card pr-3 pl-9 text-xs placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
        </div>
        <div
          className="mt-3 grid grid-cols-2 gap-1 rounded-md bg-muted/70 p-1"
          role="group"
          aria-label="Lọc hồ sơ"
        >
          <button
            type="button"
            onClick={() => onFilter("pending")}
            aria-pressed={filter === "pending"}
            className={cn(
              "min-h-9 rounded px-2 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              filter === "pending"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Chờ duyệt {pendingCount}
          </button>
          <button
            type="button"
            onClick={() => onFilter("all")}
            aria-pressed={filter === "all"}
            className={cn(
              "min-h-9 rounded px-2 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              filter === "all"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Tất cả hồ sơ
          </button>
        </div>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto px-3 pb-3 lg:max-h-none">
        {cases.length === 0 ? (
          <p
            role="status"
            className="rounded-md border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground"
          >
            Không tìm thấy hồ sơ phù hợp.
          </p>
        ) : (
          cases.map((item) => {
            const selected = item.id === selectedId
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "block w-full rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  selected
                    ? "border-primary bg-primary text-primary-foreground dark:border-ring dark:bg-sidebar"
                    : "border-border bg-card hover:bg-muted/60"
                )}
              >
                <span
                  className={cn(
                    "block font-mono text-[10px] font-semibold",
                    selected
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  )}
                >
                  {item.id}
                </span>
                <span className="mt-1 block font-heading text-sm font-bold">
                  {item.name}
                </span>
                <span
                  className={cn(
                    "mt-1 block text-xs",
                    selected
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  )}
                >
                  {item.summary}
                </span>
                <span
                  className={cn(
                    "mt-2 block text-[10px] font-bold tracking-wide",
                    item.status === "pending"
                      ? selected
                        ? "text-amber-200"
                        : "text-amber-700 dark:text-amber-400"
                      : item.status === "reviewing"
                        ? selected
                          ? "text-sky-200"
                          : "text-sky-700 dark:text-sky-400"
                        : selected
                          ? "text-emerald-200"
                          : "text-emerald-700 dark:text-emerald-400"
                  )}
                >
                  {selected && item.status === "pending"
                    ? "CẦN XEM XÉT"
                    : statusLabels[item.status]}
                </span>
              </button>
            )
          })
        )}
      </div>
    </aside>
  )
}
