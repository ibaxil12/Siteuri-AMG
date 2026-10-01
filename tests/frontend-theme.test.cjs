const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const vm=require("node:vm");
function context(){
 const storage=new Map();let dark=false,listener;
 const root={style:{},dataset:{}};
 const body={classList:{remove(){},add(){}}};
 const document={documentElement:root,body,getElementById(){return null},querySelector(){return null},querySelectorAll(){return []},addEventListener(){}};
 const window={addEventListener(){},matchMedia(){return {matches:dark,addEventListener(name,fn){listener=fn}}}};
 const ctx=vm.createContext({document,window,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},console,navigator:{}});
 vm.runInContext(readFileSync("docs/app.js","utf8"),ctx);
 return {ctx,root,storage,system(v){dark=v;listener()}};
}
test("all palettes persist independently of the display mode",()=>{
 const c=context();
 for(const palette of ["medical","ocean","emerald","lavender","sunset","graphite","contrast"]){
  c.storage.set("uiPalette",palette);
  for(const mode of ["light","dark","auto"]){
   vm.runInContext('setUiTheme('+JSON.stringify(mode)+')',c.ctx);
   assert.equal(c.root.dataset.palette,palette);
   assert.equal(c.root.dataset.theme,mode==="dark"?"dark":"light");
   assert.equal(c.storage.get("uiTheme"),mode);
  }
 }
});
test("automatic mode follows system changes; explicit mode stays selected",()=>{
 const c=context();vm.runInContext('setUiTheme("auto")',c.ctx);
 c.system(true);assert.equal(c.root.dataset.theme,"dark");
 c.system(false);assert.equal(c.root.dataset.theme,"light");
 vm.runInContext('setUiTheme("light")',c.ctx);c.system(true);assert.equal(c.root.dataset.theme,"light");
});
test("invalid saved settings use the default palette and automatic mode",()=>{
 const c=context();c.storage.set("uiTheme","invalid");c.storage.set("uiPalette","invalid");
 vm.runInContext("applyTheme()",c.ctx);
 assert.equal(c.root.dataset.palette,"medical");assert.equal(c.root.dataset.theme,"light");
});
