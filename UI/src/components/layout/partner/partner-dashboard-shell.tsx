"use client"

import { useEffect, useRef } from "react"
import { X } from "@phosphor-icons/react"
import { PartnerSidebar } from "./partner-sidebar"
import { PartnerHeader } from "./partner-header"

export function PartnerDashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const mobileMenu = useRef<HTMLDialogElement>(null)
  const closeMobileMenu = () => mobileMenu.current?.close()

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 64rem)")
    const closeOnDesktop = () => {
      if (desktop.matches) mobileMenu.current?.close()
    }
    desktop.addEventListener("change", closeOnDesktop)
    return () => desktop.removeEventListener("change", closeOnDesktop)
  }, [])

  return (
    <div className="min-h-screen bg-[#faf8ff] font-sans text-[#131b2e] dark:bg-slate-950 dark:text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[250px] lg:block">
        <PartnerSidebar />
      </aside>

      <dialog
        ref={mobileMenu}
        aria-label="Điều hướng đối tác doanh nghiệp"
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[250px] max-w-full bg-transparent p-0 backdrop:bg-black/50 lg:hidden"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMobileMenu()
        }}
      >
        <PartnerSidebar
          onNavigate={closeMobileMenu}
          closeButton={
            <button
              type="button"
              onClick={closeMobileMenu}
              aria-label="Đóng menu"
              className="grid size-8 place-items-center rounded-md hover:bg-black/10 dark:hover:bg-white/10"
            >
              <X size={18} />
            </button>
          }
        />
      </dialog>

      {/* Main Content Area */}
      <div className="min-w-0 lg:pl-[250px]">
        <PartnerHeader
          onOpenMobileMenu={() => mobileMenu.current?.showModal()}
        />
        <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
