import assert from "node:assert/strict"
import fs from "node:fs"
import http from "node:http"
import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import vm from "node:vm"
import test from "node:test"
import axios from "axios"
import ts from "typescript"

const root = fileURLToPath(new URL("../", import.meta.url))
const require = createRequire(import.meta.url)

function loadTypeScript(relativePath, mocks = {}) {
  const filename = path.join(root, relativePath)
  const loaded = { exports: {} }
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText
  vm.compileFunction(source, ["require", "module", "exports"], { filename })(
    (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id]
      if (id.startsWith("@/"))
        return loadTypeScript(`src/${id.slice(2)}.ts`, mocks)
      return require(id)
    },
    loaded,
    loaded.exports
  )
  return loaded.exports
}

const upload = loadTypeScript("src/features/report/utils/report-upload.ts")
const image = () =>
  new File(
    [
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP1sAAAAASUVORK5CYII=",
        "base64"
      ),
    ],
    "ảnh-minh-chứng.png",
    { type: "image/png" }
  )
const pdf = () =>
  new File(["%PDF-1.4\nEvidence fixture\n%%EOF"], "bien-lai.pdf", {
    type: "application/pdf",
  })
const payload = (attachments = [image()]) => ({
  threatType: "PHONE",
  targetIdentifier: " 0912345678 ",
  category: "Mạo danh ngân hàng",
  description: " Gửi SMS yêu cầu cung cấp mã OTP. ",
  isConfirmed: true,
  attachments,
})
const success = {
  isSuccess: true,
  message: "Đã lưu báo cáo",
  data: {
    id: 42,
    reportCode: "#RPT-0042",
    evidenceCount: 2,
    rewardPoints: 50,
  },
}

function createHarness(reply = success) {
  const requests = []
  const service = loadTypeScript(
    "src/features/report/services/report.service.ts",
    {
      "@/lib/api/instance": {
        authorizeApi: {
          async post(url, body, config) {
            requests.push({ url, body, config })
            if (reply instanceof Error) throw reply
            return { data: reply }
          },
          async get(url) {
            requests.push({ url })
            return { data: reply }
          },
        },
      },
    }
  )
  return { ...service, requests }
}

test("accept PNG, JPEG and PDF, including uppercase extensions and missing MIME metadata", () => {
  assert.equal(
    upload.validateReportFiles([
      image(),
      pdf(),
      new File(["jpeg"], "receipt.JPG", { type: "image/jpeg" }),
      new File(["data"], "receipt.pdf"),
    ]),
    null
  )
})

test("reject unsupported files and misleading extensions", () => {
  for (const file of [
    new File(["<svg/>"], "image.svg", { type: "image/svg+xml" }),
    new File(["script"], "image.png.exe"),
    new File(["pdf"], "image.png", { type: "application/pdf" }),
  ])
    assert.match(upload.validateReportFiles([file]), /không được hỗ trợ/)
})

test("reject empty files", () => {
  assert.match(
    upload.validateReportFiles([
      new File([], "empty.pdf", { type: "application/pdf" }),
    ]),
    /đang trống/
  )
})

test("accept a 5 MB file and reject larger files", () => {
  const size = 5 * 1024 * 1024
  assert.equal(upload.MAX_REPORT_FILE_BYTES, size)
  assert.equal(
    upload.validateReportFiles([
      new File([new Uint8Array(size)], "ok.pdf", { type: "application/pdf" }),
    ]),
    null
  )
  assert.match(
    upload.validateReportFiles([
      new File([new Uint8Array(size + 1)], "large.pdf", {
        type: "application/pdf",
      }),
    ]),
    /vượt quá 5 MB/
  )
})

test("require evidence and enforce the five-file limit", () => {
  assert.match(upload.validateReportFiles([]), /ít nhất một tệp minh chứng/)
  assert.equal(
    upload.validateReportFiles(Array.from({ length: 5 }, image)),
    null
  )
  assert.match(
    upload.validateReportFiles(Array.from({ length: 6 }, image)),
    /tối đa 5 tệp/
  )
})

test("send JSON metadata and original file bytes in separate multipart parts", async () => {
  const files = [image(), pdf()]
  const h = createHarness()
  const result = await h.submitScamReport(payload(files))
  const { url, body, config } = h.requests[0]
  assert.equal(url, "/reports")
  assert.ok(body instanceof FormData)
  const request = body.get("request")
  assert.equal(request.type, "application/json")
  assert.deepEqual(JSON.parse(await request.text()), {
    threatType: "PHONE",
    targetIdentifier: "0912345678",
    category: "Mạo danh ngân hàng",
    description: "Gửi SMS yêu cầu cung cấp mã OTP.",
    isConfirmed: true,
  })
  const sent = body.getAll("files")
  assert.equal(sent.length, 2)
  for (let i = 0; i < sent.length; i++) {
    assert.equal(sent[i].name, files[i].name)
    assert.equal(sent[i].type, files[i].type)
    assert.deepEqual(await sent[i].arrayBuffer(), await files[i].arrayBuffer())
  }
  assert.equal(config.headers["Content-Type"], undefined)
  assert.equal(config.timeout, 120_000)
  assert.equal(result.reportId, "#RPT-0042")
  assert.equal(result.evidenceCount, 2)
})

