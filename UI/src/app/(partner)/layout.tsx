import { RoleGuard } from "@/components/shared/role-guard"
import { PartnerDashboardShell } from "@/components/layout/partner/partner-dashboard-shell"

export default function PartnerLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <RoleGuard allowedRoles={["BUSINESS_PARTNER"]}>
      <PartnerDashboardShell>{children}</PartnerDashboardShell>
    </RoleGuard>
  )
}

