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
function load(file, api = {}, aliases = {}) {
  const filename = path.join(root, file)
  const module = { exports: {} }
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText
  vm.compileFunction(source, ["require", "module", "exports"], { filename })(id => aliases[id] ?? (id === "@/store/auth.store" ? { useAuthStore: { getState: () => ({ token: "test-token" }) } } : id === "@/lib/api/instance" ? { authorizeApi: api } : require(id)), module, module.exports)
  return module.exports
}
const serviceFile = "src/features/moderator/services/moderator-report.service.ts"
const policy = load("src/features/moderator/report-review.ts")

test("similarity percentages distinguish missing scores from zero", () => {
  const { similarityPercentage } = load("src/features/moderator/evidence-analysis.ts")
  assert.equal(similarityPercentage(0.84375), "84,4%")
  assert.equal(similarityPercentage(1), "100%")
  assert.equal(similarityPercentage(0), "0%")
  for (const score of [null, undefined, NaN, Infinity, -0.1, 1.1])
    assert.equal(similarityPercentage(score), "Chưa có dữ liệu")
})

test("evidence preview renders image and OCR scores independently", () => {
  const React = require("react")
  const { renderToStaticMarkup } = require("react-dom/server")
  const { ReportEvidencePreview } = load("src/components/features/moderator/report-evidence-preview.tsx", {}, {
    "@phosphor-icons/react": { ArrowSquareOut: () => null, Copy: () => null, FileText: () => null },
    "@/features/moderator/report-review": policy,
    "@/features/moderator/evidence-analysis": load("src/features/moderator/evidence-analysis.ts"),
    "@/features/moderator/services/moderator-report.service": {},
  })
  const html = renderToStaticMarkup(React.createElement(ReportEvidencePreview, { evidences: [{
    id: "ev-1", name: "proof.pdf", type: "PDF", analysisStatus: "PARTIAL",
    similarEvidenceCount: 1, similarEvidences: [{ evidenceId: 2, reportId: 3, sameReporter: false,
      matchTypes: ["PHASH", "OCR_TEXT"], imageSimilarity: 0.875, textSimilarity: 0.92 }],
  }] }))
  assert.match(html, /87,5%/)
  assert.match(html, /92%/)
  assert.match(html, /Phân tích chưa đầy đủ/)
  assert.match(html, /\/moderator\/reports\/3/)
  assert.doesNotMatch(html, /Chưa tìm thấy/)
})
test("review permissions use server capability without revealing moderator identities", () => {
  assert.equal(policy.ownsReportReview({ status: "In Review", canReview: true }), true)
  for (const item of [{ status: "Pending", canReview: true }, { status: "In Review", canReview: false }, { status: "In Review" }]) assert.equal(policy.ownsReportReview(item), false)
})

test("evidence URLs reject executable or malformed links", () => {
  for (const value of ["javascript:alert(1)", "data:text/html,test", "/local", undefined]) assert.equal(policy.safeEvidenceUrl(value), undefined)
  assert.equal(policy.safeEvidenceUrl("https://files.example/a.pdf"), "https://files.example/a.pdf")
})
test("decision sends only selected report and category; approve can omit note", async () => {
  const client = load(serviceFile, { put: async (url, body) => {
    assert.equal(url, "/moderator/reports/41")
    assert.equal(body.decision, "APPROVE"); assert.equal(body.reason, undefined); assert.equal(body.categoryId, 2)
    assert.equal(Object.hasOwn(body, "selectedTaxonomies"), false)
    return { data: { isSuccess: true, message: "Đã duyệt", data: { rawId: 41, status: "Approved" } } }
  } })
  assert.equal((await client.submitModerationDecision({ reportId: "CS-2026-0041", decision: "APPROVE", reason: "  ", categoryId: 2 })).data.status, "Approved")
})
test("API failures never fall back to mock reports", async () => {
  const client = load(serviceFile, { get: async () => ({ data: { isSuccess: false, message: "Không có quyền", data: null } }) })
  await assert.rejects(client.getModeratorReportById(41), /Không có quyền/)
  await assert.rejects(client.getModeratorReportQueue(), /Không có quyền/)
})
test("malformed report IDs cannot target another resource", () => {
  const client = load(serviceFile)
  for (const value of ["abc41", "41/../12", -1, 0, "9007199254740992"]) assert.throws(() => client.parseReportNumericId(value))
})

