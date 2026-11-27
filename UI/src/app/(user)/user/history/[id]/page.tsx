import { UserHistoryDetail } from "@/components/features/history/user-history-detail"

export default async function UserHistoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}) {
  const { id } = await params
  const { from } = await searchParams
  const backHref = from === "check" ? "/user/check" : "/user/history"

  return <UserHistoryDetail checkId={Number(id)} backHref={backHref} />
}
