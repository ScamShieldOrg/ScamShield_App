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

for (const input of ["84912345678", "+84912345678", "0084912345678"]) {
  test(`typing ${input} character by character respects the registration length limit`, () => {
    let displayed = ""
    let normalized = ""
    for (const [index, character] of [...input].entries()) {
      assert.ok(
        displayed.length < 12,
        `Input blocked before character ${index + 1}`
      )
      normalized = exported.normalizePhoneInput(displayed + character)
      displayed = exported.formatPhoneInput(normalized)
      const prefixLength = input.startsWith("0084")
        ? 4
        : input.startsWith("+")
          ? 3
          : 2
      if (index === prefixLength - 1) assert.equal(normalized, "0")
    }
    assert.equal(normalized, "0912345678")
    assert.equal(displayed, "0912 345 678")
  })
}

test("recognizes the bare international prefix immediately", () => {
  assert.equal(exported.normalizePhoneInput("84"), "0")
  assert.equal(exported.normalizePhoneInput("+84"), "0")
})
