export interface UserNavItem {
  title: string
  href: string
  iconName:
    | "ShieldCheck"
    | "ClockCounterClockwise"
    | "FilePlus"
    | "FolderSimple"
    | "Scales"
    | "Bell"
    | "Trophy"
  badge?: string | number
  badgeVariant?: "danger" | "default"
}

export const USER_NAV_ITEMS: UserNavItem[] = [
  {
    title: "Kiểm Tra Lừa Đảo",
    href: "/user/check",
    iconName: "ShieldCheck",
  },
  {
    title: "Lịch Sử Kiểm Tra",
    href: "/user/history",
    iconName: "ClockCounterClockwise",
  },
  {
    title: "Gửi Báo Cáo Mới",
    href: "/user/reports/new",
    iconName: "FilePlus",
  },
  {
    title: "Báo Cáo Của Tôi",
    href: "/user/reports",
    iconName: "FolderSimple",
  },
  {
    title: "Khiếu Nại Chỉ Số",
    href: "/user/disputes",
    iconName: "Scales",
  },
  {
    title: "Thông Báo",
    href: "/user/notifications",
    iconName: "Bell",
    badgeVariant: "danger",
  },
  {
    title: "Huy Hiệu & Đổi Thưởng",
    href: "/user/reputation",
    iconName: "Trophy",
  },
]

/**
 * Resolve the single most specific nav item matching the current path.
 * e.g. "/user/reports/new" matches both "/user/reports" and "/user/reports/new",
 * but only the longer (more specific) one is returned.
 */
export function getActiveUserNavItem(
  pathname: string
): UserNavItem | undefined {
  const path = pathname === "/user" ? "/user/check" : pathname
  return USER_NAV_ITEMS.filter(
    (item) => path === item.href || path.startsWith(`${item.href}/`)
  ).reduce<UserNavItem | undefined>(
    (best, item) =>
      !best || item.href.length > best.href.length ? item : best,
    undefined
  )
}
