import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import test from "node:test"
import ts from "typescript"
const source = ts.transpileModule(
  fs.readFileSync(
    new URL("../src/lib/utils/phone.ts", import.meta.url),
    "utf8"
  ),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText
const exported = {}
vm.compileFunction(source, ["exports"])(exported)
for (const input of [
  "+84 912 345 678",
  "84912345678",
  "0084912345678",
  "0912 345 678",
]) {
  test(`normalize ${input} without losing digits`, () =>
    assert.equal(exported.normalizePhoneInput(input), "0912345678"))
}
test("format international number in domestic groups", () =>
  assert.equal(exported.formatPhoneInput("+84912345678"), "0912 345 678"))
