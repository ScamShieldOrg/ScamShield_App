"use client"

import { useMemo, useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { MagnifyingGlass, PencilSimple, Plus, Trash } from "@phosphor-icons/react"
import type { EducationChannelType, EducationCategory } from "@/features/education/types/education.types"
import { ScenarioEditorDialog, type AdminScenario } from "./scenario-editor-dialog"

const CATEGORIES: EducationCategory[] = [
  { code: "GIA_DANH_NGAN_HANG", name: "Mạo danh ngân hàng" },
  { code: "GIA_DANH_CQCN", name: "Giả danh cơ quan chức năng" },
  { code: "VIEC_LAM", name: "Lừa đảo việc làm, CTV" },
]

const INITIAL_SCENARIOS: AdminScenario[] = [
  {
    id: 1,
    title: "SMS Brandname trạm phát BTS",
    summary: "Phát sóng giả mạo chèn tin nhắn lừa đảo vào luồng tin cậy ngân hàng.",
    categoryCode: "GIA_DANH_NGAN_HANG",
    tag: "GIẢ MẠO BRANDNAME",
    badgeLabel: "Cực đại",
    example: { channelType: "SMS", senderName: "VCB Digibank", displayTime: "14:32", message: "Tài khoản bị khóa sau 30 phút. Xác minh ngay tại: portal-vcb-digibanks[.]vn để hủy.", highlightedText: "portal-vcb-digibanks[.]vn" },
    recognitionSigns: ["Tên miền giả kèm áp lực thời gian."],
    scammerGoal: "Chiếm đoạt mật khẩu và mã OTP.",
    recommendedActions: ["Không bấm link. Mở thẳng ứng dụng ngân hàng chính thức."],
  },
  {
    id: 2,
    title: "Video Zalo giả Cảnh sát điều tra",
    summary: "Dùng Deepfake khuôn mặt cán bộ để hăm dọa nạn nhân chuyển tiền.",
    categoryCode: "GIA_DANH_CQCN",
    tag: "DEEPFAKE - GIẢ DANH CƠ QUAN",
    badgeLabel: "Nguy cấp",
    example: { channelType: "VIDEO", senderName: "Zalo Video: CQ Điều tra", displayTime: "00:43", message: "Chị liên quan đường dây rửa tiền. Chuyển số dư vào tài khoản thanh tra ngay." },
    recognitionSigns: ["Hình ảnh giật, âm thanh thiếu tự nhiên.", "Ép giữ bí mật và chuyển tiền ngay."],
    scammerGoal: "Thao túng nỗi sợ để nạn nhân tự chuyển tiền.",
    recommendedActions: ["Cúp máy và xác minh qua số điện thoại chính thức.", "Cơ quan công an không yêu cầu chuyển tiền qua mạng."],
  },
  {
    id: 3,
    title: "Tuyển cộng tác viên đơn hàng hoa hồng",
    summary: "Nạp tiền làm nhiệm vụ, nhận khoản lãi nhỏ ban đầu rồi bị giữ tiền lớn.",
    categoryCode: "VIEC_LAM",
    tag: "CỘNG TÁC VIÊN ẢO",
    badgeLabel: "Phổ biến",
    example: { channelType: "CHAT", senderName: "Telegram CSKH", displayTime: "10:15", message: "Nhiệm vụ cuối: Nạp 15.000.000đ để nhận về 19.500.000đ. Ưu đãi giữ trong 10 phút!" },
    recognitionSigns: ["Hoa hồng bất thường.", "Dụ vào nhóm kín và liên tục yêu cầu nạp thêm."],
    scammerGoal: "Chiếm đoạt toàn bộ tiền nạp tích lũy.",
    recommendedActions: ["Dừng chuyển tiền và chặn liên lạc.", "Không có công việc hợp pháp nào yêu cầu nạp tiền để nhận lương."],
  },
]

const CHANNEL_LABELS: Record<EducationChannelType, string> = { SMS: "SMS", VIDEO: "Video", CHAT: "Chat", CALL: "Cuộc gọi" }

export function AdminEducationScenarios() {
  const [scenarios, setScenarios] = useState(INITIAL_SCENARIOS)
  const [query, setQuery] = useState("")
  const [categoryCode, setCategoryCode] = useState("")
  const [editor, setEditor] = useState<AdminScenario | null | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<AdminScenario | null>(null)

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi")
    return scenarios.filter((item) => {
      const category = CATEGORIES.find((entry) => entry.code === item.categoryCode)?.name ?? ""
      const matchesQuery = !normalized || [item.title, item.summary, item.tag, category].some((value) => value?.toLocaleLowerCase("vi").includes(normalized))
      return matchesQuery && (!categoryCode || item.categoryCode === categoryCode)
    })
  }, [scenarios, query, categoryCode])

  function saveScenario(value: AdminScenario) {
    setScenarios((current) => {
      const exists = current.some((item) => item.id === value.id)
      return exists ? current.map((item) => item.id === value.id ? value : item) : [value, ...current]
    })
    setEditor(undefined)
  }

  function deleteScenario() {
    if (!deleteTarget) return
    setScenarios((current) => current.filter((item) => item.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  return (
    <section className="mx-auto max-w-[1800px]" aria-labelledby="education-content-heading">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Nội dung công khai · Giáo dục</p>
          <h1 id="education-content-heading" className="mt-1 font-heading text-xl font-bold tracking-tight sm:text-2xl">Kịch bản cảnh báo lừa đảo</h1>
          <p className="mt-1 text-xs text-muted-foreground">Quản lý các ca giải phẫu đang hiển thị trên trang Học viện Phòng chống Lừa đảo.</p>
        </div>
        <button type="button" onClick={() => setEditor(null)} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Plus size={16} weight="bold" aria-hidden="true" /> Thêm kịch bản
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Tìm kịch bản</span>
          <MagnifyingGlass size={17} aria-hidden="true" className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tiêu đề, mô tả hoặc nhãn..." className="h-10 w-full rounded-md border border-input bg-card pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
        <label className="sm:w-64">
          <span className="sr-only">Lọc theo danh mục</span>
          <select value={categoryCode} onChange={(event) => setCategoryCode(event.target.value)} className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">Tất cả danh mục</option>
            {CATEGORIES.map((category) => <option key={category.code} value={category.code}>{category.name}</option>)}
          </select>
        </label>
      </div>

      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span aria-live="polite">{filtered.length} / {scenarios.length} kịch bản</span>
        <span>Đang hiển thị cho khách truy cập</span>
      </div>

      {filtered.length === 0 ? (
        <div role="status" className="rounded-lg border border-dashed border-border bg-card px-5 py-14 text-center">
          <h2 className="font-heading text-sm font-semibold">{scenarios.length === 0 ? "Chưa có kịch bản nào" : "Không tìm thấy kịch bản phù hợp"}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{scenarios.length === 0 ? "Thêm kịch bản đầu tiên để bắt đầu xây dựng nội dung cảnh báo." : "Thử đổi từ khóa hoặc danh mục lọc."}</p>
          {scenarios.length === 0 && <button type="button" onClick={() => setEditor(null)} className="mt-4 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Thêm kịch bản</button>}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] border-collapse text-left text-xs">
              <caption className="sr-only">Các kịch bản cảnh báo đang công khai</caption>
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground"><tr>
                <th scope="col" className="px-4 py-3 font-semibold">Kịch bản</th><th scope="col" className="px-4 py-3 font-semibold">Danh mục</th><th scope="col" className="px-4 py-3 font-semibold">Kênh</th><th scope="col" className="px-4 py-3 font-semibold">Trạng thái</th><th scope="col" className="px-4 py-3 text-right font-semibold">Thao tác</th>
              </tr></thead>
              <tbody className="divide-y divide-border">{filtered.map((item) => <tr key={item.id} className="hover:bg-muted/30">
                <th scope="row" className="max-w-[34rem] px-4 py-3 align-top font-normal"><span className="block font-heading font-semibold text-foreground">{item.title}</span><span className="mt-1 block line-clamp-2 leading-5 text-muted-foreground">{item.summary}</span><span className="mt-2 inline-flex rounded bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">{item.tag || "Chưa gắn nhãn"}</span></th>
                <td className="px-4 py-3 align-top text-muted-foreground">{CATEGORIES.find((entry) => entry.code === item.categoryCode)?.name ?? "Chưa phân loại"}</td>
                <td className="px-4 py-3 align-top text-muted-foreground">{CHANNEL_LABELS[item.example.channelType]}</td>
                <td className="px-4 py-3 align-top"><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"><span aria-hidden="true">●</span> Công khai{item.badgeLabel ? ` · ${item.badgeLabel}` : ""}</span></td>
                <td className="px-4 py-3 align-top"><div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setEditor(item)} aria-label={`Sửa ${item.title}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border px-3 font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><PencilSimple size={14} aria-hidden="true" /> Sửa</button>
                  <button type="button" onClick={() => setDeleteTarget(item)} aria-label={`Xóa ${item.title}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-destructive/30 px-3 font-semibold text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Trash size={14} aria-hidden="true" /> Xóa</button>
                </div></td>
              </tr>)}</tbody>
            </table>
          </div>
          <ul className="divide-y divide-border md:hidden" aria-label="Danh sách kịch bản cảnh báo">{filtered.map((item) => <li key={item.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-heading text-sm font-semibold">{item.title}</span><span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">Công khai</span></div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.summary}</p><p className="mt-2 text-[11px] text-muted-foreground">{CATEGORIES.find((entry) => entry.code === item.categoryCode)?.name ?? "Chưa phân loại"} · {CHANNEL_LABELS[item.example.channelType]}</p>
            <div className="mt-3 flex gap-2"><button type="button" onClick={() => setEditor(item)} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><PencilSimple size={14} aria-hidden="true" /> Sửa</button><button type="button" onClick={() => setDeleteTarget(item)} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-destructive/30 px-3 text-xs font-semibold text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Trash size={14} aria-hidden="true" /> Xóa</button></div>
          </li>)}</ul>
        </div>
      )}

      {editor !== undefined && <ScenarioEditorDialog item={editor} categories={CATEGORIES} onClose={() => setEditor(undefined)} onSave={saveScenario} nextId={Math.max(0, ...scenarios.map((item) => item.id)) + 1} />}
      {deleteTarget && <DeleteScenarioDialog item={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={deleteScenario} />}
    </section>
  )
}

function DeleteScenarioDialog({ item, onCancel, onConfirm }: { item: AdminScenario; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/45" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-5 text-card-foreground shadow-xl outline-none">
          <Dialog.Title className="font-heading text-lg font-bold">Xóa kịch bản này?</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-5 text-muted-foreground">“{item.title}” sẽ bị gỡ khỏi danh sách nội dung công khai trong phiên này.</Dialog.Description>
          <div className="mt-6 flex justify-end gap-2"><Dialog.Close render={<button type="button" className="min-h-10 rounded-md border border-border px-4 text-xs font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />}>Hủy</Dialog.Close><button type="button" onClick={onConfirm} className="min-h-10 rounded-md bg-destructive px-4 text-xs font-semibold text-white hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Xóa kịch bản</button></div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
