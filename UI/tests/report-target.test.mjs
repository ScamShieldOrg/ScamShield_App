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
  const module = { exports: {} }
  vm.compileFunction(code, ["require", "module", "exports"])(
    (name) => dependencies[name],
    module,
    module.exports
  )
  return module.exports
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
