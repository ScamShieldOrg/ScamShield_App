"use client"

import { useState, useEffect } from "react"
import { MotionConfig, motion } from "motion/react"
import { User, Buildings } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { useScamCheckTheme } from "@/components/features/check/scam-check-theme"
import { RegisterIndividualForm } from "@/components/features/auth/register-individual-form"
import { RegisterPartnerForm } from "@/components/features/auth/register-partner-form"

type RegisterTab = "individual" | "partner"

const REGISTER_TAB_KEY = "scamshield_register_active_tab"

export default function AuthRegisterPage() {
  const [activeTab, setActiveTab] = useState<RegisterTab>("individual")
  const { theme } = useScamCheckTheme()

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      try {
        const savedTab = sessionStorage.getItem(
          REGISTER_TAB_KEY
        ) as RegisterTab | null
        const partnerCooldown = localStorage.getItem(
          "scamshield_partner_otp_cooldown_until"
        )
        if (savedTab === "partner" || savedTab === "individual") {
          setActiveTab(savedTab)
        } else if (partnerCooldown) {
          const remaining = parseInt(partnerCooldown, 10) - Date.now()
          if (remaining > 0) {
            setActiveTab("partner")
          }
        }
      } catch {
        // ignore storage errors
      }
    })
    return () => window.cancelAnimationFrame(rafId)
  }, [])

  function handleTabChange(tab: RegisterTab) {
    setActiveTab(tab)
    try {
      sessionStorage.setItem(REGISTER_TAB_KEY, tab)
    } catch {
      // ignore
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-full py-8 sm:py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Tab Switcher Pill Bar */}
          <div className="mb-7 flex justify-center">
            <div
              role="tablist"
              aria-label="Chọn loại tài khoản đăng ký"
              className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/85 p-1 shadow-xs backdrop-blur-md dark:border-white/12 dark:bg-card/85"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "individual"}
                onClick={() => handleTabChange("individual")}
                className={cn(
                  "relative flex h-10 cursor-pointer items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  activeTab === "individual"
                    ? "text-white dark:text-slate-950"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {activeTab === "individual" && (
                  <motion.span
                    layoutId="register-tab-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className={cn(
                      "absolute inset-0 rounded-full",
                      theme.guestNavActive
                    )}
                  />
                )}
                <User
                  aria-hidden="true"
                  size={16}
                  weight="bold"
                  className="relative z-10"
                />
                <span className="relative z-10 whitespace-nowrap">Cá nhân</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "partner"}
                onClick={() => handleTabChange("partner")}
                className={cn(
                  "relative flex h-10 cursor-pointer items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  activeTab === "partner"
                    ? "text-white dark:text-slate-950"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {activeTab === "partner" && (
                  <motion.span
                    layoutId="register-tab-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className={cn(
                      "absolute inset-0 rounded-full",
                      theme.guestNavActive
                    )}
                  />
                )}
                <Buildings
                  aria-hidden="true"
                  size={16}
                  weight="bold"
                  className="relative z-10"
                />
                <span className="relative z-10 whitespace-nowrap">
                  Doanh nghiệp (Đối tác)
                </span>
              </button>
            </div>
          </div>

          {activeTab === "individual" && <RegisterIndividualForm />}
          {activeTab === "partner" && <RegisterPartnerForm />}
        </div>
      </div>
    </MotionConfig>
  )
}
