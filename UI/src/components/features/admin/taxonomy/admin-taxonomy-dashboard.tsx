"use client"

import { useEffect, useState } from "react"
import { ArrowClockwise, PencilSimple, Plus } from "@phosphor-icons/react"
import {
  adminScamCategories,
  type AdminScamCategory,
} from "@/features/admin/services/admin-scam-categories"
import { TaxonomyEditorDialog } from "./taxonomy-editor-dialog"

export function AdminTaxonomyDashboard() {
  const [items, setItems] = useState<AdminScamCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<AdminScamCategory | null>(null)

  useEffect(() => {
    let active = true
    adminScamCategories
      .list()
      .then((data) => {
        if (!active) return
        setItems(data)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Không thể tải danh sách phân loại."
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [revision])

  function refresh() {
    setLoading(true)
    setRevision((current) => current + 1)
  }

  function openCreate() {
    setEditing(null)
    setEditorOpen(true)
  }

  function openEdit(item: AdminScamCategory) {
    setEditing(item)
    setEditorOpen(true)
  }

  const activeCount = items.filter((item) => item.isActive).length
  const inactiveCount = items.length - activeCount

  return (
    <section
      aria-labelledby="taxonomy-heading"
      className="mx-auto max-w-[1800px]"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1
            id="taxonomy-heading"
            className="font-heading text-xl font-bold tracking-tight sm:text-2xl"
          >
            Phân loại Lừa đảo (Taxonomy)
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {loading && items.length === 0
              ? "Đang tải danh sách phân loại..."
              : error && items.length === 0
                ? "Không thể tải danh sách phân loại"
                : `${activeCount} mã hoạt động · ${inactiveCount} đã tắt`}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Plus size={15} weight="bold" aria-hidden="true" />
          Thêm mới
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-destructive/30 px-3 font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ArrowClockwise size={15} aria-hidden="true" /> Thử lại
          </button>
        </div>
      )}

      <div
        className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm"
        aria-busy={loading}
      >
        <table className="w-full min-w-[820px] border-collapse text-left text-xs">
          <caption className="sr-only">
            Danh sách phân loại lừa đảo và số báo cáo đã duyệt
          </caption>
          <thead className="bg-muted/40 text-[11px] tracking-wide text-muted-foreground uppercase">
            <tr>
              <th scope="col" className="w-28 px-4 py-3 font-semibold">
                ID
              </th>
              <th scope="col" className="w-[28%] px-4 py-3 font-semibold">
                Tên phân loại
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Mô tả
              </th>
              <th scope="col" className="w-24 px-4 py-3 font-semibold">
                Số vụ
              </th>
              <th scope="col" className="w-36 px-4 py-3 font-semibold">
                Trạng thái
              </th>
              <th scope="col" className="w-24 px-4 py-3 font-semibold">
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && items.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  Đang tải danh sách phân loại...
                </td>
              </tr>
            ) : error && items.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  Danh sách chưa tải được. Vui lòng thử lại.
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  Chưa có phân loại lừa đảo. Chọn “Thêm mới” để tạo phân loại
                  đầu tiên.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className="even:bg-muted/20 hover:bg-muted/40"
                >
                  <td className="px-4 py-3 font-mono font-semibold text-primary dark:text-sky-300">
                    {item.id}
                  </td>
                  <th
                    scope="row"
                    className="px-4 py-3 font-heading font-semibold text-foreground"
                  >
                    {item.name}
                  </th>
                  <td className="px-4 py-3 leading-5 text-muted-foreground">
                    {item.description}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {item.approvedReportCount.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        item.isActive
                          ? "inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      }
                    >
                      <span aria-hidden="true">
                        {item.isActive ? "●" : "○"}
                      </span>
                      {item.isActive ? "Đang dùng" : "Đã tắt"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      aria-label={`Sửa phân loại ${item.name}`}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <PencilSimple size={14} aria-hidden="true" /> Sửa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Số vụ là số báo cáo đã được duyệt trong từng phân loại.
      </p>
      {editorOpen && (
        <TaxonomyEditorDialog
          open={editorOpen}
          item={editing}
          onOpenChange={setEditorOpen}
          onSaved={refresh}
        />
      )}
    </section>
  )
}
