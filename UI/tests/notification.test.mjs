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
