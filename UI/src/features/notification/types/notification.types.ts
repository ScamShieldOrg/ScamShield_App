export type NotificationType = "ALL" | "REPORT" | "DISPUTE" | "SYSTEM"

export interface NotificationItem {
  id: number
  title: string
  desc: string
  message?: string
  time: string
  createdAt?: string
  unread: boolean
  isRead?: boolean
  type: string
  referenceType?: string
  referenceId?: number
  dotColor?: string
  icon?: string
  iconBg?: string
  iconColor?: string
}

export interface NotificationTabCounts {
  all: number
  report: number
  dispute: number
  system: number
  unread: number
}

export interface NotificationQueryParams {
  type?: NotificationType
  unreadOnly?: boolean
  page?: number
  size?: number
}

export interface PaginatedNotifications {
  items: NotificationItem[]
  currentPage: number
  totalItems: number
  totalPages: number
  pageSize: number
  hasNext: boolean
  hasPrevious: boolean
  tabCounts: NotificationTabCounts
}
