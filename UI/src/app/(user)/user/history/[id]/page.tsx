import { UserHistoryDetail } from "@/components/features/history/user-history-detail"

export default async function UserHistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <UserHistoryDetail checkId={Number(id)} />
}
