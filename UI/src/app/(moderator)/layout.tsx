import { RoleGuard } from "@/components/shared/role-guard"
import { ModeratorHeader } from "@/components/layout/moderator/moderator-header"

export default function ModeratorLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <RoleGuard allowedRoles={["MODERATOR"]}>
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased lg:has-[[data-report-workspace]]:h-dvh lg:has-[[data-report-workspace]]:min-h-0 dark:bg-slate-950 dark:text-slate-100">
        <ModeratorHeader className="shrink-0" />
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </RoleGuard>
  )
}
