const reportPhoneSeparator = /[\s().-]/g

export function limitReportPhoneInput(value: string, previousValue: string): string {
  const compact = value.replace(reportPhoneSeparator, "")
  if (/^0\d*$/.test(compact)) return compact.slice(0, 10)
  if (/^\+84\d*$/.test(compact)) return compact.slice(0, 12)
  if (compact === "" || compact === "+" || compact === "+8") return compact
  return previousValue
}

export function isCompleteReportPhone(value: string): boolean {
  return /^(?:0\d{9}|\+84[1-9]\d{8})$/.test(value.replace(reportPhoneSeparator, ""))
}

export function formatReportHotline(value: string): string {
  const compact = value.replace(/[\s().-]/g, "")
  if (!/^(1800|1900)\d{4,6}$/.test(compact)) return value
  const middle = Math.ceil(compact.length / 2)
  return `${compact.slice(0, middle)} ${compact.slice(middle)}`
}

export function formatReportPhoneInput(value: string): string {
  const compact = value.replace(/[\s().-]/g, "")
  if (/^0\d{9}$/.test(compact)) {
    return `${compact.slice(0, 4)} ${compact.slice(4, 7)} ${compact.slice(7)}`
  }
  if (/^\+84\d{9}$/.test(compact)) {
    return `+84 ${compact.slice(3, 6)} ${compact.slice(6, 9)} ${compact.slice(9)}`
  }
  return formatReportHotline(value)
}
