export function normalizeOtpInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6)
}

export function formatOtpInput(value: string): string {
  const digits = normalizeOtpInput(value)
  return [digits.slice(0, 3), digits.slice(3)].filter(Boolean).join(" ")
}
