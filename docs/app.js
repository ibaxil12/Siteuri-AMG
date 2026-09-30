const PAGE_SIZE=30;
const KIND={anunt:"Anunț",pagina:"Pagină",document:"PDF"};
const $=id=>document.getElementById(id);
const fold=s=>(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeDecode=u=>{try{return decodeURIComponent(u||"")}catch{return u||""}};
const ls={get:k=>{try{return localStorage.getItem(k)}catch{return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch{}}};
const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const dateDaysAgo=n=>{const d=new Date();d.setDate(d.getDate()-n);return localDate(d)};

let DATA=[];
let program=ls.get("prog")||"both";
let shown=PAGE_SIZE;

const PAGES=[
  ["home","index.html","Acasă"],
  ["anunturi","anunturi.html","Anunțuri"],
  ["cautare","cautare.html","Căutare"],
  ["documente","documente.html","Documente"],
  ["utile","utile.html","Utile"],
  ["linkuri","linkuri.html","Linkuri"],
  ["feedback","feedback.html","Feedback"]
];

const iconPaths={
  home:'<path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-6h6v6"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  search:'<path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
  book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5Z"/><path d="M4 6.5v13M8 8h8"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  message:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  award:'<circle cx="12" cy="8" r="5"/><path d="m8.5 12-2 9 5.5-3 5.5 3-2-9"/>',
  card:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  briefcase:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/>',
  building:'<path d="M3 21h18M6 21V6l6-3 6 3v15M9 9h1M14 9h1M9 13h1M14 13h1"/>'
};
function svg(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||iconPaths.arrow}</svg>`}

function currentPage(){return document.body.dataset.page||"home"}
function applyTheme(){
  document.body.classList.toggle("theme-amg",program==="AMG");
  document.body.classList.toggle("theme-td",program==="TD");
}
function setProgram(v){
  program=v;ls.set("prog",v);applyTheme();
  document.querySelectorAll("[data-program]").forEach(b=>{
    const on=b.dataset.program===v;b.classList.toggle("on",on);b.setAttribute("aria-pressed",String(on));
  });
  document.dispatchEvent(new CustomEvent("programchange"));
}
function renderShell(){
  const page=currentPage();
  const nav=PAGES.map(([id,url,label])=>`<a href="${url}"${page===id?' class="active" aria-current="page"':""}>${label}</a>`).join("");
  $("siteHeader").innerHTML=`<header class="site-header"><div class="shell header-row">
    <a class="brand" href="index.html" aria-label="AMG și Tehnică Dentară, pagina principală"><span class="brand-mark">A+</span><span>AMG · Tehnică Dentară</span></a>
    <nav class="desktop-nav" aria-label="Navigație principală">${nav}</nav>
    <div class="header-program" role="group" aria-label="Program de studiu">
      <button type="button" data-program="AMG">AMG</button><button type="button" data-program="TD">TD</button><button type="button" data-program="both">Ambele</button>
    </div>
    <button class="menu-btn" id="menuBtn" type="button" aria-label="Deschide meniul" aria-expanded="false">${svg("menu")}</button>
  </div></header>`;

  $("siteFooter").innerHTML=`<footer class="footer"><div class="shell footer-row">
    <span>Proiect studențesc, neoficial. Verifică informația pe site-ul sursă.</span>
    <a href="feedback.html">Feedback & buguri</a>
  </div></footer>`;

  $("mobileNav").innerHTML=`<nav class="bottom-nav" aria-label="Navigație mobilă">
    <a href="index.html"${page==="home"?' class="active"':""}>${svg("home")}<span>Acasă</span></a>
    <a href="anunturi.html"${page==="anunturi"?' class="active"':""}>${svg("bell")}<span>Anunțuri</span></a>
    <a href="cautare.html"${page==="cautare"?' class="active"':""}>${svg("search")}<span>Caută</span></a>
    <button id="bottomMenu" type="button">${svg("menu")}<span>Meniu</span></button>
  </nav>`;

  $("drawerRoot").innerHTML=`<div class="drawer-backdrop" id="drawerBackdrop"></div>
  <aside class="drawer" id="drawer" aria-label="Meniu mobil"><div class="drawer-head"><strong>Meniu</strong><button class="drawer-close" id="drawerClose" type="button" aria-label="Închide meniul">✕</button></div>
  <nav>${nav}<a href="https://schedule.ulbsibiu.ro/" target="_blank" rel="noopener">Orare ULBS ↗</a></nav></aside>`;

  document.querySelectorAll("[data-program]").forEach(b=>b.onclick=()=>setProgram(b.dataset.program));
  setProgram(program);
  const open=()=>{$("drawer").classList.add("open");$("drawerBackdrop").classList.add("open");document.body.classList.add("drawer-open");$("menuBtn").setAttribute("aria-expanded","true")};
  const close=()=>{$("drawer").classList.remove("open");$("drawerBackdrop").classList.remove("open");document.body.classList.remove("drawer-open");$("menuBtn").setAttribute("aria-expanded","false")};
  $("menuBtn").onclick=open;$("bottomMenu").onclick=open;$("drawerClose").onclick=close;$("drawerBackdrop").onclick=close;
  document.querySelectorAll("#drawer a").forEach(a=>a.addEventListener("click",close));
  document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
}

const getJson=u=>fetch(u,{cache:"no-cache"}).then(async r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.json()});
const getCompressedJson=async u=>{
  const r=await fetch(u,{cache:"no-cache"});if(!r.ok)throw new Error("HTTP "+r.status);
  if(!("DecompressionStream" in window)||!r.body)throw new Error("gzip unsupported");
  return JSON.parse(await new Response(r.body.pipeThrough(new DecompressionStream("gzip"))).text());
};
async function loadData(){
  if(DATA.length)return DATA;
  const [j,man]=await Promise.all([getCompressedJson("data.json.gz").catch(()=>getJson("data.json")),getJson("manual.json").catch(()=>[])]);
  if(!j||!Array.isArray(j.items))throw new Error("Format invalid");
  const manual=(Array.isArray(man)?man:[]).filter(m=>m&&m.title).map(m=>({title:m.title,url:m.url||"",date:m.date||"",text:m.text||"",source:"Adăugat manual",type:"anunt",prog:m.prog?.length?m.prog:["AMG","TD"],spec:true}));
  const auto=j.items.map(d=>({...d,prog:Array.isArray(d.prog)&&d.prog.length?d.prog:(d.amg?["AMG"]:["AMG","TD"]),spec:d.spec??!!d.amg}));
  DATA=[...manual,...auto].map(d=>({...d,_t:fold(d.title),_b:fold((d.text||"")+" "+safeDecode(d.url))}));
  return DATA;
}
function inProgram(d){return program==="both"||d.prog.includes(program)}
function isNew(d){const seen=ls.get("seen")||dateDaysAgo(7);return !!d.date&&d.date>=seen&&(d.spec||d.type==="anunt")}
function fmtDate(d){return d?new Date(d+"T00:00:00").toLocaleDateString("ro-RO",{day:"numeric",month:"short",year:"numeric"}):""}
function renderList(items,target="results",limit=shown){
  const box=$(target);if(!box)return;
  const slice=items.slice(0,limit);
  box.innerHTML=slice.length?slice.map(d=>`<li class="result">
    <a class="result-title" href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.title)}</a>
    ${d.text?`<p class="result-text">${esc(d.text.slice(0,240))}${d.text.length>240?"…":""}</p>`:""}
    <div class="result-meta"><span class="result-kind">${KIND[d.type]||""}</span>${d.spec?d.prog.map(p=>`<span class="badge">${p}</span>`).join(""):""}<span>${esc(d.source||"")}</span>${d.date?`<span>${fmtDate(d.date)}</span>`:""}${isNew(d)?'<span class="new-tag">Nou</span>':""}</div>
  </li>`).join(""):'<li class="empty">Nu sunt rezultate pentru selecția curentă.</li>';
}
function bindMore(itemsProvider){
  const btn=$("more");if(!btn)return;
  btn.onclick=()=>{shown+=PAGE_SIZE;const items=itemsProvider();renderList(items);btn.hidden=shown>=items.length};
}
function bindProgramRefresh(fn){document.addEventListener("programchange",()=>{shown=PAGE_SIZE;fn()})}

async function initHome(){
  const data=await loadData();
  const refresh=()=>{
    const recent=data.filter(d=>inProgram(d)&&d.type==="anunt").sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,4);
    renderList(recent,"homeNews",4);
  };
  refresh();bindProgramRefresh(refresh);
  const q=$("homeSearch");
  $("homeSearchBtn").onclick=()=>{location.href="cautare.html?q="+encodeURIComponent(q.value.trim())};
  q.addEventListener("keydown",e=>{if(e.key==="Enter")$("homeSearchBtn").click()});
}

async function initAnnouncements(){
  const data=await loadData();
  const refresh=()=>{
    const items=data.filter(d=>inProgram(d)&&d.type==="anunt").sort((a,b)=>(b.date||"").localeCompare(a.date||""));
    $("count").textContent=`${items.length} anunțuri`;renderList(items);$("more").hidden=shown>=items.length;bindMore(()=>items);
  };
  refresh();bindProgramRefresh(refresh);
  $("markSeen").onclick=()=>{ls.set("seen",localDate(new Date()));refresh()};
}

async function initSearch(){
  const data=await loadData();
  const q=$("q"),type=$("type"),src=$("src");
  src.innerHTML='<option value="">Toate sursele</option>'+[...new Set(data.map(d=>d.source))].filter(Boolean).sort().map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join("");
  const params=new URLSearchParams(location.search);q.value=params.get("q")||"";type.value=params.get("tip")||"";
  const filtered=()=>{
    const toks=fold(q.value).split(/\s+/).filter(Boolean);
    return data.filter(d=>inProgram(d)&&(!type.value||d.type===type.value)&&(!src.value||d.source===src.value)&&toks.every(t=>d._t.includes(t)||d._b.includes(t))).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  };
  const refresh=()=>{const items=filtered();$("count").textContent=`${items.length} rezultate`;renderList(items);$("more").hidden=shown>=items.length;bindMore(filtered)};
  [q,type,src].forEach(el=>el.addEventListener(el===q?"input":"change",()=>{shown=PAGE_SIZE;refresh()}));
  refresh();bindProgramRefresh(refresh);
}

async function initDocuments(){
  const data=await loadData(),q=$("q"),src=$("src");
  src.innerHTML='<option value="">Toate sursele</option>'+[...new Set(data.filter(d=>d.type==="document").map(d=>d.source))].filter(Boolean).sort().map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join("");
  const filtered=()=>{
    const term=fold(q.value);
    return data.filter(d=>d.type==="document"&&inProgram(d)&&(!src.value||d.source===src.value)&&(!term||d._t.includes(term)||d._b.includes(term))).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  };
  const refresh=()=>{const items=filtered();$("count").textContent=`${items.length} documente`;renderList(items);$("more").hidden=shown>=items.length;bindMore(filtered)};
  q.addEventListener("input",()=>{shown=PAGE_SIZE;refresh()});src.addEventListener("change",()=>{shown=PAGE_SIZE;refresh()});
  refresh();bindProgramRefresh(refresh);
}

async function initUseful(){
  const data=await loadData();
  let topic="examen";
  const labels={examen:"Examene",restante:"Restanțe",burse:"Burse",taxe:"Taxe",practica:"Practică"};
  const terms={examen:["examen","sesiune"],restante:["restanta","restante","reexamin"],burse:["bursa","burse"],taxe:["taxa","taxe"],practica:["practica"]};
  const filtered=()=>data.filter(d=>inProgram(d)&&terms[topic].some(t=>d._t.includes(t)||d._b.includes(t))).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const refresh=()=>{const items=filtered();$("usefulTitle").textContent=labels[topic];$("count").textContent=`${items.length} rezultate`;renderList(items);$("more").hidden=shown>=items.length;bindMore(filtered)};
  document.querySelectorAll("[data-topic]").forEach(b=>b.onclick=()=>{topic=b.dataset.topic;shown=PAGE_SIZE;document.querySelectorAll("[data-topic]").forEach(x=>x.classList.toggle("active",x===b));refresh()});
  refresh();bindProgramRefresh(refresh);
}

function initFeedback(){
  const form=$("feedbackForm"),status=$("feedbackStatus");if(!form)return;
  form.addEventListener("submit",e=>{
    e.preventDefault();
    const email=$("email").value.trim(),category=$("category").value,message=$("message").value.trim(),name=$("name").value.trim();
    if(!email||!category||!message){status.textContent="Completează emailul, categoria și mesajul.";return}
    const subject="[Portal AMG/TD] "+category;
    const body=[`Categorie: ${category}`,`Email expeditor: ${email}`,name?`Nume: ${name}`:"","", "Mesaj:",message,"","Trimis de pe portalul AMG · Tehnică Dentară."].filter(Boolean).join("\n");
    status.textContent="Se deschide aplicația de email...";
    location.href="mailto:gabi1dudan@gmail.com?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);
  });
}

async function init(){
  renderShell();applyTheme();
  document.querySelectorAll("[data-icon]").forEach(el=>el.innerHTML=svg(el.dataset.icon));
  try{
    const page=currentPage();
    if(page==="home")await initHome();
    if(page==="anunturi")await initAnnouncements();
    if(page==="cautare")await initSearch();
    if(page==="documente")await initDocuments();
    if(page==="utile")await initUseful();
    if(page==="feedback")initFeedback();
  }catch(e){
    const c=$("count");if(c)c.textContent="Datele nu au putut fi încărcate.";
    console.error(e);
  }
  if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
}
document.addEventListener("DOMContentLoaded",init);
