export function normalizePhoneInput(value: string): string {
  let digits = value.replace(/\D/g, "")
  if (digits.startsWith("0084"))
    digits = "0" + digits.slice(4).replace(/^0/, "")
  else if (
    value.trim().startsWith("+84") ||
    (digits.startsWith("84") && digits.length > 10)
  )
    digits = "0" + digits.slice(2).replace(/^0/, "")
  return digits.slice(0, 10)
}

export function formatPhoneInput(value: string): string {
  const digits = normalizePhoneInput(value)
  return [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7)]
    .filter(Boolean)
    .join(" ")
}
