import { GuestShell } from "@/components/layout/guest/guest-shell"

export default function GuestLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <GuestShell>{children}</GuestShell>
}
