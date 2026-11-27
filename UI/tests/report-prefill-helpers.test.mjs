import test from "node:test"
import assert from "node:assert/strict"
import {
  REPORT_PREFILL_KEY,
  threatTypeFromInputType,
  parseCheckId,
  extractTrailingDigits,
  truncateText,
} from "../src/components/features/report/report-prefill-helpers.ts"

test("REPORT_PREFILL_KEY preserves exact cross-flow storage contract", () => {
  assert.equal(REPORT_PREFILL_KEY, "scamshield.report-prefill")
})

test("threatTypeFromInputType maps check input types correctly", () => {
  assert.equal(threatTypeFromInputType("URL"), "WEBSITE")
  assert.equal(threatTypeFromInputType("PHONE"), "PHONE")
  assert.equal(threatTypeFromInputType("BANK_ACCOUNT"), "BANK_ACCOUNT")
  assert.equal(threatTypeFromInputType("MESSAGE"), null)
  assert.equal(threatTypeFromInputType(null), null)
})

test("parseCheckId accepts positive integers only", () => {
  assert.equal(parseCheckId(42), 42)
  assert.equal(parseCheckId("181"), 181)
  assert.equal(parseCheckId("0"), null)
  assert.equal(parseCheckId("-5"), null)
  assert.equal(parseCheckId("abc"), null)
})

test("extractTrailingDigits pulls trailing numeric check id from scanId", () => {
  assert.equal(extractTrailingDigits("SCAN-2026-0091"), "0091")
  assert.equal(extractTrailingDigits("check_42  "), "42")
  assert.equal(extractTrailingDigits("no-digits"), null)
})

test("truncateText trims and adds ellipsis when over limit", () => {
  assert.equal(truncateText("  Ngắn gọn  ", 20), "Ngắn gọn")
  assert.equal(truncateText("Một đoạn mô tả dài hơn mười ký tự", 12), "Một đoạn...")
})
