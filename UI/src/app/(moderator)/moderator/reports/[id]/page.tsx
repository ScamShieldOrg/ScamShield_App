import { ReportReviewWorkspace } from "@/components/features/moderator/report-review-workspace"
export default async function ModeratorReportsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ReportReviewWorkspace initialId={id} />
}
