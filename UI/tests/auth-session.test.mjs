import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import { createRequire } from "node:module"
import test from "node:test"
import ts from "typescript"
const require = createRequire(import.meta.url)
function storage() {
  const data = new Map()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  }
}
function load(file, dependencies = {}, sessionStorage) {
  const loaded = { exports: {} }
  const code = ts.transpileModule(
    fs.readFileSync(new URL(file, import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } }
  ).outputText
  vm.compileFunction(code, ["require", "module", "exports", "sessionStorage"])(
    (id) => dependencies[id] ?? require(id),
    loaded,
    loaded.exports,
    sessionStorage
  )
  return loaded.exports
}
function store(storage) {
  return load(
    "../src/store/auth.store.ts",
    { "@/lib/utils/jwtUtil": load("../src/lib/utils/jwtUtil.ts") },
    storage
  )
}
function token(exp) {
  return `header.${Buffer.from(JSON.stringify({ exp, role: "REGISTERED_USER" })).toString("base64url")}.signature`
}

test("tokens stay in memory and reload requires cookie refresh", async () => {
  const cache = storage()
  const first = store(cache)
  const accessToken = token(Date.now() / 1000 + 600)
  first.useAuthStore.getState().setToken(accessToken)
  first.useAuthStore.getState().setUser({
    userId: "21",
    email: "test@example.com",
    role: "REGISTERED_USER",
  })
  const reload = store(cache)
  assert.equal(reload.useAuthStore.getState().token, null)
  await reload.restoreAuthSession()
  assert.equal(reload.useAuthStore.getState().token, null)
  assert.equal(cache.getItem("scamshield-auth-session"), null)
  assert.equal(reload.useAuthStore.getState().user, null)
  reload.useAuthStore.getState().logout()
  const afterLogout = store(cache)
  await afterLogout.restoreAuthSession()
  assert.equal(afterLogout.useAuthStore.getState().token, null)
  assert.equal(afterLogout.useAuthStore.getState().user, null)
})
test("expired or invalid cached tokens are discarded so refresh is required", async () => {
  for (const accessToken of [token(1), "invalid", token(undefined)]) {
    const cache = storage()
    store(cache).useAuthStore.getState().setToken(accessToken)
    const reload = store(cache)
    reload.useAuthStore.getState().setToken(accessToken)
    await reload.restoreAuthSession()
    assert.equal(reload.useAuthStore.getState().token, null)
  }
})
test("storage unavailable still allows initialization for cookie refresh", async () => {
  const broken = {
    getItem() {
      throw new Error("Blocked")
    },
    setItem() {},
    removeItem() {},
  }
  const app = store(broken)
  await app.restoreAuthSession()
  assert.equal(app.useAuthStore.getState().token, null)
})
