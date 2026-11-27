"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { ResourcesDirectory } from "@/components/features/resources/resources-directory"
import type { ResourceTab } from "@/components/features/resources/resource-helpers"

function GuestBlacklistSearch() {
  const searchParams = useSearchParams()
  const search = searchParams.get("search") || ""
  const tab: ResourceTab =
    searchParams.get("tab") === "whitelist" ? "whitelist" : "blacklist"

  return (
    <ResourcesDirectory
      key={`${tab}:${search}`}
      initialSearch={search}
      initialTab={tab}
    />
  )
}

export default function GuestBlacklistPage() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="mx-auto max-w-6xl px-4 py-12 text-sm text-muted-foreground sm:px-6 lg:px-8"
        >
          Đang tải danh bạ tài nguyên...
        </div>
      }
    >
      <GuestBlacklistSearch />
    </Suspense>
  )
}
