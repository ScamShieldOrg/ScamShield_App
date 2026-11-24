"use client"

import { useState } from "react"
import {
  Funnel,
  Gauge,
  Info,
  MagnifyingGlass,
  ShieldCheck,
  Warning,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
  GROUP_LABELS,
  RATE_LIMIT_RULES,
  type RateLimitRule,
} from "./rate-limit-data"
import {
  EnforcementBadge,
  RateLimitDetailDialog,
} from "./rate-limit-detail-dialog"

const inputClass =
  "h-10 w-full rounded-md border border-input bg-card pr-3 pl-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function AdminRateLimitsDashboard() {
  const [search, setSearch] = useState("")
  const [group, setGroup] = useState("all")
  const [status, setStatus] = useState("all")
  const [selected, setSelected] = useState<RateLimitRule | null>(null)
  const query = search.trim().toLocaleLowerCase("vi-VN")
  const filtered = RATE_LIMIT_RULES.filter(
    (rule) =>
      (group === "all" || rule.group === group) &&
      (status === "all" || (status === "enforced") === rule.enforced) &&
      (!query ||
        [rule.name, rule.description, rule.scope, rule.source].some((text) =>
          text.toLocaleLowerCase("vi-VN").includes(query)
        ))
  )
  const hasFilters = search !== "" || group !== "all" || status !== "all"
  function clearFilters() {
    setSearch("")
    setGroup("all")
    setStatus("all")
  }

  return (
    <section
      aria-labelledby="rate-limits-title"
      className="mx-auto max-w-[1800px]"
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            id="rate-limits-title"
            className="font-heading text-xl font-bold tracking-tight sm:text-2xl"
          >
            Giới hạn & hạn mức
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
            Theo dõi các quy tắc kiểm soát kiểm tra lừa đảo, gửi báo cáo và xác
            thực OTP.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground">
          <Gauge size={16} aria-hidden="true" /> Tổng quan chính sách
        </span>
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-xs leading-5 text-muted-foreground">
        <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          <strong className="font-semibold text-foreground">
            Dữ liệu minh họa.
          </strong>{" "}
          Các giá trị dựa trên cấu hình mặc định và chính sách mẫu. Trang này
          chỉ xem thông tin, chưa kết nối với cấu hình thực tế.
        </p>
      </div>

      <dl className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            label: "Quy tắc mẫu",
            count: RATE_LIMIT_RULES.length,
            icon: Gauge,
            note: "Kiểm tra, báo cáo, OTP và API",
          },
          {
            label: "Đã có thực thi",
            count: RATE_LIMIT_RULES.filter((rule) => rule.enforced).length,
            icon: ShieldCheck,
            note: "Có cơ chế giới hạn trong hệ thống",
          },
          {
            label: "Chưa thực thi",
            count: RATE_LIMIT_RULES.filter((rule) => !rule.enforced).length,
            icon: Warning,
            note: "Chính sách chưa có hiệu lực",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-border bg-card p-4"
          >
            <dt className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
              {item.label}
              <item.icon size={18} aria-hidden="true" />
            </dt>
            <dd className="mt-2 font-heading text-3xl font-bold tabular-nums">
              {item.count}
            </dd>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {item.note}
            </p>
          </div>
        ))}
      </dl>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4 sm:p-5">
          <h2 className="font-heading text-base font-semibold">
            Danh sách quy tắc
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Chọn chi tiết để xem phạm vi và cách tính hạn mức.
          </p>
          <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <label className="relative">
              <span className="sr-only">Tìm quy tắc</span>
              <MagnifyingGlass
                size={17}
                aria-hidden="true"
                className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm tên, phạm vi hoặc nguồn thiết lập…"
                className={inputClass}
              />
            </label>
            <label>
              <span className="sr-only">Lọc nhóm quy tắc</span>
              <NativeSelect
                className="w-full [&_select]:h-10"
                value={group}
                onChange={(event) => setGroup(event.target.value)}
              >
                <NativeSelectOption value="all">
                  Tất cả nhóm quy tắc
                </NativeSelectOption>
                {Object.entries(GROUP_LABELS).map(([value, label]) => (
                  <NativeSelectOption key={value} value={value}>
                    {label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
            <label>
              <span className="sr-only">Lọc trạng thái thực thi</span>
              <NativeSelect
                className="w-full [&_select]:h-10"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <NativeSelectOption value="all">
                  Tất cả trạng thái
                </NativeSelectOption>
                <NativeSelectOption value="enforced">
                  Đã có thực thi
                </NativeSelectOption>
                <NativeSelectOption value="pending">
                  Chưa thực thi
                </NativeSelectOption>
              </NativeSelect>
            </label>
          </div>
          <div className="mt-3 flex min-h-8 flex-wrap items-center justify-between gap-2">
            <p role="status" className="text-xs text-muted-foreground">
              Hiển thị {filtered.length} / {RATE_LIMIT_RULES.length} quy tắc
            </p>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Xóa bộ lọc
              </Button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <Funnel
              size={28}
              className="mx-auto text-muted-foreground"
              aria-hidden="true"
            />
            <h3 className="mt-3 font-heading text-sm font-semibold">
              Không tìm thấy quy tắc
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Thử từ khóa khác hoặc xóa bộ lọc để xem toàn bộ.
            </p>
            <Button className="mt-4" variant="outline" onClick={clearFilters}>
              Xóa bộ lọc
            </Button>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[850px] text-left text-xs">
                <caption className="sr-only">
                  Quy tắc giới hạn mẫu và trạng thái thực thi trong hệ thống
                </caption>
                <thead className="bg-muted/40 text-[11px] text-muted-foreground">
                  <tr>
                    {[
                      "Quy tắc / Phạm vi",
                      "Hạn mức mẫu",
                      "Thời gian",
                      "Nguồn thiết lập",
                      "Thực thi",
                      "Thao tác",
                    ].map((label) => (
                      <th
                        key={label}
                        scope="col"
                        className="px-4 py-3 font-semibold"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((rule) => (
                    <tr key={rule.id} className="hover:bg-muted/30">
                      <th scope="row" className="px-4 py-4 font-normal">
                        <span className="block font-heading text-sm font-semibold">
                          {rule.name}
                        </span>
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {rule.scope}
                        </span>
                      </th>
                      <td className="px-4 py-4 font-semibold tabular-nums">
                        {rule.limit}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {rule.window}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {rule.source}
                      </td>
                      <td className="px-4 py-4">
                        <EnforcementBadge enforced={rule.enforced} />
                      </td>
                      <td className="px-4 py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelected(rule)}
                          aria-label={`Xem chi tiết ${rule.name}`}
                        >
                          Chi tiết
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul
              className="divide-y divide-border xl:hidden"
              aria-label="Quy tắc giới hạn"
            >
              {filtered.map((rule) => (
                <li key={rule.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-heading text-sm font-semibold">
                      {rule.name}
                    </h3>
                    <EnforcementBadge enforced={rule.enforced} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {rule.scope}
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Hạn mức mẫu</dt>
                      <dd className="mt-1 font-semibold">{rule.limit}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Thời gian</dt>
                      <dd className="mt-1 font-semibold">{rule.window}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground">
                      Nguồn: {rule.source}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelected(rule)}
                      aria-label={`Xem chi tiết ${rule.name}`}
                    >
                      Chi tiết
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        Hạn mức theo ngày đặt lại lúc 00:00 giờ Việt Nam. Quy tắc theo 24 giờ
        hoặc 5 phút tính trên khoảng thời gian gần nhất.
      </p>
      {selected && (
        <RateLimitDetailDialog
          rule={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  )
}
