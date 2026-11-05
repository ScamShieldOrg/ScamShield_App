import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import test from "node:test"
import ts from "typescript"
function client(api) {
 const module = { exports: {} }
 const code = ts.transpileModule(fs.readFileSync(new URL("../src/features/notification/services/notification.service.ts", import.meta.url), "utf8"), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
 vm.compileFunction(code,["require","module","exports"])(()=>({authorizeApi:api}), module,module.exports)
 return module.exports
}
test("notifications use single API prefix and isSuccess envelope",async()=>{
 const service=client({get:async url=>{assert.equal(url,"/notifications");return {data:{isSuccess:true,data:{notifications:{data:[{id:1,title:"Đã phê duyệt",type:"REPORT",isRead:false}]},tabCounts:{all:1,report:1,unread:1}}}}}})
 const result=await service.getNotifications();assert.equal(result.items.length,1);assert.equal(result.tabCounts.report,1)
})
test("notification load errors are not converted into empty lists",async()=>{
 await assert.rejects(client({get:async()=>{throw new Error("offline")}}).getNotifications(),/offline/)
})
test("mark read respects unsuccessful envelope",async()=>{
 assert.equal(await client({patch:async url=>{assert.equal(url,"/notifications/1/read");return {status:200,data:{isSuccess:false}}}}).markNotificationAsRead(1),false)
})

test("realtime stream uses authenticated API and handles fragmented events, ignoring heartbeats", async () => {
 const encoder = new TextEncoder()
 const chunks = ["event:notifi", "cations-changed\r\ndata:{}\r\n\r\n", "event:heartbeat\ndata:{}\n\nevent: notifications-changed\ndata:{}\n\n"]
 let updates=0
 const controller = new AbortController()
 const service=client({get:async (url, options)=>{
   assert.equal(url,"/notifications/stream"); assert.equal(options.adapter,"fetch"); assert.equal(options.timeout,0)
   assert.equal(options.signal, controller.signal)
   return {data:new ReadableStream({ start(stream) { chunks.forEach(chunk=>stream.enqueue(encoder.encode(chunk))); stream.close() } })}
 }})
 await service.listenForNotificationChanges(controller.signal, ()=>updates++)
 assert.equal(updates,2)
})
