const assert=require("node:assert/strict");
const {readFileSync,readdirSync,existsSync}=require("node:fs");
const {join}=require("node:path");
const {test}=require("node:test");
const docs="docs",htmlFiles=readdirSync(docs).filter(x=>x.endsWith(".html"));
test("HTML pages have unique IDs and valid local assets",()=>{
  for(const file of htmlFiles){
    const html=readFileSync(join(docs,file),"utf8"),ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);
    assert.equal(new Set(ids).size,ids.length,file+": duplicate id");
    for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){const ref=m[1];if(/^(?:https?:|mailto:|tel:|#|data:)/.test(ref))continue;const clean=ref.split(/[?#]/)[0];if(!clean||clean.endsWith("/"))continue;assert.ok(existsSync(join(docs,clean)),file+": missing local asset "+clean)}
  }
});
test("public pages include basic metadata",()=>{for(const file of htmlFiles.filter(x=>x!=="admin-feedback.html")){const html=readFileSync(join(docs,file),"utf8");assert.match(html,/<meta name="description"/,file+": missing description");assert.match(html,/rel="canonical"/,file+": missing canonical")}});
test("data index is structurally consistent",()=>{const data=JSON.parse(readFileSync("docs/data.json","utf8"));assert.ok(Array.isArray(data.items)&&data.items.length>0);assert.equal(data.count,data.items.length);assert.equal(new Set(data.items.map(x=>x.url)).size,data.items.length,"duplicate URLs in data index");assert.ok(data.updated)});
