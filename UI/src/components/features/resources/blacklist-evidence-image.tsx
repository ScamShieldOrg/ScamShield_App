"use client"

import { useEffect, useState } from "react"
import { resourceService } from "@/features/resources/services/resource.service"

export function BlacklistEvidenceImage({ itemId }: { itemId: number }) {
  const [urls, setUrls] = useState<string[]>([])
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    void resourceService.getBlackListImageUrls(itemId, controller.signal)
      .then(links => {
        if (controller.signal.aborted) return
        const validLinks = links.filter(link => /^https?:\/\//i.test(link))
        if (!validLinks.length) {
          setFailed(true)
          return
        }
        setUrls(validLinks)
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })
    return () => controller.abort()
  }, [itemId])

  return (
    <section className="space-y-2 rounded-xl border border-border p-3">
      <h3 className="text-sm font-semibold">Ảnh minh chứng công khai</h3>
      {failed ? (
        <p role="status" className="text-muted-foreground">Ảnh không còn khả dụng hoặc chưa tải được.</p>
      ) : urls.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {urls.map((url, index) => (
            <PublicEvidenceImage key={index} url={url} index={index} />
          ))}
        </div>
      ) : (
        <p role="status" className="text-muted-foreground">Đang tải ảnh minh chứng…</p>
      )}
    </section>
  )
}

function PublicEvidenceImage({ url, index }: { url: string; index: number }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <p className="text-muted-foreground">Ảnh minh chứng {index + 1} chưa tải được.</p>

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={`Ảnh minh chứng đã rà soát ${index + 1}`} className="max-h-96 max-w-full rounded-lg object-contain" onError={() => setFailed(true)} />
  )
}
