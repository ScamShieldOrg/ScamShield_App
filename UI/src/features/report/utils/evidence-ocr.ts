export type EvidenceMask = { x: number; y: number; width: number; height: number }
type Word = { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }
export type EvidenceSuggestion = { mask: EvidenceMask; text: string }

const patterns = [
  { regex: /[\w.%+-]+@[\w.-]+\.[a-z]{2,}/gi },
  { regex: /\b(?:OTP|PIN)[ \t]*[:=-]?[ \t]*(?:\n[ \t]*)?(\d{4,8})\b/gi, valueOffset: "end" },
  { regex: /\b(\d{4,8})[ \t]*(?:\n[ \t]*)?(?:là\s+|is\s+)?(?:mã\s+)?(?:OTP|PIN)\b/gi, valueOffset: "start" },
  { regex: /(?<!\d)\+?\d(?:[ .()-]?\d){8,18}(?!\d)/g },
]

export function findEvidenceSuggestions(lines: Word[][], width: number, height: number): EvidenceSuggestion[] {
  const suggestions = new Map<string, EvidenceSuggestion>()
  for (const [index, words] of lines.entries()) {
    let text = ""
    const spans = [...words, ...(lines[index + 1] ?? [])].map((word, wordIndex) => {
      if (wordIndex === words.length) text += "\n"
      const start = text.length
      text += word.text + " "
      return { start, end: text.length - 1, bbox: word.bbox }
    })
    for (const { regex, valueOffset } of patterns) {
      for (const match of text.matchAll(regex)) {
        const matchEnd = match.index + match[0].length
        if (text.slice(0, match.index).includes("\n")) continue
        const start = valueOffset === "end" ? matchEnd - match[1].length : match.index
        const end = valueOffset === "start" ? start + match[1].length : matchEnd
        const boxes = spans.filter(span => span.end > start && span.start < end).map(span => span.bbox)
        if (boxes.length === 0) continue
        const x = Math.max(0, Math.min(...boxes.map(box => box.x0)) - 3)
        const y = Math.max(0, Math.min(...boxes.map(box => box.y0)) - 3)
        const right = Math.min(width, Math.max(...boxes.map(box => box.x1)) + 3)
        const bottom = Math.min(height, Math.max(...boxes.map(box => box.y1)) + 3)
        if (right > x && bottom > y) {
          const key = [x, y, right, bottom].join(",")
          if (!suggestions.has(key)) {
            suggestions.set(key, { text: text.slice(start, end), mask: { x, y, width: right - x, height: bottom - y } })
          }
        }
      }
    }
  }
  return [...suggestions.values()]
}

type OcrResult = { blocks?: { paragraphs: { lines: { words: Word[] }[] }[] }[] }

export async function suggestEvidenceMasks(canvas: HTMLCanvasElement, signal: AbortSignal) {
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"))
  if (!blob) throw new Error("Unable to encode OCR input")
  const image = new Uint8Array(await blob.arrayBuffer())
  signal.throwIfAborted()
  const assets = new URL("/report-ocr/", window.location.origin)
  const worker = new Worker(new URL("worker.min.js", assets))
  const langs = ["vie", "eng"]

  // Own the worker from startup. This message protocol comes from the pinned Tesseract.js 7.0.0 worker.
  function run<T>(action: string, payload: object, transfer: Transferable[] = []) {
    return new Promise<T>((resolve, reject) => {
      const abort = () => finish(() => reject(signal.reason))
      function finish(settle: () => void) {
        signal.removeEventListener("abort", abort)
        worker.onmessage = null
        worker.onerror = null
        worker.onmessageerror = null
        settle()
      }
      worker.onmessage = ({ data }) => {
        if (data.jobId !== action) return
        if (data.status === "resolve") finish(() => resolve(data.data))
        if (data.status === "reject") finish(() => reject(new Error("OCR worker failed")))
      }
      worker.onerror = worker.onmessageerror = () => finish(() => reject(new Error("OCR worker unavailable")))
      if (signal.aborted) abort()
      else {
        signal.addEventListener("abort", abort, { once: true })
        try {
          worker.postMessage({ workerId: "report-ocr", jobId: action, action, payload }, transfer)
        } catch (error) {
          finish(() => reject(error))
        }
      }
    })
  }
  try {
    await run("load", { options: { lstmOnly: true, corePath: new URL("tesseract-core-lstm.wasm.js", assets).href } })
    await run("loadLanguage", { langs, options: { langPath: assets.href, gzip: true, lstmOnly: true } })
    await run("initialize", { langs, oem: 1 })
    await run("setParameters", { params: { tessedit_pageseg_mode: "11" } })
    const data = await run<OcrResult>("recognize", { image, options: {}, output: { blocks: true, text: false } }, [image.buffer])
    const lines = (data.blocks ?? []).flatMap(block =>
      block.paragraphs.flatMap(paragraph => paragraph.lines.map(line => line.words))
    )
    return findEvidenceSuggestions(lines, canvas.width, canvas.height)
  } finally {
    worker.terminate()
  }
}
