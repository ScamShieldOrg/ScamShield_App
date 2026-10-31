import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import vm from "node:vm"
import test from "node:test"
import ts from "typescript"

const root = fileURLToPath(new URL("../", import.meta.url))
const require = createRequire(import.meta.url)

// Exercise the actual TypeScript services with external API/Firebase boundaries
// replaced, without requiring a browser, SMS credits, or additional dependencies.
function loadTypeScript(relativePath, mocks = {}, cache = new Map()) {
  const filename = path.join(root, relativePath)
  if (cache.has(filename)) return cache.get(filename).exports
  const loadedModule = { exports: {} }
  cache.set(filename, loadedModule)
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText
  vm.compileFunction(source, ["require", "module", "exports"], { filename })(
    (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id]
      if (id.startsWith("@/")) {
        return loadTypeScript(`src/${id.slice(2)}.ts`, mocks, cache)
      }
      return require(id)
    },
    loadedModule,
    loadedModule.exports
  )
  return loadedModule.exports
}

const proof = "a".repeat(43)
const input = {
  idToken: "google-id-token",
  phoneNumber: "0912345678",
  phoneOtp: "123456",
  agreeTerms: true,
  receiveAlerts: false,
}
const jwt = `header.${Buffer.from(
  JSON.stringify({
    id: 42,
    email: "tester@example.com",
    role: "REGISTERED_USER",
  })
).toString("base64url")}.signature`

function createHarness(overrides = {}) {
  const requests = []
  const session = {
    token: null,
    user: null,
    setToken(token) {
      this.token = token
    },
    setUser(user) {
      this.user = user
    },
  }
  const replies = {
    "/auth/send-phone-otp": { isSuccess: true },
    "/auth/verify-contacts": {
      isSuccess: true,
      data: {
        verificationToken: proof,
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
      },
    },
    "/auth/register/google": { isSuccess: true, data: { accessToken: jwt } },
    ...overrides,
  }
  const auth = loadTypeScript("src/features/auth/services/auth-services.ts", {
    "@/lib/api/instance": {
      publicApi: {
        async post(url, body) {
          requests.push({ url, body })
          const reply = replies[url]
          if (reply instanceof Error) throw reply
          return {
            data: typeof reply === "function" ? await reply(body) : reply,
          }
        },
      },
    },
    "@/store/auth.store": { useAuthStore: { getState: () => session } },
  }).authServices
  let captcha = async () => "real-recaptcha-token"
  const workflow = loadTypeScript(
    "src/features/auth/services/google-registration.service.ts",
    {
      "@/features/auth/services/auth-services": { authServices: auth },
      "@/lib/firebase/recaptcha": {
        getRecaptchaToken: (...args) => captcha(...args),
      },
    }
  )
  return {
    auth,
    workflow,
    requests,
    session,
    replies,
    setCaptcha: (fn) => {
      captcha = fn
    },
  }
}

test("reCAPTCHA failure stops before requesting an SMS", async () => {
  const h = createHarness()
  h.setCaptcha(async () => {
    throw new Error("Xác thực bảo mật thất bại")
  })
  await assert.rejects(
    h.workflow.sendGoogleRegistrationOtp(input.phoneNumber, "captcha"),
    /Xác thực bảo mật/
  )
  assert.equal(h.requests.length, 0)
})

test("SMS request uses the real reCAPTCHA token", async () => {
  const h = createHarness()
  await h.workflow.sendGoogleRegistrationOtp(input.phoneNumber, "captcha")
  assert.equal(h.requests[0].body.get("recaptchaToken"), "real-recaptcha-token")
  assert.equal(h.requests[0].body.get("phoneNumber"), input.phoneNumber)
})

test("an unsuccessful SMS response is not treated as a sent OTP", async () => {
  const h = createHarness({
    "/auth/send-phone-otp": {
      isSuccess: false,
      message: "Không thể gửi mã OTP",
    },
  })
  await assert.rejects(
    h.workflow.sendGoogleRegistrationOtp(input.phoneNumber, "captcha"),
    /Không thể gửi/
  )
})

test("incorrect OTP stops registration and does not create a session", async () => {
  const h = createHarness({
    "/auth/verify-contacts": {
      isSuccess: false,
      message: "Mã OTP không đúng hoặc đã hết hạn",
    },
  })
  await assert.rejects(
    h.workflow.registerGoogleWithPhoneVerification(input, null, () =>
      assert.fail("Must not verify")
    ),
    /Mã OTP không đúng/
  )
  assert.deepEqual(
    h.requests.map((r) => r.url),
    ["/auth/verify-contacts"]
  )
  assert.equal(h.session.token, null)
})

