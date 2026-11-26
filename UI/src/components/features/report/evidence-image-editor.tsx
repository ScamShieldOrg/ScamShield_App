"use client"

import { ShieldCheck, TextAa, X } from "@phosphor-icons/react"
import { type PointerEvent, useEffect, useRef, useState } from "react"
import { MAX_REPORT_FILE_BYTES } from "@/features/report/utils/report-upload"
import { suggestEvidenceMasks, type EvidenceMask, type EvidenceSuggestion } from "@/features/report/utils/evidence-ocr"

type Point = { x: number; y: number }
type Mask = EvidenceMask

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

function paint(canvas: HTMLCanvasElement, image: HTMLImageElement, masks: Mask[], draft?: Mask | null, suggestions: EvidenceSuggestion[] = [], activeSuggestion?: EvidenceSuggestion | null) {
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
  const pixel = width / (canvas.clientWidth || width)
  const badgeSize = 22 * pixel
  context.save()
  for (const [index, suggestion] of suggestions.entries()) {
    const { mask } = suggestion
    const active = suggestion === activeSuggestion
    context.strokeStyle = "#fbbf24"
    context.lineWidth = (active ? 3 : 2) * pixel
    context.setLineDash(active ? [] : [5 * pixel, 3 * pixel])
    if (active) {
      context.fillStyle = "#fbbf2440"
      context.fillRect(mask.x, mask.y, mask.width, mask.height)
    }
    context.strokeRect(mask.x, mask.y, mask.width, mask.height)
    const x = Math.max(0, Math.min(mask.x, width - badgeSize))
    const y = mask.y >= badgeSize + 2 * pixel
      ? mask.y - badgeSize - 2 * pixel
      : Math.min(mask.y + mask.height + 2 * pixel, height - badgeSize)
    context.fillStyle = active ? "#f59e0b" : "#fef3c7"
    context.fillRect(x, Math.max(0, y), badgeSize, badgeSize)
    context.font = `bold ${12 * pixel}px sans-serif`
    context.textAlign = "center"
    context.textBaseline = "middle"
    context.fillStyle = "#451a03"
    context.fillText(String(index + 1), x + badgeSize / 2, Math.max(0, y) + badgeSize / 2)
  }
  context.restore()
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
  const [suggestions, setSuggestions] = useState<EvidenceSuggestion[]>([])
  const [hoveredSuggestion, setHoveredSuggestion] = useState<EvidenceSuggestion | null>(null)
  const [focusedSuggestion, setFocusedSuggestion] = useState<EvidenceSuggestion | null>(null)
  const [scanning, setScanning] = useState(false)
  const [ocrNotice, setOcrNotice] = useState("")
  const scanRef = useRef<AbortController>(null)

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
    if (!canvas || !image) return
    const activeSuggestion = hoveredSuggestion && suggestions.includes(hoveredSuggestion)
      ? hoveredSuggestion
      : focusedSuggestion
    const redraw = () => paint(canvas, image, masks, draft, suggestions, activeSuggestion)
    redraw()
    const observer = new ResizeObserver(redraw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [image, masks, draft, suggestions, hoveredSuggestion, focusedSuggestion])

  async function scanImage() {
    if (!image || scanRef.current || saving || drag.current) return
    const snapshot = document.createElement("canvas")
    if (!paint(snapshot, image, masks)) return
    const scan = new AbortController()
    const sourceSignal = sourceScope.current?.signal
    const abort = () => scan.abort()
    sourceSignal?.addEventListener("abort", abort, { once: true })
    scanRef.current = scan
    setScanning(true)
    setSuggestions([])
    setOcrNotice("")
    const timeout = setTimeout(() => {
      scan.abort()
      scanRef.current = null
      setScanning(false)
      setOcrNotice("OCR mất quá nhiều thời gian. Bạn có thể thử lại hoặc che thủ công.")
    }, 60_000)
    scan.signal.addEventListener("abort", () => clearTimeout(timeout), { once: true })
    try {
      const matches = await suggestEvidenceMasks(snapshot, scan.signal)
      if (scan.signal.aborted) return
      setSuggestions(matches)
      setOcrNotice(matches.length
        ? "Đối chiếu số trên ảnh với từng gợi ý bên dưới. Giữ lại thông tin cần để xác minh đối tượng bị báo cáo."
        : "OCR chưa tìm thấy vùng gợi ý. Hãy kiểm tra ảnh và che thủ công nếu cần.")
    } catch {
      if (!scan.signal.aborted) {
        setOcrNotice("Không chạy được OCR. Bạn có thể thử lại hoặc che thủ công.")
      }
    } finally {
      clearTimeout(timeout)
      sourceSignal?.removeEventListener("abort", abort)
      if (scanRef.current === scan) {
        scanRef.current = null
        if (!scan.signal.aborted) setScanning(false)
      }
    }
  }

  function reviewSuggestion(suggestion: EvidenceSuggestion, apply: boolean) {
    if (saving || drag.current) return
    if (apply) setMasks(previous => [...previous, suggestion.mask])
    setSuggestions(previous => previous.filter(item => item !== suggestion))
  }

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
    const signal = sourceScope.current?.signal
    if (!image || !signal || signal.aborted || saving || draft || drag.current) return
    const canvas = document.createElement("canvas")
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
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Thu phóng ảnh" className="flex flex-wrap items-center gap-2">
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
        <button
          type="button"
          className="ml-auto inline-flex min-h-9 items-center gap-2 rounded-lg border border-sky-200 bg-white px-3 text-xs font-semibold text-sky-900 transition-colors enabled:cursor-pointer enabled:hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100 dark:enabled:hover:bg-sky-900"
          disabled={!image || scanning || saving || Boolean(draft)}
          onClick={() => void scanImage()}
        >
          <TextAa size={17} className="shrink-0" aria-hidden="true" />
          {scanning ? "Đang nhận diện chữ…" : "Gợi ý vùng cần che"}
        </button>
      </div>
      {(scanning || ocrNotice) && (
        <p role="status" className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 dark:border-sky-900 dark:bg-sky-950/30 text-xs leading-relaxed text-sky-950 dark:text-sky-100">
          {scanning ? "Đang phân tích ảnh trên thiết bị." : ocrNotice}
        </p>
      )}
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
      {suggestions.length > 0 && (
        <ol className="space-y-2" aria-label="Các vùng OCR gợi ý">
          {suggestions.map((suggestion, index) => (
            <li
              key={JSON.stringify(suggestion.mask)}
              onPointerEnter={() => setHoveredSuggestion(suggestion)}
              onPointerLeave={() => setHoveredSuggestion(null)}
              onFocus={() => setFocusedSuggestion(suggestion)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setFocusedSuggestion(null)
              }}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 text-xs transition-colors hover:border-amber-500 focus-within:border-amber-500 dark:border-amber-900 dark:bg-amber-950/25 dark:hover:border-amber-500 dark:focus-within:border-amber-500"
            >
              <div className="flex min-w-0 items-center gap-2.5 font-semibold">
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-amber-100 text-amber-950 tabular-nums dark:bg-amber-100 dark:text-amber-950">
                  {index + 1}
                </span>
                <span>{suggestion.label}</span>
              </div>
              <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
                <button type="button" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3 font-semibold text-primary-foreground transition-colors enabled:cursor-pointer enabled:hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50" disabled={saving} onClick={() => reviewSuggestion(suggestion, true)}>
                  <ShieldCheck size={15} aria-hidden="true" />
                  Che vùng {index + 1}
                </button>
                <button type="button" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 font-semibold text-muted-foreground transition-colors enabled:cursor-pointer enabled:hover:bg-muted enabled:hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50" disabled={saving} onClick={() => reviewSuggestion(suggestion, false)}>
                  <X size={14} aria-hidden="true" />
                  Bỏ gợi ý {index + 1}
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
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
