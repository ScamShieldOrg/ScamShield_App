import Link from "next/link"

export function ReportSubmissionError({ message }: { message: string }) {
  const match = message.match(/^(Bạn đã có )(báo cáo) #?RPT-([0-9]+)\b/i)
  if (!match) return message

  const reportId = Number(match[3])
  return (
    <>
      {match[1]}
      <Link
        href={`/user/reports/${reportId}`}
        className="font-bold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {match[2]} {reportId}
      </Link>
      {message.slice(match[0].length)}
    </>
  )
}