test("network failure during OTP verification does not fall back to registration", async () => {
  const h = createHarness({
    "/auth/verify-contacts": new Error("Network Error"),
  })
  await assert.rejects(
    h.workflow.registerGoogleWithPhoneVerification(input, null, () => {}),
    /Xác thực OTP thất bại/
  )
  assert.equal(h.requests.length, 1)
})

test("malformed verification response stops registration", async () => {
  const h = createHarness({
    "/auth/verify-contacts": {
      isSuccess: true,
      data: { verificationToken: "", expiresAt: "invalid" },
    },
  })
  await assert.rejects(
    h.workflow.registerGoogleWithPhoneVerification(input, null, () => {}),
    /mã xác nhận điện thoại hợp lệ/
  )
  assert.equal(h.requests.length, 1)
})

test("valid OTP registers with verificationToken only and initializes the user session", async () => {
  const h = createHarness()
  let verified
  await h.workflow.registerGoogleWithPhoneVerification(input, null, (value) => {
    verified = value
  })
  assert.deepEqual(
    h.requests.map((r) => r.url),
    ["/auth/verify-contacts", "/auth/register/google"]
  )
  assert.equal(verified.verificationToken, proof)
  assert.deepEqual(h.requests[1].body, {
    idToken: input.idToken,
    phoneNumber: input.phoneNumber,
    verificationToken: proof,
    agreeTerms: true,
    receiveAlerts: false,
  })
  assert.equal(h.session.token, jwt)
  assert.deepEqual(h.session.user, {
    userId: "42",
    email: "tester@example.com",
    role: "REGISTERED_USER",
  })
})

test("retry after registration failure reuses an unexpired proof instead of consuming OTP twice", async () => {
  const h = createHarness({
    "/auth/register/google": new Error("Máy chủ tạm thời không khả dụng"),
  })
  let verified
  await assert.rejects(
    h.workflow.registerGoogleWithPhoneVerification(input, null, (value) => {
      verified = value
    })
  )
  assert.equal(h.session.token, null)
  h.replies["/auth/register/google"] = {
    isSuccess: true,
    data: { accessToken: jwt },
  }
  await h.workflow.registerGoogleWithPhoneVerification(input, verified, () =>
    assert.fail("OTP was already verified")
  )
  assert.equal(
    h.requests.filter((r) => r.url === "/auth/verify-contacts").length,
    1
  )
  assert.equal(h.session.token, jwt)
})

test("expired cached proof requires a new OTP without retrying the consumed code", async () => {
  const h = createHarness()
  await assert.rejects(
    h.workflow.registerGoogleWithPhoneVerification(
      input,
      {
        phoneNumber: input.phoneNumber,
        verificationToken: proof,
        expiresAt: Date.now() - 1,
      },
      () => {}
    ),
    /hết hạn/
  )
  assert.equal(h.requests.length, 0)
})

test("a proof for another phone cannot verify a changed phone number", () => {
  const h = createHarness()
  assert.equal(
    h.workflow.isPhoneVerificationCurrent(
      {
        phoneNumber: "0987654321",
        verificationToken: proof,
        expiresAt: Date.now() + 300_000,
      },
      input.phoneNumber
    ),
    false
  )
})

test("Vietnam LocalDateTime expiresAt is parsed independently of browser timezone", async () => {
  const h = createHarness()
  const expected = Date.now() + 300_000
  h.replies["/auth/verify-contacts"].data.expiresAt = new Date(
    expected + 7 * 3600_000
  )
    .toISOString()
    .replace("Z", "")
  let verified
  await h.workflow.registerGoogleWithPhoneVerification(input, null, (value) => {
    verified = value
  })
  assert.equal(verified.expiresAt, expected)
})

test("expired or invalid server expiration stops registration", async () => {
  for (const expiresAt of ["invalid", "2000-01-01T00:00:00"]) {
    const h = createHarness()
    h.replies["/auth/verify-contacts"].data.expiresAt = expiresAt
    await assert.rejects(
      h.workflow.registerGoogleWithPhoneVerification(input, null, () => {}),
      /hết hạn hoặc không hợp lệ/
    )
    assert.equal(h.requests.length, 1)
  }
})

