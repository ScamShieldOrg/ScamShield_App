import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import test from "node:test"
import ts from "typescript"

const rawSource = fs.readFileSync(
  new URL(
    "../src/components/features/resources/resource-helpers.ts",
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
  formatResourceDate,
  toWhitelistViewItem,
  categoryFilterToResourceType,
  getResourceTypeMeta,
  getSeverityMeta,
  sortBlacklistItems,
  buildResourcePagination,
  isAbortOrCancelError,
  extractResourceErrorMessage,
} = moduleExports

test("categoryFilterToResourceType maps UI categories to backend enum values", () => {
  assert.equal(categoryFilterToResourceType("all"), undefined)
  assert.equal(categoryFilterToResourceType("phone"), "PHONE")
  assert.equal(categoryFilterToResourceType("website"), "URL")
  assert.equal(categoryFilterToResourceType("bank"), "BANK_ACCOUNT")
  assert.equal(categoryFilterToResourceType("sms"), "SMS")
})

test("toWhitelistViewItem maps WhitelistResource cleanly with safe defaults", () => {
  const mapped = toWhitelistViewItem({
    id: 12,
    name: "Ngân hàng TMCP Ngoại thương Việt Nam",
    brandName: "Vietcombank",
    partnerType: "BUSINESS",
    taxId: "0100112437",
    verificationReason: "Đối tác ngân hàng chính thức",
    legalRepresentative: "Nguyễn Văn A",
    officialHotlines: ["1900 54 54 13"],
    officialDomains: ["vietcombank.com.vn"],
    smsBrandNames: ["Vietcombank"],
    verifiedIndicators: [
      { id: 1, resourceType: "SMS", value: "Vietcombank", verifiedAt: null },
    ],
    verifiedAt: "2026-11-20T00:00:00.000Z",
  })

  assert.equal(mapped.id, "WL-12")
  assert.equal(mapped.category, "sms")
  assert.equal(mapped.categoryLabel, "Doanh nghiệp")
  assert.equal(mapped.hotline, "1900 54 54 13")
  assert.equal(mapped.website, "vietcombank.com.vn")
  assert.equal(mapped.identifierValue, "Vietcombank")
})

test("getSeverityMeta returns Calm Authority badge styles without solid loud fills", () => {
  const critical = getSeverityMeta("CRITICAL", "Cực kỳ nguy hiểm")
  assert.equal(critical.label, "Cực kỳ nguy hiểm")
  assert.ok(critical.badgeClass.includes("bg-rose-500/10"))
  assert.ok(!critical.badgeClass.includes("text-white"))

  const medium = getSeverityMeta("MEDIUM", "Trung bình")
  assert.ok(medium.badgeClass.includes("bg-amber-500/10"))
})

test("sortBlacklistItems sorts by name or warningCount without mutating input", () => {
  const items = [
    { id: 1, title: "0912000001", warningCount: 5 },
    { id: 2, title: "0901000002", warningCount: 42 },
  ]
  const byReports = sortBlacklistItems(items, "reports")
  assert.equal(byReports[0].id, 2)
  assert.equal(items[0].id, 1)

  const byName = sortBlacklistItems(items, "name")
  assert.equal(byName[0].id, 2)
})

test("buildResourcePagination handles short and long page counts", () => {
  assert.deepEqual(buildResourcePagination(1, 3), [1, 2, 3])
  assert.deepEqual(buildResourcePagination(5, 10), [
    1,
    "ellipsis",
    4,
    5,
    6,
    "ellipsis",
    10,
  ])
})

test("isAbortOrCancelError and extractResourceErrorMessage handle errors safely", () => {
  assert.equal(isAbortOrCancelError({ name: "AbortError" }), true)
  assert.equal(isAbortOrCancelError({ code: "ERR_CANCELED" }), true)
  assert.equal(isAbortOrCancelError(new Error("Network error")), false)

  assert.equal(
    extractResourceErrorMessage(
      { response: { data: { message: "Máy chủ bận" } } },
      "Fallback"
    ),
    "Máy chủ bận"
  )
  assert.equal(extractResourceErrorMessage(null, "Fallback"), "Fallback")
  assert.equal(formatResourceDate(null), "Chưa cập nhật")
  assert.equal(getResourceTypeMeta("PHONE").iconKey, "phone")
})
