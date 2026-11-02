export function normalizePhoneInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10)
}

export function formatPhoneInput(value: string): string {
  const digits = normalizePhoneInput(value)
  return [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7)]
    .filter(Boolean)
    .join(" ")
}
