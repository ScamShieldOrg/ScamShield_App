import { OwnReportDetailView } from "@/components/features/report/own-report-detail-view"

export default async function UserReportsDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ action?: string }>
}) {
  const { id } = await params
  const { action } = await searchParams
  return (
    <OwnReportDetailView
      key={`${id}-${action}`}
      reportId={id}
      initialEdit={action === "edit"}
    />
  )
}
