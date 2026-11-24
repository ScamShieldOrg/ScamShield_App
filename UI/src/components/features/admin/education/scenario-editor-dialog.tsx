"use client"

import { useState, type FormEvent } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { X } from "@phosphor-icons/react"
import type { EducationCategory, EducationChannelType } from "@/features/education/types/education.types"

export interface AdminScenario {
  id: number
  title: string
  summary: string
  categoryCode: string
  tag: string
  badgeLabel: string
  example: { channelType: EducationChannelType; senderName: string; displayTime: string; message: string; highlightedText?: string }
  recognitionSigns: string[]
  scammerGoal: string
  recommendedActions: string[]
}

const EMPTY_SCENARIO = (id: number): AdminScenario => ({
  id, title: "", summary: "", categoryCode: "", tag: "", badgeLabel: "",
  example: { channelType: "SMS", senderName: "", displayTime: "", message: "", highlightedText: "" },
  recognitionSigns: [], scammerGoal: "", recommendedActions: [],
})

const fieldClass = "mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
const labelClass = "block text-xs font-semibold"

export function ScenarioEditorDialog({ item, categories, onClose, onSave, nextId }: {
  item: AdminScenario | null
  categories: EducationCategory[]
  onClose: () => void
  onSave: (scenario: AdminScenario) => void
  nextId: number
}) {
  const [form, setForm] = useState<AdminScenario>(() => item ? structuredClone(item) : EMPTY_SCENARIO(nextId))
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof AdminScenario>(key: K, value: AdminScenario[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function updateExample(key: keyof AdminScenario["example"], value: string) {
    setForm((current) => {
      const example = { ...current.example }
      if (key === "channelType") example.channelType = value as EducationChannelType
      else example[key] = value
      return { ...current, example }
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.title.trim() || !form.summary.trim() || !form.example.message.trim()) {
      setError("Vui lòng nhập tiêu đề, mô tả và nội dung tin nhắn minh họa.")
      return
    }
    onSave({
      ...form,
      title: form.title.trim(), summary: form.summary.trim(), tag: form.tag.trim(), badgeLabel: form.badgeLabel.trim(),
      categoryCode: form.categoryCode, scammerGoal: form.scammerGoal.trim(),
      example: { ...form.example, senderName: form.example.senderName.trim(), displayTime: form.example.displayTime.trim(), message: form.example.message.trim(), highlightedText: form.example.highlightedText?.trim() || undefined },
      recognitionSigns: form.recognitionSigns.map((value) => value.trim()).filter(Boolean),
      recommendedActions: form.recommendedActions.map((value) => value.trim()).filter(Boolean),
    })
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/45" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-card p-4 text-card-foreground shadow-xl outline-none sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-heading text-lg font-bold">{item ? "Chỉnh sửa kịch bản" : "Thêm kịch bản cảnh báo"}</Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-muted-foreground">Nội dung sẽ xuất hiện trong thư viện giải phẫu thủ đoạn trên trang khách.</Dialog.Description>
            </div>
            <Dialog.Close type="button" aria-label="Đóng cửa sổ" className="rounded-md p-1 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X size={18} aria-hidden="true" /></Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-3 font-heading text-sm font-semibold">Thông tin kịch bản</legend>
              <div className="sm:col-span-2"><label htmlFor="scenario-title" className={labelClass}>Tiêu đề <span aria-hidden="true">*</span></label><input id="scenario-title" autoFocus required maxLength={180} value={form.title} onChange={(event) => update("title", event.target.value)} className={fieldClass} placeholder="Ví dụ: SMS giả mạo ngân hàng" /></div>
              <div className="sm:col-span-2"><label htmlFor="scenario-summary" className={labelClass}>Mô tả ngắn <span aria-hidden="true">*</span></label><textarea id="scenario-summary" required maxLength={500} rows={2} value={form.summary} onChange={(event) => update("summary", event.target.value)} className={`${fieldClass} resize-y`} placeholder="Mô tả thủ đoạn lừa đảo..." /></div>
              <div><label htmlFor="scenario-category" className={labelClass}>Danh mục</label><select id="scenario-category" value={form.categoryCode} onChange={(event) => update("categoryCode", event.target.value)} className={fieldClass}><option value="">Không gắn danh mục</option>{categories.map((category) => <option key={category.code} value={category.code}>{category.name}</option>)}</select></div>
              <div><label htmlFor="scenario-tag" className={labelClass}>Nhãn thủ đoạn</label><input id="scenario-tag" maxLength={100} value={form.tag} onChange={(event) => update("tag", event.target.value)} className={fieldClass} placeholder="Ví dụ: GIẢ MẠO BRANDNAME" /></div>
              <div><label htmlFor="scenario-badge" className={labelClass}>Nhãn nổi bật</label><input id="scenario-badge" maxLength={60} value={form.badgeLabel} onChange={(event) => update("badgeLabel", event.target.value)} className={fieldClass} placeholder="Ví dụ: Phổ biến" /></div>
            </fieldset>

            <fieldset className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <legend className="mb-3 font-heading text-sm font-semibold">Tin nhắn minh họa</legend>
              <div><label htmlFor="scenario-channel" className={labelClass}>Kênh liên lạc</label><select id="scenario-channel" value={form.example.channelType} onChange={(event) => updateExample("channelType", event.target.value as EducationChannelType)} className={fieldClass}><option value="SMS">SMS</option><option value="VIDEO">Video</option><option value="CHAT">Chat</option><option value="CALL">Cuộc gọi</option></select></div>
              <div><label htmlFor="scenario-sender" className={labelClass}>Người gửi</label><input id="scenario-sender" maxLength={120} value={form.example.senderName} onChange={(event) => updateExample("senderName", event.target.value)} className={fieldClass} placeholder="Tên hiển thị người gửi" /></div>
              <div><label htmlFor="scenario-time" className={labelClass}>Thời gian hiển thị</label><input id="scenario-time" maxLength={20} value={form.example.displayTime} onChange={(event) => updateExample("displayTime", event.target.value)} className={fieldClass} placeholder="14:32" /></div>
              <div><label htmlFor="scenario-highlight" className={labelClass}>Đoạn cần làm nổi bật</label><input id="scenario-highlight" maxLength={240} value={form.example.highlightedText ?? ""} onChange={(event) => updateExample("highlightedText", event.target.value)} className={fieldClass} placeholder="Đoạn văn bản xuất hiện nguyên văn bên dưới" /></div>
              <div className="sm:col-span-2"><label htmlFor="scenario-message" className={labelClass}>Nội dung tin nhắn <span aria-hidden="true">*</span></label><textarea id="scenario-message" required maxLength={2000} rows={3} value={form.example.message} onChange={(event) => updateExample("message", event.target.value)} className={`${fieldClass} resize-y`} placeholder="Nhập nội dung ví dụ để hiển thị trên thẻ..." /></div>
            </fieldset>

            <fieldset className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <legend className="mb-3 font-heading text-sm font-semibold">Phân tích và khuyến nghị</legend>
              <div><label htmlFor="scenario-signs" className={labelClass}>Dấu hiệu nhận diện</label><textarea id="scenario-signs" rows={4} value={form.recognitionSigns.join("\n")} onChange={(event) => update("recognitionSigns", event.target.value.split("\n"))} className={`${fieldClass} resize-y`} placeholder="Mỗi ý trên một dòng" /><p className="mt-1 text-[11px] text-muted-foreground">Mỗi dòng sẽ là một dấu hiệu.</p></div>
              <div><label htmlFor="scenario-actions" className={labelClass}>Hành động nên làm</label><textarea id="scenario-actions" rows={4} value={form.recommendedActions.join("\n")} onChange={(event) => update("recommendedActions", event.target.value.split("\n"))} className={`${fieldClass} resize-y`} placeholder="Mỗi ý trên một dòng" /><p className="mt-1 text-[11px] text-muted-foreground">Mỗi dòng sẽ là một khuyến nghị.</p></div>
              <div className="sm:col-span-2"><label htmlFor="scenario-goal" className={labelClass}>Mục tiêu của kẻ lừa đảo</label><textarea id="scenario-goal" rows={2} maxLength={500} value={form.scammerGoal} onChange={(event) => update("scammerGoal", event.target.value)} className={`${fieldClass} resize-y`} placeholder="Kẻ lừa đảo muốn chiếm đoạt điều gì?" /></div>
            </fieldset>

            {error && <p role="alert" className="text-xs font-medium text-destructive">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={onClose} className="min-h-10 rounded-md border border-border px-4 text-xs font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Hủy</button><button type="submit" className="min-h-10 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{item ? "Lưu thay đổi" : "Thêm kịch bản"}</button></div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
