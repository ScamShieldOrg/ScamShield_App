import { authServices } from "@/features/auth/services/auth-services"
import { getRecaptchaToken } from "@/lib/firebase/recaptcha"

export interface VerifiedGooglePhone {
  phoneNumber: string
  verificationToken: string
  expiresAt: number
}

interface GoogleRegistrationInput {
  idToken: string
  phoneNumber: string
  phoneOtp: string
  agreeTerms: boolean
  receiveAlerts: boolean
}

export function isPhoneVerificationCurrent(
  verification: VerifiedGooglePhone | null,
  phoneNumber: string
): verification is VerifiedGooglePhone {
  return (
    verification !== null &&
    verification.phoneNumber === phoneNumber &&
    verification.expiresAt > Date.now()
  )
}

export async function sendGoogleRegistrationOtp(
  phoneNumber: string,
  containerId: string
) {
  const recaptchaToken = await getRecaptchaToken(containerId)
  return authServices.sendPhoneOtp(phoneNumber, recaptchaToken)
}

export async function registerGoogleWithPhoneVerification(
  input: GoogleRegistrationInput,
  verification: VerifiedGooglePhone | null,
  onVerified: (verification: VerifiedGooglePhone) => void
) {
  if (
    verification?.phoneNumber === input.phoneNumber &&
    verification.expiresAt <= Date.now()
  ) {
    throw new Error("Xác nhận điện thoại đã hết hạn. Vui lòng gửi mã OTP mới.")
  }
  if (!isPhoneVerificationCurrent(verification, input.phoneNumber)) {
    const result = await authServices.verifyContacts(
      input.phoneNumber,
      input.phoneOtp
    )
    // The backend returns LocalDateTime in Vietnam time, without an offset.
    const expiresAt = Date.parse(
      /(?:Z|[+-]\d{2}:\d{2})$/i.test(result.expiresAt)
        ? result.expiresAt
        : `${result.expiresAt}+07:00`
    )
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      throw new Error(
        "Mã xác nhận điện thoại đã hết hạn hoặc không hợp lệ. Vui lòng gửi mã OTP mới."
      )
    }
    verification = {
      phoneNumber: input.phoneNumber,
      verificationToken: result.verificationToken,
      expiresAt,
    }
    onVerified(verification)
  }

  return authServices.registerGoogle({
    idToken: input.idToken,
    phoneNumber: input.phoneNumber,
    verificationToken: verification.verificationToken,
    agreeTerms: input.agreeTerms,
    receiveAlerts: input.receiveAlerts,
  })
}
