import { RoleGuard } from "@/components/shared/role-guard"
import { UserDashboardShell } from "@/components/layout/user/user-dashboard-shell"

export default function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <RoleGuard
      allowedRoles={[
        "REGISTERED_USER",
        "ADMINISTRATOR",
        "MODERATOR",
        "BUSINESS_PARTNER",
      ]}
    >
      <UserDashboardShell>{children}</UserDashboardShell>
    </RoleGuard>
  )
}
