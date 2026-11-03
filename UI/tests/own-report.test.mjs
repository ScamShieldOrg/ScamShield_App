import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import test from "node:test"
import ts from "typescript"

const root = fileURLToPath(new URL("../", import.meta.url))
const require = createRequire(import.meta.url)
function service(api) {
  const filename = path.join(root, "src/features/report/services/report.service.ts")
  const module = { exports: {} }
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  vm.compileFunction(source, ["require", "module", "exports"], { filename })(id => {
    if (id === "@/lib/api/instance") return { authorizeApi: api }
    if (id === "@/features/report/utils/report-upload") return { validateReportFiles: () => null }
    return require(id)
  }, module, module.exports)
  return module.exports
}

test("detail uses owner endpoint without duplicating API prefix", async () => {
  const api = { get: async url => { assert.equal(url, "/user/reports/41"); return { data: { isSuccess: true, data: { rawId: 41, status: "PENDING" } } } } }
  assert.equal((await service(api).getOwnReport(41)).rawId, 41)
})

test("update preserves omitted evidence and explicitly forwards empty replacement", async () => {
  const calls = []
  const api = { put: async (url, payload) => { calls.push([url, payload]); return { data: { isSuccess: true, data: { rawId: 41 } } } } }
  const client = service(api)
  await client.updateOwnReport(41, { description: "Updated" })
  await client.updateOwnReport(41, { description: "Updated", evidences: [] })
  assert.equal(calls[0][0], "/user/reports/41")
  assert.equal(Object.hasOwn(calls[0][1], "evidences"), false)
  assert.equal(calls[1][1].evidences.length, 0)
})

test("withdraw sends DELETE and rejects unsuccessful envelope", async () => {
  const api = { delete: async url => { assert.equal(url, "/user/reports/41"); return { data: { isSuccess: false, message: "Không thể thu hồi" } } } }
  await assert.rejects(service(api).withdrawOwnReport(41), /Không thể thu hồi/)
})

test("conflict retains status for the UI to refresh and disable editing", async () => {
  const api = { put: async () => { throw { isAxiosError: true, response: { status: 409 } } } }
  const client = service(api)
  await assert.rejects(client.updateOwnReport(41, {}), error => error instanceof client.ReportActionError && error.status === 409)
})

test("status counters read isSuccess and preserve withdrawal counts", async () => {
  const api = { get: async () => ({ data: { isSuccess: true, data: { all: 5, withdrawn: 2 } } }) }
  assert.equal((await service(api).getReportStatusCounts()).withdrawn, 2)
})

test("website selection creates a URL indicator", async () => {
  const api = { post: async (url, body) => {
    assert.equal(url, "/reports")
    const payload = JSON.parse(await body.get("request").text())
    assert.equal(payload.threatType, "URL")
    return { data: { isSuccess: true, data: { id: 41 } } }
  } }
  await service(api).submitScamReport({ threatType: "WEBSITE", targetIdentifier: "https://example.test", category: "OTHER", description: "Mô tả", regionCode: "01", isConfirmed: true, attachments: [] })
})
