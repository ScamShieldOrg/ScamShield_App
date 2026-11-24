"use client"

import { Button } from "@/components/ui/button"
import {
  actionLabel,
  entityLabel,
  formatAuditTime,
  UNKNOWN_ACTOR,
  type AuditLogEntry,
} from "./audit-log-data"

export function AuditLogList({
  entries,
  onSelect,
}: {
  entries: AuditLogEntry[]
  onSelect: (entry: AuditLogEntry, trigger: HTMLElement) => void
}) {
  function details(entry: AuditLogEntry) {
    return (
      <Button
        variant="outline"
        size="sm"
        aria-label={`Xem chi tiết nhật ký ${entry.id}`}
        onClick={(event) => onSelect(entry, event.currentTarget)}
      >
        Chi tiết
      </Button>
    )
  }
  return (
    <>
      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full table-fixed text-left text-xs">
          <caption className="sr-only">
            Nhật ký hoạt động minh họa, sắp xếp mới nhất trước
          </caption>
          <thead className="border-b border-border bg-muted/40 text-[11px] text-muted-foreground">
            <tr>
              {[
                "Thời gian (UTC+7)",
                "Người thực hiện",
                "Hành động",
                "Đối tượng",
                "Lý do",
                "Thao tác",
              ].map((label) => (
                <th scope="col" key={label} className="px-4 py-3 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-muted/30">
                <td className="px-4 py-4 align-top">
                  <time dateTime={entry.createdAt} className="tabular-nums">
                    {formatAuditTime(entry.createdAt)}
                  </time>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    #{entry.id}
                  </span>
                </td>
                <td className="px-4 py-4 align-top">
                  <span className="font-medium break-words">
                    {entry.actorName ?? UNKNOWN_ACTOR}
                  </span>
                  {entry.actorUserId !== null && (
                    <span className="mt-1 block text-muted-foreground">
                      ID {entry.actorUserId}
                    </span>
                  )}
                </td>
                <th
                  scope="row"
                  className="px-4 py-4 align-top font-medium break-words"
                >
                  {actionLabel(entry.action)}
                </th>
                <td className="px-4 py-4 align-top">
                  {entityLabel(entry.entityType)}
                  <span className="mt-1 block text-muted-foreground">
                    {entry.entityId === null ? "—" : `#${entry.entityId}`}
                  </span>
                </td>
                <td className="px-4 py-4 align-top text-muted-foreground">
                  <p className="line-clamp-2 leading-5 break-words">
                    {entry.reason}
                  </p>
                </td>
                <td className="px-4 py-4 align-top">{details(entry)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul
        className="divide-y divide-border xl:hidden"
        aria-label="Nhật ký hoạt động"
      >
        {entries.map((entry) => (
          <li key={entry.id} className="min-w-0 p-4">
            <div className="flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground">
              <time dateTime={entry.createdAt}>
                {formatAuditTime(entry.createdAt)}
              </time>
              <span>#{entry.id}</span>
            </div>
            <h3 className="mt-2 font-heading text-sm font-semibold break-words">
              {actionLabel(entry.action)}
            </h3>
            <p className="mt-1 text-xs break-words">
              {entry.actorName ?? UNKNOWN_ACTOR}
              {entry.actorUserId !== null ? ` · ID ${entry.actorUserId}` : ""}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {entityLabel(entry.entityType)} ·{" "}
              {entry.entityId === null ? "—" : `#${entry.entityId}`}
            </p>
            <p className="mt-2 line-clamp-2 text-xs leading-5 break-words text-muted-foreground">
              {entry.reason}
            </p>
            <div className="mt-3">{details(entry)}</div>
          </li>
        ))}
      </ul>
    </>
  )
}