test("withdrawn status is normalized for Vietnamese labels and cannot be treated as pending", async () => {
  const client = load(serviceFile, { get: async () => ({ data: { success: true, data: { rawId: 41, status: "WITHDRAWN" } } }) })
  assert.equal((await client.getModeratorReportById(41)).status, "Withdrawn")
})

test("review detail enables only assigned owner while reviewing", () => {
  const React = require("react")
  const { renderToStaticMarkup } = require("react-dom/server")
  const { ReportQueueDetailView } = load("src/components/features/moderator/report-queue-detail-view.tsx", {}, {
    "@/features/moderator/report-review": policy,
    "@/store/auth.store": { useAuthStore: selector => selector({ user: { userId: "12" } }) },
    "./report-evidence-preview": { ReportEvidencePreview: () => null },
    "./report-decision-form": { ReportDecisionForm: () => React.createElement("p", {}, "DECISION_FORM") },
  })
  const item = { id: "CS-2026-0041", status: "In Review", canReview: true, whitelisted: true, whitelistMatches: [{ whitelistEntryId: 7, legalName: "Doanh nghiệp tin cậy" }], evidences: [] }
  const render = (value, reviewActive = true) => renderToStaticMarkup(React.createElement(ReportQueueDetailView, { item: value, reviewActive, onStartReview: async () => {}, onDecisionSubmitted: async () => {} }))
  assert.match(render(item), /DECISION_FORM/)
  assert.match(render(item), /Doanh nghiệp tin cậy/)
  assert.doesNotMatch(render({ ...item, canReview: false }), /DECISION_FORM/)
  assert.doesNotMatch(render({ ...item, status: "Pending" }), /DECISION_FORM/)
  assert.match(render({ ...item, status: "Pending" }, false), /Bắt đầu duyệt/)
  assert.doesNotMatch(render(item, false), /DECISION_FORM/)
  assert.match(render(item, false), /Bắt đầu duyệt/)
  assert.doesNotMatch(render({ ...item, status: "Approved" }), /DECISION_FORM/)
})



test("decision form only marks actual draft changes as dirty", () => {
  const React = require("react")
  const state = []
  let cursor = 0
  const changes = []
  const { ReportDecisionForm } = load("src/components/features/moderator/report-decision-form.tsx", {}, {
    "@phosphor-icons/react": { CheckCircle: () => null, XCircle: () => null, ShieldWarning: () => null },
    react: { ...React, useState: initial => {
      const index = cursor++
      if (!(index in state)) state[index] = initial
      return [state[index], value => { state[index] = value }]
    } },
  })
  const render = () => { cursor = 0; return ReportDecisionForm({ reportId: 41, selectedTaxonomies: [], onSubmit: async () => {}, onDirtyChange: dirty => changes.push(dirty) }) }
  const find = (node, predicate) => {
    if (!node || typeof node !== "object") return undefined
    if (predicate(node)) return node
    for (const child of React.Children.toArray(node.props?.children)) {
      const found = find(child, predicate)
      if (found) return found
    }
  }
  const textarea = () => find(render(), node => node.type === "textarea")
  render()
  assert.deepEqual(changes, [])
  textarea().props.onChange({ target: { value: "Ghi chú" } })
  assert.equal(changes.at(-1), true)
  textarea().props.onChange({ target: { value: "" } })
  assert.equal(changes.at(-1), false)
  const approve = find(render(), node => node.type === "button" && node.props.type === "button")
  approve.props.onClick()
  assert.equal(changes.at(-1), true)
  textarea().props.onChange({ target: { value: "" } })
  assert.equal(changes.at(-1), true)
})

test("opening a pending report persists IN_REVIEW without a session token", async () => {
  let calls = 0
  const client = load(serviceFile, { post: async url => {
    calls++
    assert.equal(url, "/moderator/reports/41/review")
    return { data: { isSuccess: true, data: { rawId: 41, status: "IN_REVIEW", canReview: true } } }
  } })
  assert.equal((await client.startModeratorReportReview(41)).status, "In Review")
  assert.equal(calls, 1)
})
