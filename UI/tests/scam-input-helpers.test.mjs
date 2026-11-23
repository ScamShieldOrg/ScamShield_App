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
  inferCheckTypeFromContent,
  detectSuggestedCheckType,
  countMessageEntities,
  getInlineFormatError,
  summarizeCheckedContent,
  buildAnnotatedSegments,
} = moduleExports

test("inferCheckTypeFromContent classifies URL, PHONE, BANK_ACCOUNT, and TEXT accurately", () => {
  assert.equal(inferCheckTypeFromContent("https://vcb-xacthuc.xyz/login"), "URL")
  assert.equal(inferCheckTypeFromContent("example.com/verify"), "URL")
  assert.equal(inferCheckTypeFromContent("0912 345 678"), "PHONE")
  assert.equal(inferCheckTypeFromContent("+84 912 345 678"), "PHONE")
  assert.equal(inferCheckTypeFromContent("1900 545413"), "PHONE")
  assert.equal(inferCheckTypeFromContent("1903 6281 9283 01"), "BANK_ACCOUNT")
  assert.equal(inferCheckTypeFromContent("0011001234567"), "BANK_ACCOUNT")
  assert.equal(
    inferCheckTypeFromContent("Tai khoan bi khoa, truy cap https://vcb.xyz ngay"),
    "TEXT"
  )
  assert.equal(inferCheckTypeFromContent("user@example.com"), "TEXT")
  assert.equal(inferCheckTypeFromContent(""), "TEXT")
})

test("detectSuggestedCheckType suggests URL, PHONE, or BANK_ACCOUNT only from TEXT tab", () => {
  assert.equal(
    detectSuggestedCheckType("https://vcb-xacthuc.xyz/login", "TEXT"),
    "URL"
  )
  assert.equal(detectSuggestedCheckType("0912 345 678", "TEXT"), "PHONE")
  assert.equal(
    detectSuggestedCheckType("1903 6281 9283 01", "TEXT"),
    "BANK_ACCOUNT"
  )
  assert.equal(detectSuggestedCheckType("0912345678", "PHONE"), null)
})

test("countMessageEntities accurately counts chars, unique links, and VN phones", () => {
  const sample =
    "Goi 0912345678 hoac 1900545413 va mo https://fake-bank.xyz va https://fake-bank.xyz ngay"
  const counts = countMessageEntities(sample)
  assert.equal(counts.chars, sample.length)
  assert.equal(counts.urls, 1)
  assert.equal(counts.phones, 2)

  // Missing space after a period before a capitalized Vietnamese word ("tri.Co")
  // must never be miscounted as a bare ".co" domain.
  const typoSample =
    "[NUMBER]:COVID: Khi chua co thuoc dac tri.Co mot cach chua benh ky dieu khac.Do la tu luyen Phap Luan Cong, tang cuong he mien dich.Video: https://tnews.to/tri-benh"
  assert.equal(countMessageEntities(typoSample).urls, 1)
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
  assert.equal(summarizeCheckedContent("  Xin   chao\nban  "), "Xin chao ban")
  const longText = "a".repeat(100)
  const summary = summarizeCheckedContent(longText, 20)
  assert.equal(summary.length, 20)
  assert.ok(summary.endsWith("…"))
})

test("buildAnnotatedSegments highlights URLs, phones, and urgency phrases without overlap", () => {
  const raw =
    "Khan cap: tai khoan bi khoa trong 24h! Goi 0912 345 678 hoac mo https://vcb-fake.xyz ngay."
  const segments = buildAnnotatedSegments(
    raw,
    {
      url_analysis: {
        detected_urls: ["https://vcb-fake.xyz"],
        is_in_official_whitelist: false,
        domain_reputation: "MALICIOUS_SIMILARITY",
      },
      phone_analysis: {
        detected_phones: ["0912345678"],
        is_official_hotline: false,
        phone_type: "PERSONAL_MOBILE",
      },
      urgency_indicators: {
        matched_keywords: ["Khan cap", "trong 24h"],
        urgency_score: 0.9,
      },
    },
    "DANGEROUS"
  )

  // Reconstructed text must match the original character-for-character
  assert.equal(
    segments.map((s) => s.text).join(""),
    raw
  )

  const kinds = segments.filter((s) => s.kind !== "plain").map((s) => s.kind)
  assert.deepEqual(kinds, [
    "urgency",
    "urgency",
    "phone_personal",
    "url_danger",
  ])
})
