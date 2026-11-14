"use client"

import { useState, type FormEvent } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { X } from "@phosphor-icons/react"
import { toast } from "react-toastify"
import {
  adminScamCategories,
  type AdminScamCategory,
} from "@/features/admin/services/admin-scam-categories"

export function TaxonomyEditorDialog({
  open,
  item,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  item: AdminScamCategory | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [name, setName] = useState(item?.name ?? "")
  const [description, setDescription] = useState(item?.description ?? "")
  const [isActive, setIsActive] = useState(item?.isActive ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    if (!name.trim() || !description.trim()) {
      setError("Vui lòng nhập tên và mô tả phân loại.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (item) {
        await adminScamCategories.update(item.id, {
          name: name.trim(),
          description: description.trim(),
          isActive,
          version: item.version,
        })
      } else {
        await adminScamCategories.create({
          name: name.trim(),
          description: description.trim(),
        })
      }
      toast.success(item ? "Đã cập nhật phân loại." : "Đã thêm phân loại.")
      onOpenChange(false)
      onSaved()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể lưu phân loại."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => !saving && onOpenChange(next)}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/45" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xl outline-none sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-heading text-lg font-bold">
                {item ? "Sửa phân loại lừa đảo" : "Thêm phân loại lừa đảo"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-muted-foreground">
                {item
                  ? `ID ${item.id} được giữ nguyên khi chỉnh sửa.`
                  : "ID phân loại sẽ được hệ thống tạo sau khi lưu."}
              </Dialog.Description>
            </div>
            <Dialog.Close
              type="button"
              aria-label="Đóng cửa sổ"
              disabled={saving}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <X size={18} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="taxonomy-name"
                className="block text-xs font-semibold"
              >
                Tên phân loại <span aria-hidden="true">*</span>
              </label>
              <input
                id="taxonomy-name"
                autoFocus
                required
                maxLength={255}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ví dụ: Lừa đảo việc làm"
                className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="taxonomy-description"
                className="block text-xs font-semibold"
              >
                Mô tả <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="taxonomy-description"
                required
                maxLength={255}
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Mô tả dấu hiệu nhận biết loại lừa đảo"
                className="mt-2 w-full resize-y rounded-md border border-input bg-background p-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              />
            </div>
            {item && (
              <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="size-4 accent-primary"
                />
                <span>
                  <span className="block font-semibold">Đang dùng</span>
                  <span className="block text-xs text-muted-foreground">
                    Tắt để ẩn khỏi danh sách phân loại khi gửi báo cáo mới.
                  </span>
                </span>
              </label>
            )}
            {error && (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={saving}
                className="min-h-10 rounded-md border border-border px-4 text-xs font-semibold hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="min-h-10 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
              >
                {saving
                  ? "Đang lưu..."
                  : item
                    ? "Lưu thay đổi"
                    : "Thêm phân loại"}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
