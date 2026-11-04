import { authorizeApi } from "@/lib/api/instance"
import {
  NotificationItem,
  NotificationTabCounts,
  NotificationQueryParams,
  PaginatedNotifications,
} from "../types/notification.types"

export const DEFAULT_TAB_COUNTS: NotificationTabCounts = {
  all: 0,
  report: 0,
  dispute: 0,
  system: 0,
  unread: 0,
}

/**
 * Lấy danh sách thông báo phân trang và số lượng tab từ GET /api/notifications
 */
export async function getNotifications(
  params?: NotificationQueryParams
): Promise<PaginatedNotifications> {
  try {
    const res = await authorizeApi.get("/api/notifications", {
      params: {
        type: params?.type && params.type !== "ALL" ? params.type : undefined,
        unreadOnly: params?.unreadOnly || undefined,
        page: params?.page ?? 0,
        size: params?.size ?? 10,
      },
    })

    if (res.data?.success && res.data?.data) {
      const d = res.data.data
      const pageData = d.notifications || {}
      const rawList = Array.isArray(pageData.data) ? pageData.data : []

      const items: NotificationItem[] = rawList.map((item: any) => ({
        id: item.id,
        title: item.title || "",
        desc: item.desc || item.message || "",
        message: item.message || item.desc || "",
        time: item.time || (item.createdAt ? new Date(item.createdAt).toLocaleString("vi-VN") : "Vừa xong"),
        createdAt: item.createdAt,
        unread: item.unread !== undefined ? Boolean(item.unread) : !Boolean(item.isRead),
        isRead: item.isRead !== undefined ? Boolean(item.isRead) : !Boolean(item.unread),
        type: item.type || "SYSTEM",
        referenceType: item.referenceType,
        referenceId: item.referenceId,
        dotColor: item.dotColor || (item.type === "REPORT" ? "bg-emerald-500" : item.type === "DISPUTE" ? "bg-indigo-500" : "bg-amber-500"),
        icon: item.icon || (item.type === "REPORT" ? "SealCheck" : item.type === "DISPUTE" ? "Scales" : "Medal"),
        iconBg: item.iconBg || (item.type === "REPORT" ? "bg-emerald-50 dark:bg-emerald-900/30" : item.type === "DISPUTE" ? "bg-indigo-50 dark:bg-indigo-900/30" : "bg-amber-50 dark:bg-amber-900/30"),
        iconColor: item.iconColor || (item.type === "REPORT" ? "text-emerald-500" : item.type === "DISPUTE" ? "text-indigo-500" : "text-amber-500"),
      }))

      const tabCounts: NotificationTabCounts = d.tabCounts
        ? {
            all: Number(d.tabCounts.all || 0),
            report: Number(d.tabCounts.report || 0),
            dispute: Number(d.tabCounts.dispute || 0),
            system: Number(d.tabCounts.system || 0),
            unread: Number(d.tabCounts.unread || 0),
          }
        : DEFAULT_TAB_COUNTS

      return {
        items,
        currentPage: pageData.currentPage ?? 0,
        totalItems: pageData.totalItems ?? items.length,
        totalPages: pageData.totalPages ?? 1,
        pageSize: pageData.pageSize ?? 10,
        hasNext: Boolean(pageData.hasNext),
        hasPrevious: Boolean(pageData.hasPrevious),
        tabCounts,
      }
    }
  } catch (error) {
    console.warn("Không thể tải danh sách thông báo:", error)
  }

  return {
    items: [],
    currentPage: 0,
    totalItems: 0,
    totalPages: 1,
    pageSize: 10,
    hasNext: false,
    hasPrevious: false,
    tabCounts: DEFAULT_TAB_COUNTS,
  }
}

/**
 * Lấy số lượng thông báo theo từng tab từ GET /api/notifications/tab-counts
 */
export async function getNotificationTabCounts(): Promise<NotificationTabCounts> {
  try {
    const res = await authorizeApi.get("/api/notifications/tab-counts")
    if (res.data?.success && res.data?.data) {
      const d = res.data.data
      return {
        all: Number(d.all || 0),
        report: Number(d.report || 0),
        dispute: Number(d.dispute || 0),
        system: Number(d.system || 0),
        unread: Number(d.unread || 0),
      }
    }
  } catch (error) {
    console.warn("Không thể tải số lượng tab thông báo:", error)
  }
  return DEFAULT_TAB_COUNTS
}

/**
 * Lấy số lượng thông báo chưa đọc từ GET /api/notifications/unread-count
 */
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const res = await authorizeApi.get("/api/notifications/unread-count")
    if (res.data?.success) {
      return Number(res.data?.data || 0)
    }
  } catch (error) {
    console.warn("Không thể tải số lượng chưa đọc:", error)
  }
  return 0
}

/**
 * Đánh dấu toàn bộ thông báo đã đọc từ PATCH /api/notifications/read-all
 */
export async function markAllNotificationsAsRead(): Promise<boolean> {
  const res = await authorizeApi.patch("/api/notifications/read-all")
  return Boolean(res.data?.success || res.status === 200)
}

/**
 * Đánh dấu một thông báo đã đọc từ PATCH /api/notifications/{id}/read
 */
export async function markNotificationAsRead(id: number): Promise<boolean> {
  const res = await authorizeApi.patch(`/api/notifications/${id}/read`)
  return Boolean(res.data?.success || res.status === 200)
}
