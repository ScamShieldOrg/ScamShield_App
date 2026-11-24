import { actionLabel, entityLabel, type AuditLogEntry } from "./audit-log-data"
import type { AuditFilters } from "./audit-log-filters"

export function filterAuditLogs(
  entries: AuditLogEntry[],
  filters: AuditFilters
) {
  const invalidDates =
    !!filters.start && !!filters.end && filters.end < filters.start
  const query = filters.query.trim().toLocaleLowerCase("vi-VN")
  const start = filters.start
    ? Date.parse(`${filters.start}T00:00:00+07:00`)
    : -Infinity
  const end = filters.end
    ? Date.parse(`${filters.end}T23:59:59.999+07:00`)
    : Infinity
  return invalidDates
    ? []
    : entries
        .filter((entry) => {
          const timestamp = Date.parse(entry.createdAt)
          const searchable = [
            entry.actorName,
            entry.actorUserId,
            entry.action,
            actionLabel(entry.action),
            entry.entityType,
            entityLabel(entry.entityType),
            entry.entityId,
            entry.reason,
          ]
            .filter((value) => value !== null)
            .join(" ")
            .toLocaleLowerCase("vi-VN")
          return (
            (!query || searchable.includes(query)) &&
            (!filters.entity || entry.entityType === filters.entity) &&
            (!filters.action || entry.action === filters.action) &&
            timestamp >= start &&
            timestamp <= end
          )
        })
        .sort(
          (left, right) =>
            Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
            right.id - left.id
        )
}
