import { GoogleUserPayload } from "@/features/auth/types/auth.types"

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          prompt: (momentListener?: (notification: unknown) => void) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon"
              theme?: "outline" | "filled_blue" | "filled_black"
              size?: "large" | "medium" | "small"
              text?: "signin_with" | "signup_with" | "continue_with" | "signin"
              shape?: "rectangular" | "pill" | "circle" | "square"
              logo_alignment?: "left" | "center"
              width?: number
              locale?: string
            }
          ) => void
          cancel: () => void
        }
        oauth2?: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token: string; error?: string }) => void
          }) => { requestAccessToken: () => void }
        }
      }
    }
  }
}

let scriptLoadPromise: Promise<void> | null = null

export function getGoogleClientId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""
}

export function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.google?.accounts?.id) return Promise.resolve()

  if (scriptLoadPromise) return scriptLoadPromise

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("google-identity-services-script")
    if (existing) {
      if (window.google?.accounts?.id) {
        resolve()
      } else {
        existing.addEventListener("load", () => resolve())
        existing.addEventListener("error", (e) => reject(e))
      }
      return
    }

    const script = document.createElement("script")
    script.id = "google-identity-services-script"
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = (err) => reject(err)
    document.head.appendChild(script)
  })

  return scriptLoadPromise
}

export function decodeGoogleIdToken(token: string): GoogleUserPayload | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const payloadStr = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    const json = JSON.parse(decodeURIComponent(escape(payloadStr)))
    return json as GoogleUserPayload
  } catch {
    return null
  }
}
