"use client"

import { useEffect, useRef, useState } from "react"
import { validateReportFiles } from "@/features/report/utils/report-upload"

export interface ReportAttachment {
  id: string
  file: File
  originalFile: File
  previewUrl: string
  reviewed: boolean
}

export function useReportAttachments() {
  const [attachments, setAttachments] = useState<ReportAttachment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const urls = useRef(new Map<string, string>())

  useEffect(() => {
    const current = urls.current
    return () => {
      current.forEach(url => URL.revokeObjectURL(url))
      current.clear()
    }
  }, [])

  function clear() {
    urls.current.forEach(url => URL.revokeObjectURL(url))
    urls.current.clear()
    setAttachments([])
    setEditingId(null)
    setError(null)
  }

  function add(files: File[]) {
    const validation = validateReportFiles([...attachments.map(item => item.file), ...files])
    setError(validation)
    if (validation) return

    const added = files.map(file => {
      const id = crypto.randomUUID()
      const previewUrl = URL.createObjectURL(file)
      urls.current.set(id, previewUrl)
      return { id, file, originalFile: file, previewUrl, reviewed: file.name.toLowerCase().endsWith(".pdf") }
    })
    setAttachments(previous => [...previous, ...added])
  }

  function remove(id: string) {
    const previewUrl = urls.current.get(id)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    urls.current.delete(id)
    setEditingId(active => active === id ? null : active)
    setAttachments(previous => previous.filter(item => item.id !== id))
    setError(null)
  }

  function markReviewed(id: string, file: File) {
    const previousUrl = urls.current.get(id)
    if (!previousUrl) return
    const previewUrl = URL.createObjectURL(file)
    urls.current.set(id, previewUrl)
    URL.revokeObjectURL(previousUrl)
    setAttachments(previous => previous.map(item => item.id === id ? { ...item, file, previewUrl, reviewed: true } : item))
    setEditingId(null)
    setError(null)
  }

  return { attachments, error, setError, editingId, setEditingId, add, remove, markReviewed, clear }
}
