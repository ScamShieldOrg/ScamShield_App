import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import test from "node:test"
import ts from "typescript"

function load(path, dependencies = {}) {
  const code = ts.transpileModule(
    fs.readFileSync(new URL(path, import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } }
  ).outputText
  const testModule = { exports: {} }
  vm.compileFunction(code, ["require", "module", "exports"])(
    (name) => dependencies[name],
    testModule,
    testModule.exports
  )
  return testModule.exports
}

const { getReportTargetTypeWarning: warn } = load(
  "../src/features/report/utils/report-target.ts",
  {
    "@/features/check/utils/check-validation": load(
      "../src/features/check/utils/check-validation.ts"
    ),
  }
)

test("suggests website when a URL is entered under phone or bank account", () => {
  assert.match(warn("PHONE", "https://example.com/login"), /Website/)
  assert.match(warn("BANK_ACCOUNT", "example.com"), /Website/)
})

test("suggests alternatives without guessing a single type for ambiguous digits", () => {
  assert.match(
    warn("WEBSITE", "0912345678"),
    /Số điện thoại.*Tài khoản ngân hàng/
  )
  assert.match(warn("WEBSITE", "123456789012345"), /Tài khoản ngân hàng/)
  assert.match(warn("WEBSITE", "12.345678"), /Tài khoản ngân hàng/)
  assert.equal(warn("BANK_ACCOUNT", "0912345678"), null)
  assert.equal(warn("PHONE", "0912345678"), null)
})

test("keeps supported phone and URL formats", () => {
  assert.equal(warn("PHONE", "0084 912 345 678"), null)
  assert.equal(warn("PHONE", "1900 1234"), null)
  assert.equal(warn("WEBSITE", "example.com/path"), null)
})

test("limits report phone input according to its prefix", () => {
  const { limitReportPhoneInput, isCompleteReportPhone } = load(
    "../src/features/report/utils/report-phone.ts"
  )
  assert.equal(limitReportPhoneInput("0912 345 6789", ""), "0912345678")
  assert.equal(limitReportPhoneInput("+84 912 345 6789", ""), "+84912345678")
  assert.equal(limitReportPhoneInput("+8", "+"), "+8")
  assert.equal(limitReportPhoneInput("912345678", ""), "")
  for (const prefix of ["1800", "1900"]) {
    for (let length = 1; length <= prefix.length; length++) {
      const partial = prefix.slice(0, length)
      assert.equal(limitReportPhoneInput(partial, ""), partial)
      assert.equal(isCompleteReportPhone(partial), false)
    }
    assert.equal(limitReportPhoneInput(`${prefix} 1234567`, ""), `${prefix}123456`)
    assert.equal(isCompleteReportPhone(`${prefix} 123`), false)
    assert.equal(isCompleteReportPhone(`${prefix} 1234`), true)
    assert.equal(isCompleteReportPhone(`${prefix} 123456`), true)
    assert.equal(isCompleteReportPhone(`${prefix} 1234567`), false)
  }
  assert.equal(limitReportPhoneInput("1700", "1"), "1")
  assert.equal(isCompleteReportPhone("0912 345 678"), true)
  assert.equal(isCompleteReportPhone("+84 912 345 678"), true)
  assert.equal(isCompleteReportPhone("+84 0912 345 678"), false)
  assert.equal(isCompleteReportPhone("0912 345"), false)
})
