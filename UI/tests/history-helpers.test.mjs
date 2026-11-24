import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import test from "node:test"
import ts from "typescript"

const rawSource = fs.readFileSync(
  new URL(
    "../src/components/features/history/history-helpers.ts",
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
  DEFAULT_HISTORY_TIME_RANGE,
  DEFAULT_HISTORY_SCAM_TYPE,
  hasActiveHistoryFilters,
  buildPaginationRange,
  getHistoryRiskMeta,
  getHistoryTargetMeta,
  isIdentifierTargetType,
  shouldShowHistorySnippet,
  formatHistoryDateTime,
} = moduleExports

test("hasActiveHistoryFilters detects default vs narrowed filter state", () => {
  assert.equal(
    hasActiveHistoryFilters({
      searchQuery: "   ",
      timeRange: DEFAULT_HISTORY_TIME_RANGE,
      scamType: DEFAULT_HISTORY_SCAM_TYPE,
      riskStatus: "ALL",
    }),
    false
  )

  assert.equal(
    hasActiveHistoryFilters({
      searchQuery: "0912",
      timeRange: DEFAULT_HISTORY_TIME_RANGE,
      scamType: DEFAULT_HISTORY_SCAM_TYPE,
      riskStatus: "ALL",
    }),
    true
  )

  assert.equal(
    hasActiveHistoryFilters({
      searchQuery: "",
      timeRange: "7_days",
      scamType: DEFAULT_HISTORY_SCAM_TYPE,
      riskStatus: "ALL",
    }),
    true
  )

  assert.equal(
    hasActiveHistoryFilters({
      searchQuery: "",
      timeRange: DEFAULT_HISTORY_TIME_RANGE,
      scamType: "banking",
      riskStatus: "ALL",
    }),
    true
  )

  assert.equal(
    hasActiveHistoryFilters({
      searchQuery: "",
      timeRange: DEFAULT_HISTORY_TIME_RANGE,
      scamType: DEFAULT_HISTORY_SCAM_TYPE,
      riskStatus: "DANGEROUS",
    }),
    true
  )
})

test("buildPaginationRange returns compact sequences with ellipsis for large page counts", () => {
  assert.deepEqual(buildPaginationRange(1, 1), [1])
  assert.deepEqual(buildPaginationRange(3, 6), [1, 2, 3, 4, 5, 6])
  assert.deepEqual(buildPaginationRange(1, 12), [1, 2, "ellipsis", 12])
  assert.deepEqual(buildPaginationRange(6, 12), [
    1,
    "ellipsis",
    5,
    6,
    7,
    "ellipsis",
    12,
  ])
  assert.deepEqual(buildPaginationRange(12, 12), [1, "ellipsis", 11, 12])
  assert.deepEqual(buildPaginationRange(99, 5), [1, 2, 3, 4, 5])
})

test("getHistoryRiskMeta maps all verdict statuses to Calm Authority tokens", () => {
  assert.equal(getHistoryRiskMeta("DANGEROUS").status, "DANGEROUS")
  assert.equal(getHistoryRiskMeta("SCAM_RISK").status, "DANGEROUS")
  assert.equal(getHistoryRiskMeta("SUSPICIOUS").status, "SUSPICIOUS")
  assert.equal(getHistoryRiskMeta("SAFE").status, "SAFE")
  assert.equal(getHistoryRiskMeta("LOW_RISK").status, "SAFE")
  assert.equal(getHistoryRiskMeta("UNKNOWN").status, "UNKNOWN")
  assert.equal(getHistoryRiskMeta(undefined).status, "UNKNOWN")
})

test("getHistoryTargetMeta maps known target types and falls back safely", () => {
  assert.equal(getHistoryTargetMeta("PHONE").iconKey, "phone")
  assert.equal(getHistoryTargetMeta("URL").iconKey, "url")
  assert.equal(getHistoryTargetMeta("SMS_BANK").iconKey, "sms")
  assert.equal(getHistoryTargetMeta("BANK_ACCOUNT").iconKey, "bank")
  assert.equal(getHistoryTargetMeta("CRYPTO").iconKey, "crypto")
  assert.equal(getHistoryTargetMeta("MESSAGE").iconKey, "message")
  assert.equal(getHistoryTargetMeta("OTHER").iconKey, "message")
})

test("isIdentifierTargetType distinguishes structured identifiers from prose messages", () => {
  assert.equal(isIdentifierTargetType("PHONE"), true)
  assert.equal(isIdentifierTargetType("URL"), true)
  assert.equal(isIdentifierTargetType("BANK_ACCOUNT"), true)
  assert.equal(isIdentifierTargetType("MESSAGE"), false)
  assert.equal(isIdentifierTargetType("TEXT"), false)
})

test("shouldShowHistorySnippet suppresses duplicate prefix snippets", () => {
  assert.equal(
    shouldShowHistorySnippet(
      "[NUMBER]:COVID: Khi chua co thuoc dac tri.Co mot cach chua benh ky dieu khac",
      "[NUMBER]:COVID: Khi chua co thuoc dac tri..."
    ),
    false
  )
  assert.equal(
    shouldShowHistorySnippet(
      "+84 912 443 882",
      "Thông báo thuê bao sẽ bị khóa sau 2 giờ..."
    ),
    true
  )
  assert.equal(shouldShowHistorySnippet("0912345678", ""), false)
})

test("formatHistoryDateTime handles empty, invalid, and valid ISO timestamps", () => {
  assert.equal(formatHistoryDateTime(null), null)
  assert.equal(formatHistoryDateTime(""), null)
  assert.equal(formatHistoryDateTime("not-a-date"), "not-a-date")
  const formatted = formatHistoryDateTime("2026-11-24T05:30:00.000Z")
  assert.equal(typeof formatted, "string")
  assert.ok(formatted.includes("2026"))
})
