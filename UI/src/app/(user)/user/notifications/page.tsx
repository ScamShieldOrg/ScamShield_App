"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  SealCheck,
  Scales,
  Medal,
  TreeStructure,
  CheckCircle,
  DeviceMobile,
  Check,
  SlidersHorizontal,
  CaretRight,
  Bell,
  ArrowClockwise,
} from "@phosphor-icons/react"
import { toast } from "react-toastify"
import { cn } from "@/lib/utils"
import {
  getNotifications,
  getNotificationTabCounts,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  DEFAULT_TAB_COUNTS,
} from "@/features/notification/services/notification.service"
import {
  NotificationItem,
  NotificationTabCounts,
  NotificationType,
} from "@/features/notification/types/notification.types"
import { useNotificationStore } from "@/features/notification/store/notification.store"

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  SealCheck,
  Scales,
  Medal,
  TreeStructure,
  CheckCircle,
  DeviceMobile,
  Bell,
}

export default function UserNotificationsPage() {
  const [activeTab, setActiveTab] = useState<NotificationType>("ALL")
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [tabCounts, setTabCounts] =
    useState<NotificationTabCounts>(DEFAULT_TAB_COUNTS)

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const setStoreUnreadCount = useNotificationStore(
    (state) => state.setUnreadCount
  )
  const decrementStoreUnreadCount = useNotificationStore(
    (state) => state.decrementUnreadCount
  )

  // Fetch notifications based on activeTab, unreadOnly, and currentPage
  const fetchNotifications = useCallback(
    async (pageToLoad: number) => {
      setIsLoading(true)
      try {
        const res = await getNotifications({
          type: activeTab,
          unreadOnly: unreadOnly ? true : undefined,
          page: pageToLoad - 1,
          size: 10,
        })
        setNotifications(res.items)
        setTabCounts(res.tabCounts)
        setStoreUnreadCount(res.tabCounts.unread)
        setTotalPages(Math.max(1, res.totalPages))
        setTotalItems(res.totalItems)
      } catch (err) {
        console.error("Lỗi khi tải thông báo:", err)
        setNotifications([])
      } finally {
        setIsLoading(false)
      }
    },
    [activeTab, unreadOnly, setStoreUnreadCount]
  )

  useEffect(() => {
    fetchNotifications(currentPage)
  }, [fetchNotifications, currentPage])

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (tabCounts.unread === 0 && !notifications.some((n) => n.unread)) {
      toast.info("Tất cả thông báo đều đã được đọc")
      return
    }

    setIsMarkingAll(true)
    try {
      const ok = await markAllNotificationsAsRead()
      if (ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, unread: false, isRead: true }))
        )
        setTabCounts((prev) => ({ ...prev, unread: 0 }))
        setStoreUnreadCount(0)
        toast.success("Đã đánh dấu tất cả thông báo là đã đọc")
      }
    } catch (err) {
      console.error("Lỗi khi đánh dấu tất cả đã đọc:", err)
      toast.error("Không thể đánh dấu đã đọc. Vui lòng thử lại!")
    } finally {
      setIsMarkingAll(false)
    }
  }

  // Mark single as read on click
  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.unread) return

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notif.id ? { ...n, unread: false, isRead: true } : n
      )
    )
    setTabCounts((prev) => ({
      ...prev,
      unread: Math.max(0, prev.unread - 1),
    }))
    decrementStoreUnreadCount()

    try {
      await markNotificationAsRead(notif.id)
    } catch (err) {
      console.warn("Lỗi khi đánh dấu thông báo đã đọc:", err)
    }
  }

  const tabs: { type: NotificationType; label: string; count: number }[] = [
    { type: "ALL", label: "Tất cả", count: tabCounts.all },
    { type: "REPORT", label: "Báo cáo", count: tabCounts.report },
    { type: "DISPUTE", label: "Khiếu nại", count: tabCounts.dispute },
    { type: "SYSTEM", label: "Hệ thống", count: tabCounts.system },
  ]

  const getNotificationIcon = (notif: NotificationItem) => {
    if (notif.icon && ICON_MAP[notif.icon]) {
      return ICON_MAP[notif.icon]
    }
    if (notif.type === "REPORT") return SealCheck
    if (notif.type === "DISPUTE") return Scales
    return Medal
  }

  return (
    <div className="w-full max-w-6xl">
      {/* Title & Breadcrumb */}
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="mb-4 text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400">
            Cổng Người Dùng / Giám Sát & Phòng Vệ Số /{" "}
            <span className="text-slate-900 dark:text-white">
              Trung Tâm Thông Báo
            </span>
          </div>
          <h1 className="mb-2 font-heading text-[28px] font-bold tracking-tight text-slate-900 md:text-3xl dark:text-white">
            Thông Báo Hệ Thống
          </h1>
          <p className="max-w-xl text-sm font-medium text-slate-500 dark:text-slate-400">
            Cập nhật kết quả phê duyệt báo cáo, tiến trình khiếu nại và cảnh báo
            từ hệ thống.
          </p>
        </div>

        <div className="mt-2 flex items-center gap-2 md:mt-6">
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll || isLoading}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Check weight="bold" size={16} />
            <span>
              {isMarkingAll ? "Đang xử lý..." : "Đã đọc tất cả"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setUnreadOnly((prev) => !prev)
              setCurrentPage(1)
            }}
            title={unreadOnly ? "Hiển thị tất cả" : "Chỉ xem chưa đọc"}
            className={cn(
              "flex size-9 cursor-pointer items-center justify-center rounded-full border text-xs font-bold shadow-xs transition-colors",
              unreadOnly
                ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            )}
          >
            <SlidersHorizontal weight="bold" size={16} />
          </button>

          <button
            type="button"
            onClick={() => fetchNotifications(currentPage)}
            title="Làm mới"
            className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-xs transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowClockwise
              weight="bold"
              size={16}
              className={cn(isLoading && "animate-spin")}
            />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.type
          return (
            <button
              key={tab.type}
              type="button"
              onClick={() => {
                setActiveTab(tab.type)
                setCurrentPage(1)
              }}
              className={cn(
                "cursor-pointer rounded-full border px-4 py-2 text-[11px] font-bold shadow-xs transition-all",
                isActive
                  ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
              )}
            >
              <span>{tab.label}</span>
              <span className="ml-1 opacity-75">({tab.count})</span>
            </button>
          )
        })}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          // Loading Skeletons
          [1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex animate-pulse items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center gap-4">
                <div className="size-12 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800" />
                <div className="space-y-2">
                  <div className="h-4 w-48 rounded-md bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-80 rounded-md bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
              <div className="h-3 w-16 rounded-md bg-slate-100 dark:bg-slate-800" />
            </div>
          ))
        ) : notifications.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-14 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <Bell size={28} weight="fill" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Không có thông báo nào
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {unreadOnly
                ? "Bạn không có thông báo chưa đọc nào trong mục này."
                : "Chưa có thông báo mới nào được ghi nhận từ hệ thống."}
            </p>
          </div>
        ) : (
          // Real Notifications List
          notifications.map((notif) => {
            const IconComponent = getNotificationIcon(notif)
            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className="group flex cursor-pointer flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-xs transition-colors hover:bg-slate-50 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/80"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "mt-0.5 flex size-12 shrink-0 items-center justify-center rounded-full",
                      notif.iconBg || "bg-slate-100 dark:bg-slate-800",
                      notif.iconColor || "text-slate-600 dark:text-slate-300"
                    )}
                  >
                    <IconComponent weight="fill" size={24} />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <h3
                        className={cn(
                          "text-[15px] leading-snug",
                          notif.unread
                            ? "font-bold text-slate-900 dark:text-white"
                            : "font-semibold text-slate-700 dark:text-slate-300"
                        )}
                      >
                        {notif.title}
                      </h3>
                      {notif.unread && (
                        <div
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            notif.dotColor || "bg-emerald-500"
                          )}
                        />
                      )}
                    </div>
                    <p className="text-[13px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                      {notif.desc}
                    </p>
                  </div>
                </div>

                <div className="flex w-full items-center justify-between gap-4 pl-16 sm:w-auto sm:justify-end sm:pl-0">
                  <span
                    className={cn(
                      "text-xs font-bold whitespace-nowrap",
                      notif.unread
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-400 dark:text-slate-500"
                    )}
                  >
                    {notif.time}
                  </span>
                  <CaretRight
                    weight="bold"
                    className="text-slate-300 transition-colors group-hover:text-slate-400 dark:text-slate-600 dark:group-hover:text-slate-400"
                    size={16}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination (if multiple pages) */}
      {totalPages > 1 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-5 py-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hiển thị trang {currentPage} trên tổng số {totalPages} trang (
            {totalItems} thông báo)
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              Trang trước
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
              const p = idx + 1
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  disabled={isLoading}
                  className={cn(
                    "flex size-7 cursor-pointer items-center justify-center rounded-lg text-xs font-bold shadow-2xs transition-all",
                    currentPage === p
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  )}
                >
                  {p}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage >= totalPages || isLoading}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              Trang sau
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
