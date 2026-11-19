import { MagnifyingGlass, CircleNotch } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import type { AdminAbuseEscalationItem } from "@/features/admin/services/admin-abuse-escalations"

const badgeColorMap: Record<string, { unselected: string; selected: string }> = {
  "CẦN XEM XÉT": {
    unselected: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    selected: "bg-amber-200/90 text-amber-950 dark:bg-amber-900 dark:text-amber-100",
  },
  "CHỜ DUYỆT": {
    unselected: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    selected: "bg-amber-200/90 text-amber-950 dark:bg-amber-900 dark:text-amber-100",
  },
  "ĐANG XEM XÉT": {
    unselected: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
    selected: "bg-sky-200/90 text-sky-950 dark:bg-sky-900 dark:text-sky-100",
  },
  "ĐÃ XỬ LÝ": {
    unselected: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
    selected: "bg-emerald-200/90 text-emerald-950 dark:bg-emerald-900 dark:text-emerald-100",
  },
}

function getItemTag(item: AdminAbuseEscalationItem): string {
  if (item.status === "PENDING") {
    return item.severity === "HIGH" ? "CẦN XEM XÉT" : "CHỜ DUYỆT"
  }
  if (item.status === "OPEN") {
    return "ĐANG XEM XÉT"
  }
  return "ĐÃ XỬ LÝ"
}

export function EscalationQueue({
  cases,
  selectedId,
  pendingCount,
  search,
  filter,
  isLoading,
  onSearch,
  onFilter,
  onSelect,
}: {
  cases: AdminAbuseEscalationItem[]
  selectedId: number | null
  pendingCount: number
  search: string
  filter: "PENDING" | "ALL"
  isLoading?: boolean
  onSearch: (value: string) => void
  onFilter: (value: "PENDING" | "ALL") => void
  onSelect: (id: number) => void
}) {
  return (
    <aside
      aria-label="Danh sách hồ sơ lạm dụng"
      className="flex flex-col border-b border-border bg-card lg:border-r lg:border-b-0"
    >
      <div className="p-4 pb-3">
        <h2 className="font-heading text-lg font-bold tracking-tight text-foreground">
          Hồ sơ lạm dụng tài khoản
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {pendingCount} hồ sơ chờ Quản trị duyệt
        </p>

        <div className="relative mt-3.5">
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
            className="h-9 w-full rounded-md border border-input bg-background pr-3 pl-9 text-xs placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
        </div>

        <div
          className="mt-3 grid grid-cols-2 gap-1 rounded-md bg-muted/70 p-1"
          role="group"
          aria-label="Lọc hồ sơ"
        >
          <button
            type="button"
            onClick={() => onFilter("PENDING")}
            aria-pressed={filter === "PENDING"}
            className={cn(
              "min-h-8 rounded px-2 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              filter === "PENDING"
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Chờ duyệt {pendingCount}
          </button>
          <button
            type="button"
            onClick={() => onFilter("ALL")}
            aria-pressed={filter === "ALL"}
            className={cn(
              "min-h-8 rounded px-2 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              filter === "ALL"
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Tất cả hồ sơ
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CircleNotch size={24} className="animate-spin text-primary" />
            <p className="mt-2 text-xs">Đang tải danh sách...</p>
          </div>
        ) : cases.length === 0 ? (
          <p
            role="status"
            className="rounded-md border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground"
          >
            Không tìm thấy hồ sơ phù hợp.
          </p>
        ) : (
          cases.map((item) => {
            const selected = item.id === selectedId
            const tagLabel = getItemTag(item)
            const tagStyles =
              badgeColorMap[tagLabel] || badgeColorMap["CHỜ DUYỆT"]

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "block w-full rounded-lg border p-3.5 text-left transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  selected
                    ? "border-primary bg-primary text-primary-foreground shadow-xs dark:border-ring dark:bg-sidebar"
                    : "border-border bg-card hover:bg-muted/50"
                )}
              >
                <span
                  className={cn(
                    "block font-mono text-[10px] font-semibold tracking-wide",
                    selected
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  )}
                >
                  {item.escalationCode || `ESC-${String(item.id).padStart(4, "0")}`}
                </span>
                <span className="mt-1 block font-heading text-sm font-bold tracking-tight">
                  {item.fullName}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block text-xs",
                    selected
                      ? "text-primary-foreground/75"
                      : "text-muted-foreground"
                  )}
                >
                  {item.reportIds?.length || 0} báo cáo · 24 giờ qua
                </span>
                <div className="mt-2.5 flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-block rounded px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase",
                      selected ? tagStyles.selected : tagStyles.unselected
                    )}
                  >
                    {tagLabel}
                  </span>
                </div>
              </button>
            )
          })
        )}
      </div>

      <div className="border-t border-border p-3.5 text-[11px] text-muted-foreground">
        <p className="leading-snug">
          Chọn hồ sơ để xem bằng chứng do kiểm duyệt viên gửi và lịch sử tài khoản.
        </p>
        <p className="mt-2 border-t border-border/60 pt-2 text-[10px] text-muted-foreground/80">
          Mọi quyết định xử lý đều được lưu vào nhật ký kiểm toán.
        </p>
      </div>
    </aside>
  )
}
