import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import test from "node:test"
import ts from "typescript"

const rawSource = fs.readFileSync(
  new URL("../src/features/check/services/check.service.ts", import.meta.url),
  "utf8"
)

// Strip direct imports from axios and internal modules for isolated mapping logic testing
const sanitized = rawSource
  .replace(/import\s+axios\s+from\s+["']axios["'];?/g, "const axios = {};")
  .replace(/import\s+\{\s*authorizeApi\s*\}\s+from\s+["'][^"']+["'];?/g, "const authorizeApi = {};")

const transpiled = ts.transpileModule(sanitized, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText

const moduleExports = {}
vm.compileFunction(transpiled, ["exports", "module", "require"])(moduleExports, { exports: moduleExports }, () => ({}))

test("mapBackendDtoToScanResponse maps confidence_level correctly from actual confidence", () => {
  const mapFn = moduleExports.mapBackendDtoToScanResponse

  const highConf = mapFn(
    { checkId: 1, decidedByStage: "VISOBERT", verdict: "SCAM_RISK", confidence: 0.92, inputType: "MESSAGE" },
    50,
    "MESSAGE",
    "Test msg"
  )
  assert.equal(highConf.verdict.confidence_level, "HIGH")

  const medConf = mapFn(
    { checkId: 2, decidedByStage: "LLM", verdict: "SCAM_RISK", confidence: 0.65, inputType: "MESSAGE" },
    120,
    "MESSAGE",
    "Test msg"
  )
  assert.equal(medConf.verdict.confidence_level, "MEDIUM")

  const lowConf = mapFn(
    { checkId: 3, decidedByStage: "LLM", verdict: "DANGEROUS", confidence: 0.52, inputType: "MESSAGE" },
    150,
    "MESSAGE",
    "Test msg"
  )
  assert.equal(lowConf.verdict.confidence_level, "LOW")
})

test("mapBackendDtoToScanResponse preserves council_deliberation and deterministic_features", () => {
  const mapFn = moduleExports.mapBackendDtoToScanResponse

  const deliberation = {
    cyber_banking_specialist: { stance: "SCAM", rationale: "Fake link", model_used: "gpt-6.1-sol" },
    psycho_teencode_specialist: { stance: "SCAM", rationale: "Urgency", model_used: "gemini-3.8-flash" },
    public_defender: { stance: "BENIGN", rationale: "Check", model_used: "gpt-6.1-sol" },
    consensus_ratio: "3/3 Chuyên gia AI đồng thuận",
  }

  const features = {
    url_analysis: { detected_urls: ["https://example.com"], is_in_official_whitelist: false },
  }

  const res = mapFn(
    {
      checkId: 10,
      inputType: "MESSAGE",
      decidedByStage: "LLM",
      verdict: "SCAM_RISK",
      confidence: 0.88,
      aiDetails: {
        tierExecuted: 2,
        councilDeliberation: deliberation,
        deterministicFeatures: features,
        verdict: { riskLevel: "SCAM_RISK", riskScore: 85, scamType: "Fake bank", confidence: 0.88, summary: "Scam" },
      },
    },
    200,
    "MESSAGE",
    "Tin nhắn lừa đảo"
  )

  assert.equal(res.tier_executed, 2)
  assert.equal(res.execution_provenance, "TIER2_FORENSIC_COUNCIL")
  assert.deepEqual(res.council_deliberation, deliberation)
  assert.deepEqual(res.deterministic_features, features)
})
