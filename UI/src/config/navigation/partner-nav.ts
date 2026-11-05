export interface PartnerNavItem {
  title: string
  href: string
  iconName: "Gauge" | "ShieldCheck" | "Megaphone" | "FileText" | "WarningOctagon" | "Gear"
  badge?: string
  badgeVariant?: "urgent" | "neutral"
}

export const PARTNER_NAV_ITEMS: PartnerNavItem[] = [
  {
    title: "Tổng quan / Dashboard",
    href: "/business-partner",
    iconName: "Gauge",
  },
  {
    title: "Tổ chức & Whitelist",
    href: "/business-partner/organization",
    iconName: "ShieldCheck",
  },
  {
    title: "Phát lệnh cảnh báo",
    href: "/business-partner/alerts",
    iconName: "Megaphone",
    badge: "KHẨN",
    badgeVariant: "urgent",
  },
  {
    title: "Đóng góp tình báo",
    href: "/business-partner/threat-intel",
    iconName: "FileText",
  },
  {
    title: "Vụ việc mạo danh",
    href: "/business-partner/incidents",
    iconName: "WarningOctagon",
    badge: "168",
    badgeVariant: "neutral",
  },
  {
    title: "Cài đặt Webhook",
    href: "/business-partner/webhook",
    iconName: "Gear",
  },
]

export function getActivePartnerNavItem(pathname: string | null): PartnerNavItem | undefined {
  if (!pathname) return undefined
  return PARTNER_NAV_ITEMS.find((item) => pathname === item.href || (item.href !== "/business-partner" && pathname.startsWith(item.href)))
}

