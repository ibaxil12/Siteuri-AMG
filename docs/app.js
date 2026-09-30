const PAGE=30;
const KIND={anunt:"Anunț",pagina:"Pagină",document:"PDF"};
const $=id=>document.getElementById(id);
const fold=s=>(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ls={get:k=>{try{return localStorage.getItem(k)}catch{return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch{}}};
const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const today=()=>localDate(new Date());
const dateDaysAgo=n=>{const d=new Date();d.setDate(d.getDate()-n);return localDate(d)};
const safeDecode=u=>{try{return decodeURIComponent(u||"")}catch{return u||""}};

let DATA=[],cur=[],shown=PAGE;
let prog=ls.get("prog")||"both",type="",strict=ls.get("strict")==="1",onlyNew=false;
let seen=ls.get("seen")||dateDaysAgo(7);

const isNew=d=>!!d.date&&d.date>=seen&&(d.spec||d.type==="anunt");
const inProg=d=>prog==="both"||d.prog.includes(prog);
const tokens=()=>fold($("q").value).split(/\s+/).filter(Boolean);

function icon(name){
  const p={
    search:'<path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5Z"/><path d="M4 6.5v13M8 8h8"/>',
    award:'<circle cx="12" cy="8" r="5"/><path d="m8.5 12-2 9 5.5-3 5.5 3-2-9"/>',
    card:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
    briefcase:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/>',
    building:'<path d="M3 21h18M6 21V6l6-3 6 3v15M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1"/>',
    home:'<path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-6h6v6"/>',
    sliders:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>'
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p[name]||p.arrow}</svg>`;
}
document.querySelectorAll("[data-icon]").forEach(el=>el.innerHTML=icon(el.dataset.icon));

function hl(orig,toks){
  const f=fold(orig),ranges=[];
  for(const t of toks){let i=0;while((i=f.indexOf(t,i))!==-1){ranges.push([i,i+t.length]);i+=t.length}}
  ranges.sort((a,b)=>a[0]-b[0]);
  let out="",p=0;
  for(const[s,e]of ranges){if(e<=p)continue;const st=Math.max(s,p);out+=esc(orig.slice(p,st))+"<mark>"+esc(orig.slice(st,e))+"</mark>";p=e}
  return out+esc(orig.slice(p));
}
function snip(text,toks){
  if(!text)return"";
  const f=fold(text);let at=-1;
  for(const t of toks){const i=f.indexOf(t);if(i!==-1&&(at===-1||i<at))at=i}
  const st=at>80?at-80:0,part=text.slice(st,st+250);
  return(st>0?"… ":"")+hl(part,toks)+(st+250<text.length?" …":"");
}
function applyProgramTheme(){
  document.body.classList.toggle("theme-amg",prog==="AMG");
  document.body.classList.toggle("theme-td",prog==="TD");
}
function setProgram(v){
  prog=v;ls.set("prog",v);applyProgramTheme();
  document.querySelectorAll("[data-program]").forEach(b=>{
    const on=b.dataset.program===v;b.classList.toggle("on",on);b.setAttribute("aria-pressed",String(on));
  });
  run();renderNews();
}
function setType(v){
  type=v;
  document.querySelectorAll("[data-type]").forEach(b=>{
    const on=b.dataset.type===v;b.classList.toggle("on",on);b.setAttribute("aria-pressed",String(on));
  });
  run();
}
function saveUrl(){
  const p=new URLSearchParams();
  if($("q").value.trim())p.set("q",$("q").value.trim());
  if(type)p.set("tip",type);
  if($("src").value)p.set("site",$("src").value);
  history.replaceState(null,"",p.toString()?"?"+p:location.pathname);
}
function activeFilterCount(){
  const n=(type?1:0)+($("src").value?1:0)+(strict?1:0)+(onlyNew?1:0);
  $("filterCount").textContent=n;$("filterCount").classList.toggle("show",n>0);
}
function run(){
  if(!DATA.length)return;
  const toks=tokens(),src=$("src").value;
  $("clr").hidden=!$("q").value;
  cur=[];
  for(const d of DATA){
    if(!inProg(d)||strict&&!d.spec||onlyNew&&!isNew(d)||type&&d.type!==type||src&&d.source!==src)continue;
    let sc=d.spec?2:0;
    if(toks.length){
      let ok=true;
      for(const t of toks){const a=d._t.includes(t),b=d._b.includes(t);if(!a&&!b){ok=false;break}sc+=(a?5:0)+(b?1:0)}
      if(!ok)continue;
    }
    cur.push({d,sc});
  }
  const byDate=(a,b)=>(b.d.date||"").localeCompare(a.d.date||"");
  cur.sort(toks.length?(a,b)=>b.sc-a.sc||byDate(a,b):byDate);
  shown=PAGE;saveUrl();activeFilterCount();render(toks);
}
function render(toks){
  const n=cur.length;
  $("count").textContent=n?`${n} ${n===1?"rezultat":"rezultate"}${toks.length?"":", cele mai noi primele"}`:"Niciun rezultat";
  const box=$("results");
  if(!n){
    box.innerHTML=`<li class="empty">Nu am găsit rezultate pentru criteriile selectate.<br><button class="secondary-btn" type="button" id="resetSearch">Resetează filtrele</button></li>`;
    $("resetSearch").onclick=resetSearch;$("more").hidden=true;return;
  }
  box.innerHTML=cur.slice(0,shown).map(({d})=>{
    const dt=d.date?new Date(d.date+"T00:00:00"):null;
    const ds=dt?dt.toLocaleDateString("ro-RO",{day:"numeric",month:"short",year:"numeric"}):"";
    const tags=d.spec?d.prog.map(p=>`<span class="badge">${p}</span>`).join(""):"";
    const title=d.url?`<a class="result-title" href="${esc(d.url)}" target="_blank" rel="noopener">${hl(d.title,toks)}</a>`:`<span class="result-title">${hl(d.title,toks)}</span>`;
    return `<li class="result">${title}${d.text?`<p class="result-text">${snip(d.text,toks)}</p>`:""}
      <div class="result-meta"><span class="result-kind">${KIND[d.type]||""}</span>${tags}<span>${esc(d.source)}</span>${ds?`<span>${ds}</span>`:""}${isNew(d)?'<span class="new-tag">Nou</span>':""}</div></li>`;
  }).join("");
  $("more").hidden=shown>=n;
}
function renderNews(){
  if(!DATA.length)return;
  let items=DATA.filter(d=>inProg(d)&&isNew(d)).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const unseen=items.length;
  if(!items.length)items=DATA.filter(inProg).sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,4);
  else items=items.slice(0,4);
  $("newsCount").textContent=unseen;
  $("newsSummaryTitle").textContent=unseen?`${unseen} ${unseen===1?"noutate":"noutăți"}`:"Ești la zi";
  $("newsSummaryText").textContent=unseen?"de la ultima ta verificare":"Acestea sunt cele mai recente informații indexate.";
  $("markSeen").hidden=!unseen;
  $("newsList").innerHTML=items.map(d=>{
    const ds=d.date?new Date(d.date+"T00:00:00").toLocaleDateString("ro-RO",{day:"numeric",month:"short"}):"";
    return `<a class="news-item" href="${esc(d.url)}" target="_blank" rel="noopener"><h3>${esc(d.title)}</h3>
      <div class="news-meta">${d.spec?d.prog.map(p=>`<span class="badge">${p}</span>`).join(""):""}<span>${esc(d.source)}</span>${ds?`<span>${ds}</span>`:""}</div></a>`;
  }).join("")||'<div class="empty">Nu sunt încă informații indexate.</div>';
}
function resetSearch(){
  $("q").value="";$("src").value="";strict=false;onlyNew=false;ls.set("strict","0");setType("");
  $("strict").classList.remove("on");$("strict").setAttribute("aria-pressed","false");run();
}
function focusSearch(query="",kind=null){
  if(query!==null)$("q").value=query;
  if(kind!==null)setType(kind);else run();
  document.querySelector("#cauta").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
  setTimeout(()=>$("q").focus(),150);
}
function openDrawer(){
  $("drawer").classList.add("open");$("drawerBackdrop").classList.add("open");document.body.classList.add("drawer-open");
  $("menuBtn").setAttribute("aria-expanded","true");$("drawerClose").focus();
}
function closeDrawer(){
  $("drawer").classList.remove("open");$("drawerBackdrop").classList.remove("open");document.body.classList.remove("drawer-open");
  $("menuBtn").setAttribute("aria-expanded","false");
}

document.querySelectorAll("[data-program]").forEach(b=>b.onclick=()=>setProgram(b.dataset.program));
document.querySelectorAll("[data-type]").forEach(b=>b.onclick=()=>setType(b.dataset.type));
document.querySelectorAll("[data-action]").forEach(card=>card.addEventListener("click",e=>{
  if(card.tagName==="A")return;
  e.preventDefault();focusSearch(card.dataset.query||"",card.dataset.kind??null);
}));
let timer;
$("q").addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(run,120)});
$("clr").onclick=()=>{$("q").value="";run();$("q").focus()};
$("src").onchange=run;
$("strict").onclick=()=>{strict=!strict;ls.set("strict",strict?"1":"0");$("strict").classList.toggle("on",strict);$("strict").setAttribute("aria-pressed",String(strict));run()};
$("filterToggle").onclick=()=>{const p=$("filters");p.hidden=!p.hidden;$("filterToggle").setAttribute("aria-expanded",String(!p.hidden))};
$("more").onclick=()=>{shown+=PAGE;render(tokens())};
$("heroSearchBtn").onclick=()=>focusSearch($("heroQ").value,null);
$("heroQ").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();focusSearch($("heroQ").value,null)}});
$("markSeen").onclick=()=>{seen=today();ls.set("seen",seen);onlyNew=false;renderNews();run()};
$("showNewsOnly").onclick=()=>{onlyNew=true;$("filters").hidden=false;$("filterToggle").setAttribute("aria-expanded","true");run();document.querySelector("#cauta").scrollIntoView({behavior:"smooth"})};
$("menuBtn").onclick=openDrawer;$("bottomMenu").onclick=openDrawer;$("drawerClose").onclick=closeDrawer;$("drawerBackdrop").onclick=closeDrawer;
document.querySelectorAll("#drawer a").forEach(a=>a.addEventListener("click",closeDrawer));
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeDrawer();if(e.key==="/"&&![ "INPUT","SELECT","TEXTAREA"].includes(document.activeElement.tagName)){e.preventDefault();focusSearch("",null)}});
$("bottomSearch").onclick=()=>focusSearch($("q").value,null);
$("bottomNews").onclick=()=>document.querySelector("#noutati").scrollIntoView({behavior:"smooth"});
$("strict").classList.toggle("on",strict);$("strict").setAttribute("aria-pressed",String(strict));
applyProgramTheme();
document.querySelectorAll("[data-program]").forEach(b=>{const on=b.dataset.program===prog;b.classList.toggle("on",on);b.setAttribute("aria-pressed",String(on))});

if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});

const getJson=u=>fetch(u,{cache:"no-cache"}).then(async r=>{if(!r.ok)throw 0;return r.json()});
const getCompressedJson=async u=>{
  const r=await fetch(u,{cache:"no-cache"});if(!r.ok)throw 0;
  if(!("DecompressionStream" in window)||!r.body)throw 0;
  const text=await new Response(r.body.pipeThrough(new DecompressionStream("gzip"))).text();
  return JSON.parse(text);
};
const getData=()=>getCompressedJson("data.json.gz").catch(()=>getJson("data.json"));

Promise.all([getData(),getJson("manual.json").catch(()=>[])]).then(([j,man])=>{
  if(!j||!Array.isArray(j.items))throw new Error("Format invalid");
  const manual=(Array.isArray(man)?man:[]).filter(m=>m&&m.title).map(m=>({
    title:m.title,url:m.url||"",date:m.date||"",text:m.text||"",source:"Adăugat manual",type:"anunt",
    prog:m.prog&&m.prog.length?m.prog:["AMG","TD"],spec:true
  }));
  const auto=j.items.map(d=>({...d,prog:Array.isArray(d.prog)&&d.prog.length?d.prog:(d.amg?["AMG"]:["AMG","TD"]),spec:d.spec??!!d.amg}));
  DATA=[...manual,...auto].map(d=>({...d,_t:fold(d.title),_b:fold((d.text||"")+" "+safeDecode(d.url))}));
  $("src").innerHTML='<option value="">Toate sursele</option>'+[...new Set(DATA.map(d=>d.source))].filter(Boolean).sort().map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join("");
  const p=new URLSearchParams(location.search);
  $("q").value=p.get("q")||"";
  if(p.get("tip"))type=p.get("tip");
  if(p.get("site"))$("src").value=p.get("site");
  document.querySelectorAll("[data-type]").forEach(b=>{const on=b.dataset.type===type;b.classList.toggle("on",on);b.setAttribute("aria-pressed",String(on))});
  $("indexStatus").textContent=j.count?`${j.count} pagini indexate · actualizat ${new Date(j.updated).toLocaleDateString("ro-RO")}`:"Indexul este momentan gol.";
  renderNews();run();
}).catch(()=>{
  $("count").textContent="Nu am putut încărca indexul. Reîncearcă peste câteva momente.";
  $("indexStatus").textContent="Index indisponibil";
});
