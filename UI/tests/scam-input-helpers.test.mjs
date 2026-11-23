import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import test from "node:test"
import ts from "typescript"

const rawSource = fs.readFileSync(
  new URL(
    "../src/components/features/check/scam-input-helpers.ts",
    import.meta.url
  ),
  "utf8"
)

const transpiled = ts.transpileModule(rawSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText

const moduleExports = {}
vm.compileFunction(transpiled, ["exports", "module", "require"])(
  moduleExports,
  { exports: moduleExports },
  () => ({})
)

const {
  detectSuggestedCheckType,
  countMessageEntities,
  getInlineFormatError,
  summarizeCheckedContent,
} = moduleExports

test("detectSuggestedCheckType suggests URL, PHONE, or BANK_ACCOUNT only from TEXT tab", () => {
  assert.equal(
    detectSuggestedCheckType("https://vcb-xacthuc.xyz/login", "TEXT"),
    "URL"
  )
  assert.equal(detectSuggestedCheckType("example.com/verify", "TEXT"), "URL")
  assert.equal(detectSuggestedCheckType("0912 345 678", "TEXT"), "PHONE")
  assert.equal(detectSuggestedCheckType("+84 912 345 678", "TEXT"), "PHONE")
  assert.equal(detectSuggestedCheckType("1900 545413", "TEXT"), "PHONE")
  assert.equal(
    detectSuggestedCheckType("1903 6281 9283 01", "TEXT"),
    "BANK_ACCOUNT"
  )
  assert.equal(
    detectSuggestedCheckType("0011001234567", "TEXT"),
    "BANK_ACCOUNT"
  )

  // Multi-word messages or other tabs must not trigger auto-switch suggestions
  assert.equal(
    detectSuggestedCheckType(
      "Tai khoan cua ban bi khoa, bam https://vcb.xyz ngay",
      "TEXT"
    ),
    null
  )
  assert.equal(detectSuggestedCheckType("0912345678", "PHONE"), null)
  assert.equal(detectSuggestedCheckType("user@example.com", "TEXT"), null)
})

test("countMessageEntities accurately counts chars, unique links, and VN phones", () => {
  const sample =
    "Goi 0912345678 hoac 1900545413 va mo https://fake-bank.xyz va https://fake-bank.xyz ngay"
  const counts = countMessageEntities(sample)
  assert.equal(counts.chars, sample.length)
  assert.equal(counts.urls, 1)
  assert.equal(counts.phones, 2)
})

test("getInlineFormatError validates URL, PHONE, and BANK_ACCOUNT accurately", () => {
  assert.equal(getInlineFormatError("", "PHONE"), null)
  assert.equal(getInlineFormatError("0912 345 678", "PHONE"), null)
  assert.equal(getInlineFormatError("+84912345678", "PHONE"), null)
  assert.equal(getInlineFormatError("1900 5454", "PHONE"), null)
  assert.notEqual(getInlineFormatError("abc-123", "PHONE"), null)

  assert.equal(getInlineFormatError("1903 6281 9283", "BANK_ACCOUNT"), null)
  assert.notEqual(getInlineFormatError("12345", "BANK_ACCOUNT"), null)
  assert.notEqual(getInlineFormatError("1903ABC9283", "BANK_ACCOUNT"), null)

  assert.equal(getInlineFormatError("https://vietcombank.com.vn", "URL"), null)
  assert.equal(getInlineFormatError("example.vn", "URL"), null)
  assert.notEqual(getInlineFormatError("not a url", "URL"), null)
})

test("summarizeCheckedContent collapses whitespace and truncates cleanly", () => {
  assert.equal(summarizeCheckedContent("   \n  "), null)
  assert.equal(
    summarizeCheckedContent("  Xin   chao\nban  "),
    "Xin chao ban"
  )
  const longText = "a".repeat(100)
  const summary = summarizeCheckedContent(longText, 20)
  assert.equal(summary.length, 20)
  assert.ok(summary.endsWith("…"))
})