test("a closed registration session stops after OTP verification", async () => {
  const h = createHarness()
  await assert.rejects(
    h.workflow.registerGoogleWithPhoneVerification(input, null, () => {
      throw new Error("Phiên đăng ký đã đóng")
    }),
    /đã đóng/
  )
  assert.equal(h.requests.length, 1)
})

test("failed or malformed registration response never sets an authenticated session", async () => {
  for (const reply of [
    { isSuccess: false, message: "Email đã được sử dụng" },
    { isSuccess: true, data: {} },
    { isSuccess: true, data: { accessToken: "invalid" } },
  ]) {
    const h = createHarness({ "/auth/register/google": reply })
    await assert.rejects(
      h.workflow.registerGoogleWithPhoneVerification(input, null, () => {})
    )
    assert.equal(h.session.token, null)
    assert.equal(h.session.user, null)
  }
})

test("registration rejects a missing verification token before calling the API", async () => {
  const h = createHarness()
  await assert.rejects(
    h.auth.registerGoogle({ ...input, verificationToken: "" }),
    /xác thực số điện thoại/
  )
  assert.equal(h.requests.length, 0)
})

function mockRecaptcha(t, behavior) {
  const keys = ["API_KEY", "AUTH_DOMAIN", "PROJECT_ID", "APP_ID"]
  for (const key of keys) {
    const name = `NEXT_PUBLIC_FIREBASE_${key}`
    const previous = process.env[name]
    process.env[name] = "test-config"
    t.after(() => {
      if (previous === undefined) delete process.env[name]
      else process.env[name] = previous
    })
  }
  let removed = 0
  let cleared = 0
  const previousDocument = globalThis.document
  globalThis.document = {
    getElementById: () => ({ appendChild() {}, isConnected: true }),
    createElement: () => ({
      remove: () => {
        removed++
      },
    }),
  }
  t.after(() => {
    if (previousDocument === undefined) delete globalThis.document
    else globalThis.document = previousDocument
  })
  const recaptchaModule = loadTypeScript("src/lib/firebase/recaptcha.ts", {
    "firebase/app": { getApps: () => [{}], getApp: () => ({}) },
    "firebase/auth": {
      getAuth: () => ({}),
      RecaptchaVerifier: class {
        constructor() {
          if (behavior === "constructor-error") throw new Error("SDK error")
        }
        async verify() {
          if (behavior instanceof Error) throw behavior
          return behavior
        }
        clear() {
          cleared++
        }
      },
    },
  })
  return { ...recaptchaModule, counts: () => ({ removed, cleared }) }
}

test("reCAPTCHA construction failure cleans up the DOM and returns a Vietnamese error", async (t) => {
  const h = mockRecaptcha(t, "constructor-error")
  await assert.rejects(
    h.getRecaptchaToken("captcha"),
    /Xác thực bảo mật chưa hoàn tất/
  )
  assert.deepEqual(h.counts(), { removed: 1, cleared: 0 })
})

test("reCAPTCHA network failure is translated and releases the verifier", async (t) => {
  const error = Object.assign(new Error("Firebase network error"), {
    code: "auth/network-request-failed",
  })
  const h = mockRecaptcha(t, error)
  await assert.rejects(h.getRecaptchaToken("captcha"), /kiểm tra mạng/)
  assert.deepEqual(h.counts(), { removed: 1, cleared: 1 })
})

test("an empty reCAPTCHA token fails instead of being sent to the backend", async (t) => {
  const h = mockRecaptcha(t, "")
  await assert.rejects(
    h.getRecaptchaToken("captcha"),
    /Xác thực bảo mật chưa hoàn tất/
  )
  assert.deepEqual(h.counts(), { removed: 1, cleared: 1 })
})

test("successful reCAPTCHA returns its token and releases resources", async (t) => {
  const h = mockRecaptcha(t, "actual-token")
  assert.equal(await h.getRecaptchaToken("captcha"), "actual-token")
  assert.deepEqual(h.counts(), { removed: 1, cleared: 1 })
})

test("missing Firebase configuration fails before creating a verifier", async (t) => {
  const h = mockRecaptcha(t, "actual-token")
  delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  await assert.rejects(
    h.getRecaptchaToken("captcha"),
    /chưa được cấu hình đầy đủ/
  )
  assert.deepEqual(h.counts(), { removed: 0, cleared: 0 })
})
