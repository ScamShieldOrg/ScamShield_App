"use client"

import { ShieldCheck } from "@phosphor-icons/react"
import { type PointerEvent, useEffect, useRef, useState } from "react"
import { MAX_REPORT_FILE_BYTES } from "@/features/report/utils/report-upload"

type Point = { x: number; y: number }
type Mask = { x: number; y: number; width: number; height: number }

interface EvidenceImageEditorProps {
  source: string
  fileName: string
  saveLabel: string
  onSave: (file: File) => void
  onCancel: () => void
}

const buttonClass = "rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50"

function maskBetween(start: Point, end: Point): Mask {
  const x = Math.floor(Math.min(start.x, end.x))
  const y = Math.floor(Math.min(start.y, end.y))
  return {
    x,
    y,
    width: Math.ceil(Math.max(start.x, end.x)) - x,
    height: Math.ceil(Math.max(start.y, end.y)) - y,
  }
}

function paint(canvas: HTMLCanvasElement, image: HTMLImageElement, masks: Mask[], draft?: Mask | null) {
  const context = canvas.getContext("2d", { alpha: false })
  if (!context) return false
  const scale = Math.min(1, 4096 / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
  context.fillStyle = "#fff"
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)
  context.fillStyle = "#dc2626"
  for (const mask of masks) {
    context.fillRect(mask.x, mask.y, mask.width, mask.height)
  }
  if (draft) {
    context.fillStyle = "#dc2626"
    context.fillRect(draft.x, draft.y, draft.width, draft.height)
  }
  return true
}

