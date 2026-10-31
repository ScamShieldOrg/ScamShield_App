import { getApp, getApps, initializeApp } from "firebase/app"
import { getAuth, RecaptchaVerifier } from "firebase/auth"

function getFirebaseApp() {
  if (getApps().length > 0) return getApp()
  return initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  })
}

/**
 * Solves a Firebase reCAPTCHA challenge and returns a one-time token for
 * the backend `send-phone-otp` endpoint. reCAPTCHA tokens cannot be reused and
 * a cleared verifier leaves its container unusable, so every call renders into
 * a fresh child element that is removed afterwards.
 */
export async function getRecaptchaToken(containerId: string): Promise<string> {
  if (
    !process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    !process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    !process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  ) {
    throw new Error(
      "Chức năng xác thực điện thoại chưa được cấu hình đầy đủ. Vui lòng liên hệ hỗ trợ."
    )
  }
  const parent = document.getElementById(containerId)
  if (!parent) {
    throw new Error("Không tìm thấy vùng xác thực reCAPTCHA.")
  }
  const mount = document.createElement("div")
  parent.appendChild(mount)

  let verifier: RecaptchaVerifier | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    verifier = new RecaptchaVerifier(getAuth(getFirebaseApp()), mount, {
      size: "invisible",
    })
    const token = await Promise.race([
      verifier.verify(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("verification-timeout")),
          120_000
        )
      }),
    ])
    if (!token || !parent.isConnected) {
      throw new Error("verification-unavailable")
    }
    return token
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? error.code
        : undefined
    if (code === "auth/network-request-failed") {
      throw new Error(
        "Không thể kết nối dịch vụ xác thực bảo mật. Vui lòng kiểm tra mạng và thử lại."
      )
    }
    if (code === "auth/too-many-requests") {
      throw new Error(
        "Bạn đã thử xác thực quá nhiều lần. Vui lòng chờ một lúc rồi thử lại."
      )
    }
    throw new Error(
      "Xác thực bảo mật chưa hoàn tất hoặc đã hết hạn. Vui lòng nhấn Gửi mã OTP để thử lại."
    )
  } finally {
    if (timer) clearTimeout(timer)
    try {
      verifier?.clear()
    } catch {
      // Cleanup must not replace the verification result or its error.
    }
    mount.remove()
  }
}