test("preserve optional pasted message separately from the report description", async () => {
  const h = createHarness()
  const reportedMessage = "  Tin nhắn gốc:\n" + "Chuyển tiền ngay. ".repeat(30)
  await h.submitScamReport({ ...payload(), reportedMessage })
  const request = JSON.parse(await h.requests[0].body.get("request").text())
  assert.equal(request.reportedMessage, reportedMessage)
  assert.equal(request.description, "Gửi SMS yêu cầu cung cấp mã OTP.")
})

test("omit the optional message when absent, empty or whitespace only", async () => {
  for (const reportedMessage of [undefined, "", " \n\t "]) {
    const h = createHarness()
    await h.submitScamReport({ ...payload(), reportedMessage })
    const request = JSON.parse(await h.requests[0].body.get("request").text())
    assert.equal(Object.hasOwn(request, "reportedMessage"), false)
    assert.equal(request.description, "Gửi SMS yêu cầu cung cấp mã OTP.")
  }
})

test("a report without evidence is rejected before contacting the backend", async () => {
  const h = createHarness()
  await assert.rejects(
    h.submitScamReport(payload([])),
    /ít nhất một tệp minh chứng/
  )
  assert.equal(h.requests.length, 0)
})

test("invalid attachments stop before contacting the backend", async () => {
  const h = createHarness()
  await assert.rejects(
    h.submitScamReport(payload([new File(["exe"], "malware.exe")])),
    /không được hỗ trợ/
  )
  assert.equal(h.requests.length, 0)
})

test("unsuccessful and malformed responses never report a successful submission", async () => {
  for (const reply of [
    { isSuccess: false, message: "Không thể lưu báo cáo" },
    { isSuccess: true, data: {} },
  ]) {
    const h = createHarness(reply)
    await assert.rejects(h.submitScamReport(payload([image()])))
  }
})

test("translate upload, authentication and storage failures into Vietnamese", async () => {
  for (const [status, expected] of [
    [413, /Dung lượng/],
    [401, /đăng nhập/],
    [503, /Máy chủ/],
  ]) {
    const error = Object.assign(new Error("Request failed"), {
      isAxiosError: true,
      response: { status, data: {} },
    })
    const h = createHarness(error)
    await assert.rejects(h.submitScamReport(payload([image()])), expected)
  }
})

test("display the backend self-report error without replacing it with a generic message", async () => {
  const message = "Không thể tự báo cáo chính mình."
  const error = Object.assign(
    new Error("Request failed with status code 400"),
    {
      isAxiosError: true,
      response: { status: 400, data: { isSuccess: false, message } },
    }
  )
  const h = createHarness(error)
  await assert.rejects(h.submitScamReport(payload([image()])), { message })
})

test("timeouts and network failures explain checking existing reports before retrying", async () => {
  for (const code of ["ECONNABORTED", "ERR_NETWORK"]) {
    const error = Object.assign(new Error("Request failed"), {
      isAxiosError: true,
      code,
    })
    const h = createHarness(error)
    await assert.rejects(
      h.submitScamReport(payload([image()])),
      /Báo cáo của tôi trước khi gửi lại/
    )
  }
})

test("surface progress safely and do not treat 100 percent upload as submission success", async () => {
  const h = createHarness()
  const progress = []
  await h.submitScamReport(payload([image()]), (value) => progress.push(value))
  const { onUploadProgress } = h.requests[0].config
  onUploadProgress({ loaded: 25, total: 100 })
  onUploadProgress({ loaded: 120, total: 100 })
  onUploadProgress({ loaded: 50 })
  assert.deepEqual(progress, [25, 100])
})

test("recent reports use the configured API prefix once and the backend success field", async () => {
  const h = createHarness({
    isSuccess: true,
    data: [
      {
        id: 42,
        targetIdentifier: "0912345678",
        evidenceCount: 2,
        status: "PENDING",
      },
    ],
  })
  const reports = await h.getMyReports()
  assert.equal(h.requests[0].url, "/reports/my-reports")
  assert.equal(reports[0].evidenceCount, 2)
})

test("actual Axios transport sends a valid multipart boundary, auth header and binary bytes", async (t) => {
  let received
  const server = http.createServer(async (request, response) => {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    received = {
      url: request.url,
      headers: request.headers,
      body: Buffer.concat(chunks),
    }
    response.writeHead(201, { "Content-Type": "application/json" })
    response.end(JSON.stringify(success))
  })
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  t.after(() => {
    server.closeAllConnections()
    return new Promise((resolve) => server.close(resolve))
  })
  const client = axios.create({
    baseURL: `http://127.0.0.1:${server.address().port}/api`,
    proxy: false,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer test-token",
    },
  })
  const service = loadTypeScript(
    "src/features/report/services/report.service.ts",
    {
      "@/lib/api/instance": { authorizeApi: client },
    }
  )
  const file = image()
  await service.submitScamReport(payload([file, pdf()]))
  assert.equal(received.url, "/api/reports")
  assert.equal(received.headers.authorization, "Bearer test-token")
  assert.match(
    received.headers["content-type"],
    /^multipart\/form-data; boundary=/
  )
  assert.ok(received.body.includes(Buffer.from('name="request"')))
  assert.ok(
    received.body.includes(Buffer.from("Content-Type: application/json"))
  )
  assert.ok(received.body.includes(Buffer.from('name="files"')))
  assert.ok(received.body.includes(Buffer.from(await file.arrayBuffer())))
  assert.ok(received.body.includes(Buffer.from("%PDF-1.4")))
})