export function EvidenceImageEditor({ source, fileName, saveLabel, onSave, onCancel }: EvidenceImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ pointerId: number; origin: Point } | null>(null)
  const sourceScope = useRef<AbortController>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [masks, setMasks] = useState<Mask[]>([])
  const [draft, setDraft] = useState<Mask | null>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || !image) return

    function zoomWithWheel(event: WheelEvent) {
      if (!event.ctrlKey || event.deltaY === 0 || !event.cancelable) return
      event.preventDefault()
      if (saving || drag.current) return

      const delta = event.deltaY < 0 ? 0.25 : -0.25
      setZoom(value => Math.min(4, Math.max(1, value + delta)))
    }

    viewport.addEventListener("wheel", zoomWithWheel, { passive: false })
    return () => viewport.removeEventListener("wheel", zoomWithWheel)
  }, [image, saving])

  useEffect(() => {
    const controller = new AbortController()
    sourceScope.current = controller
    const loaded = new Image()
    loaded.onload = () => setImage(loaded)
    loaded.onerror = () => setError("Không mở được ảnh. Vui lòng chọn ảnh PNG hoặc JPG hợp lệ.")
    loaded.src = source
    return () => {
      controller.abort()
      loaded.onload = null
      loaded.onerror = null
    }
  }, [source])

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas && image) paint(canvas, image, masks, draft)
  }, [image, masks, draft])

  function undo() {
    if (saving || drag.current) return
    setMasks(previous => previous.slice(0, -1))
  }

  function point(event: PointerEvent<HTMLCanvasElement>): Point {
    const canvas = event.currentTarget
    const bounds = canvas.getBoundingClientRect()
    return {
      x: Math.min(canvas.width, Math.max(0, (event.clientX - bounds.left) * canvas.width / bounds.width)),
      y: Math.min(canvas.height, Math.max(0, (event.clientY - bounds.top) * canvas.height / bounds.height)),
    }
  }

  async function save() {
    const canvas = canvasRef.current
    const signal = sourceScope.current?.signal
    if (!canvas || !image || !signal || signal.aborted || saving || draft || drag.current) return
    setSaving(true)
    setError("")
    try {
      if (!paint(canvas, image, masks)) {
        throw new Error("Could not draw the reviewed image")
      }
      const isPng = /\.png$/i.test(fileName)
      const mimeType = isPng ? "image/png" : "image/jpeg"
      const qualityLevels = isPng ? [undefined] : [0.92, 0.8, 0.65]
      for (const quality of qualityLevels) {
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mimeType, quality))
        if (signal.aborted) return
        if (blob?.type === mimeType && blob.size <= MAX_REPORT_FILE_BYTES) {
          onSave(new File([blob], fileName, { type: mimeType }))
          return
        }
      }
      setError("Không lưu được ảnh trong giới hạn 5 MB. Vui lòng chọn ảnh nhỏ hơn.")
    } catch {
      if (!signal.aborted) setError("Không thể lưu ảnh đã rà soát. Vui lòng thử lại.")
    } finally {
      if (!signal.aborted) setSaving(false)
    }
  }

  return (
    <div
      className="space-y-3 rounded-xl border border-border bg-background p-3 text-sm"
      onKeyDown={event => {
        if (!event.ctrlKey || event.altKey || event.shiftKey || event.metaKey ||
            event.key.toLowerCase() !== "z" || event.repeat || event.defaultPrevented ||
            (event.target instanceof HTMLElement &&
              (event.target.isContentEditable || event.target.closest("input, textarea")))) return
        if (!masks.length || saving || drag.current) return
        event.preventDefault()
        undo()
      }}
    >
      <div className="space-y-3">
        <p className="text-sm font-semibold">Che thông tin nhạy cảm</p>
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 dark:border-primary/30 dark:bg-primary/10">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
            <ShieldCheck aria-hidden="true" size={18} weight="bold" />
          </span>
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-sm font-bold text-foreground">
              Kéo trực tiếp trên ảnh để che thông tin cá nhân.
            </p>
            <dl className="grid gap-2 text-xs leading-relaxed sm:grid-cols-2">
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/50">
                <dt className="font-bold text-amber-900 dark:text-amber-200">Cần che</dt>
                <dd className="mt-1 text-foreground">
                  Tên, email, số điện thoại riêng, địa chỉ, số giấy tờ, mã OTP
                  và thông tin giao dịch cá nhân.
                </dd>
              </div>
              <div className="rounded-lg border border-sky-300 bg-sky-50 p-3 dark:border-sky-700 dark:bg-sky-950/50">
                <dt className="font-bold text-sky-900 dark:text-sky-200">Cần giữ lại</dt>
                <dd className="mt-1 text-foreground">
                  Đối tượng bị báo cáo và nội dung cần để đối chiếu.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      {!image && !error && <p role="status">Đang mở ảnh…</p>}
      <div className="flex flex-wrap items-center gap-2" aria-label="Thu phóng ảnh">
        <button type="button" className={buttonClass} disabled={!image || saving || Boolean(draft) || zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - 0.5))}>
          Thu nhỏ
        </button>
        <output className="min-w-12 text-center text-xs tabular-nums" aria-live="polite">{Math.round(zoom * 100)}%</output>
        <button type="button" className={buttonClass} disabled={!image || saving || Boolean(draft) || zoom >= 4} onClick={() => setZoom(value => Math.min(4, value + 0.5))}>
          Phóng to
        </button>
        <button type="button" className={buttonClass} disabled={saving || Boolean(draft) || zoom === 1} onClick={() => setZoom(1)}>
          Vừa khung
        </button>
      </div>
      <div ref={viewportRef} className="max-h-[65vh] overflow-auto rounded-lg bg-muted [container-type:inline-size]">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          aria-label="Ảnh minh chứng. Kéo trên ảnh để thêm vùng che."
          hidden={!image}
          className="mx-auto block h-auto max-w-none touch-none cursor-crosshair"
          style={image ? { width: `calc(min(100cqw, ${65 * image.naturalWidth / image.naturalHeight}vh) * ${zoom})` } : undefined}
          onPointerDown={event => {
            if (saving || drag.current || event.button !== 0) return
            event.currentTarget.focus({ preventScroll: true })
            const origin = point(event)
            drag.current = { pointerId: event.pointerId, origin }
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={event => {
            if (drag.current?.pointerId === event.pointerId) {
              setDraft(maskBetween(drag.current.origin, point(event)))
            }
          }}
          onPointerUp={event => {
            if (drag.current?.pointerId !== event.pointerId) return
            const mask = maskBetween(drag.current.origin, point(event))
            if (mask.width >= 2 && mask.height >= 2) setMasks(previous => [...previous, mask])
            drag.current = null
            setDraft(null)
          }}
          onLostPointerCapture={event => {
            if (drag.current?.pointerId !== event.pointerId) return
            drag.current = null
            setDraft(null)
          }}
        />
      </div>
      <span className="sr-only" role="status">Số vùng đã che {masks.length}</span>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={buttonClass} disabled={!masks.length || saving} onClick={undo} aria-keyshortcuts="Control+Z">
          Hoàn tác
        </button>
        <button type="button" className={buttonClass} disabled={saving} onClick={onCancel}>Hủy</button>
        <button
          type="button"
          disabled={!image || saving || Boolean(draft)}
          onClick={() => void save()}
          className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Đang lưu ảnh…" : saveLabel}
        </button>
      </div>
    </div>
  )
}
