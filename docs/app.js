const PAGE_SIZE=30;
const KIND={anunt:"Anunț",pagina:"Pagină",document:"PDF"};
const $=id=>document.getElementById(id);
const fold=s=>(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeDecode=u=>{try{return decodeURIComponent(u||"")}catch{return u||""}};
const ls={get:k=>{try{return localStorage.getItem(k)}catch{return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch{}}};
const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const dateDaysAgo=n=>{const d=new Date();d.setDate(d.getDate()-n);return localDate(d)};
const debounce=(fn,wait=180)=>{let timer;return(...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),wait)}};

let DATA=[],DATA_META={};
const program="both";
let shown=PAGE_SIZE;
let deferredInstallPrompt=null;

const PAGES=[
  ["home","index.html","Acasă"],
  ["anunturi","anunturi.html","Anunțuri"],
  ["cautare","cautare.html","Căutare"],
  ["documente","documente.html","Documente"],
  ["utile","utile.html","Utile"],
  ["updates","updates.html","Update-uri"]
];

const OFFICIAL_EVENTS=[
  {date:"2026-10-01",title:"Începutul anului universitar 2026–2027",kind:"official",scope:"both"},
  {date:"2026-10-02",time:"09:00",title:"Deschiderea anului – Facultatea de Medicină",note:"Aula Magna, Str. Lucian Blaga nr. 2A",kind:"official",scope:"both"},
  {date:"2027-09-06",title:"Examen practică de vară / prima zi a sesiunii de restanțe",kind:"official",scope:"both"}
];

const iconPaths={
  home:'<path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-6h6v6"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  search:'<path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
  book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5Z"/><path d="M4 6.5v13M8 8h8"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  message:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.4 2.4 0 1 1 3.8 2c-.9.6-1.5 1.1-1.5 2.3M12 17h.01"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  building:'<path d="M3 21h18M6 21V6l6-3 6 3v15M9 9h1M14 9h1M9 13h1M14 13h1"/>',
  star:'<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3L5.8 21 7 14.2 2 9.3l6.9-1Z"/>',
  share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/>',
  download:'<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>'
};
function svg(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||iconPaths.arrow}</svg>`}

function currentPage(){return document.body.dataset.page||"home"}
const PALETTES=[{"id":"medical","name":"Medical","color":"#0f766e"},{"id":"ocean","name":"Ocean","color":"#1d4ed8"},{"id":"emerald","name":"Smarald","color":"#166534"},{"id":"lavender","name":"Lavandă","color":"#6d28d9"},{"id":"sunset","name":"Apus","color":"#9a3412"},{"id":"graphite","name":"Grafit","color":"#475569"},{"id":"contrast","name":"Contrast ridicat","color":"#000000"}];
function getUiTheme(){const mode=ls.get("uiTheme");return ["light","dark","auto"].includes(mode)?mode:"auto"}
function getPalette(){const id=ls.get("uiPalette");return PALETTES.some(p=>p.id===id)?id:"medical"}
function applyTheme(mode=getUiTheme()){
  const theme=mode==="auto"?(window.matchMedia?.("(prefers-color-scheme: dark)").matches?"dark":"light"):mode==="dark"?"dark":"light";
  document.body.classList.remove("theme-amg","theme-td","theme-light","theme-dark");
  document.body.classList.add("theme-campusmed","theme-"+theme);
  document.documentElement.style.colorScheme=theme;
  document.documentElement.dataset.theme=theme;
  document.documentElement.dataset.palette=getPalette();
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute("content",theme==="dark"?"#101820":"#f8fafb");
  document.querySelectorAll("[data-ui-theme]").forEach(b=>{const on=b.dataset.uiTheme===mode;b.classList.toggle("on",on);b.setAttribute("aria-pressed",String(on))});
  document.querySelectorAll("[data-palette-choice]").forEach(b=>{const on=b.dataset.paletteChoice===getPalette();b.classList.toggle("on",on);b.setAttribute("aria-pressed",String(on))});
}
function setUiTheme(mode){ls.set("uiTheme",["light","dark","auto"].includes(mode)?mode:"auto");applyTheme()}
window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener("change",()=>{if(getUiTheme()==="auto")applyTheme()});
function appearanceMarkup(){
  return '<button type="button" class="appearance-trigger" data-open-appearance aria-haspopup="dialog">◐ <span>Aspect</span></button>';
}
function initAppearance(){
  if(!$("appearanceDialog"))document.body.insertAdjacentHTML("beforeend",`<dialog id="appearanceDialog" class="appearance-dialog" aria-labelledby="appearanceTitle"><div class="appearance-heading"><div><h2 id="appearanceTitle">Aspectul tău</h2><p>Alege culorile care îți plac.</p></div><button type="button" id="appearanceClose" aria-label="Închide setările de aspect">✕</button></div><h3>Mod de afișare</h3><div class="appearance-modes" role="group" aria-label="Mod de afișare"><button type="button" data-ui-theme="light">Luminos</button><button type="button" data-ui-theme="dark">Întunecat</button><button type="button" data-ui-theme="auto">Automat</button></div><h3>Paletă de culori</h3><div class="appearance-palettes" role="group" aria-label="Paletă de culori">${PALETTES.map(p=>`<button type="button" data-palette-choice="${p.id}" style="--swatch:${p.color}"><span class="palette-swatch" aria-hidden="true"></span><span>${p.name}</span><span class="palette-check" aria-hidden="true">✓</span></button>`).join("")}</div><div class="appearance-preview"><span class="badge">Previzualizare</span><strong>CampusMed, în culorile tale</strong><p>Anunțuri și informații ușor de citit.</p></div><p class="appearance-note">Alegerea se salvează automat pe acest dispozitiv.</p></dialog>`);
  const dialog=$("appearanceDialog");
  document.querySelectorAll("[data-open-appearance]").forEach(b=>b.onclick=()=>dialog.showModal());
  $("appearanceClose").onclick=()=>dialog.close();
  dialog.addEventListener("click",e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
  document.querySelectorAll("[data-ui-theme]").forEach(b=>b.onclick=()=>setUiTheme(b.dataset.uiTheme));
  document.querySelectorAll("[data-palette-choice]").forEach(b=>b.onclick=()=>{ls.set("uiPalette",b.dataset.paletteChoice);applyTheme()});
  applyTheme();
}
function renderShell(){
  const page=currentPage();
  const nav=PAGES.map(([id,url,label])=>`<a data-nav-page="${id}" href="${url}"${page===id?' class="active" aria-current="page"':""}>${label}${id==="anunturi"?'<span class="nav-badge news-badge" hidden></span>':""}</a>`).join("");
  $("siteHeader").innerHTML=`<header class="site-header"><div class="shell header-row">
    <a class="brand" href="index.html" aria-label="CampusMed, pagina principală"><span class="brand-mark">C+</span><span>CampusMed</span></a>
    <nav class="desktop-nav" aria-label="Navigație principală">${nav}</nav>
    ${appearanceMarkup()}
    <button class="menu-btn" id="menuBtn" type="button" aria-label="Deschide meniul" aria-expanded="false">${svg("menu")}</button>
  </div></header>`;

  if(!$("sideRail")){
    document.body.insertAdjacentHTML("beforeend",`<nav class="side-rail" id="sideRail" aria-label="Acces rapid important">
      <a href="linkuri.html" data-label="Linkuri"${page==="linkuri"?' class="active" aria-current="page"':""}>${svg("link")}<span>Linkuri</span></a>
      <a href="faq.html" data-label="FAQ"${page==="faq"?' class="active" aria-current="page"':""}>${svg("help")}<span>FAQ</span></a>
      <a href="feedback.html" data-label="Feedback"${page==="feedback"?' class="active" aria-current="page"':""}>${svg("message")}<span>Feedback</span></a>
      <a href="admin-feedback.html" data-label="Admin">${svg("user")}<span>Admin</span></a>
    </nav>`);
  }

  $("siteFooter").innerHTML=`<footer class="footer"><div class="shell footer-row">
    <span>CampusMed · Proiect studențesc neoficial. Verifică informația pe site-ul sursă.</span>
    <div class="footer-actions"><button class="footer-install" id="installApp" type="button" hidden>Instalează aplicația</button><a href="updates.html">Update-uri</a></div>
  </div></footer>`;

  $("mobileNav").innerHTML=`<nav class="bottom-nav" aria-label="Navigație mobilă">
    <a href="index.html"${page==="home"?' class="active"':""}>${svg("home")}<span>Acasă</span></a>
    <a href="anunturi.html"${page==="anunturi"?' class="active"':""}>${svg("bell")}<span>Anunțuri</span></a>
    <a href="cautare.html"${page==="cautare"?' class="active"':""}>${svg("search")}<span>Caută</span></a>
    <button id="bottomMenu" type="button">${svg("menu")}<span>Meniu</span></button>
  </nav>`;

  $("drawerRoot").innerHTML=`<div class="drawer-backdrop" id="drawerBackdrop"></div>
  <aside class="drawer" id="drawer" aria-label="Meniu mobil"><div class="drawer-head"><strong>Meniu</strong><button class="drawer-close" id="drawerClose" type="button" aria-label="Închide meniul">✕</button></div>
  <div class="drawer-theme"><span>Temă</span>${appearanceMarkup()}</div>
  <nav>${nav}<a href="anul1.html"${page==="anul1"?' class="active" aria-current="page"':""}>Anul I · Start aici</a><a href="linkuri.html"${page==="linkuri"?' class="active" aria-current="page"':""}>Linkuri oficiale</a><a href="faq.html"${page==="faq"?' class="active" aria-current="page"':""}>FAQ / Pentru boboci</a><a href="feedback.html"${page==="feedback"?' class="active" aria-current="page"':""}>Trimite feedback</a><a href="admin-feedback.html">Admin</a><a href="calendar.html"${page==="calendar"?' class="active" aria-current="page"':""}>Calendar academic</a><a href="https://schedule.ulbsibiu.ro/" target="_blank" rel="noopener">Orare ULBS ↗</a></nav></aside>`;

  initAppearance();
  document.querySelectorAll("[data-ui-theme]").forEach(b=>b.onclick=()=>setUiTheme(b.dataset.uiTheme));
  const open=()=>{$("drawer").classList.add("open");$("drawerBackdrop").classList.add("open");document.body.classList.add("drawer-open");$("menuBtn").setAttribute("aria-expanded","true")};
  const close=()=>{$("drawer").classList.remove("open");$("drawerBackdrop").classList.remove("open");document.body.classList.remove("drawer-open");$("menuBtn").setAttribute("aria-expanded","false")};
  $("menuBtn").onclick=open;$("bottomMenu").onclick=open;$("drawerClose").onclick=close;$("drawerBackdrop").onclick=close;
  document.querySelectorAll("#drawer a").forEach(a=>a.addEventListener("click",close));
  document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
  const install=$("installApp");
  if(deferredInstallPrompt)install.hidden=false;
  install.onclick=async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;install.hidden=true};
}

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstallPrompt=e;const b=$("installApp");if(b)b.hidden=false});

const getJson=u=>fetch(u,{cache:"no-cache"}).then(async r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.json()});
const getCompressedJson=async u=>{
  const r=await fetch(u,{cache:"no-cache"});if(!r.ok)throw new Error("HTTP "+r.status);
  const bytes=await r.arrayBuffer(),plain=new TextDecoder().decode(bytes);
  try{return JSON.parse(plain)}catch{}
  if(!("DecompressionStream" in window))throw new Error("gzip unsupported");
  return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text());
};
async function loadData(){
  if(DATA.length)return DATA;
  const [j,man]=await Promise.all([getCompressedJson("data.json.gz").catch(()=>getJson("data.json")),getJson("manual.json").catch(()=>[])]);
  if(!j||!Array.isArray(j.items))throw new Error("Format invalid");
  DATA_META={count:j.count||j.items.length,updated:j.updated||"",mode:j.mode||"",sourceStatus:Array.isArray(j.source_status)?j.source_status:[]};
  const manual=(Array.isArray(man)?man:[]).filter(m=>m&&m.title).map(m=>({title:m.title,url:m.url||"",date:m.date||"",text:m.text||"",source:"Adăugat manual",type:"anunt",prog:m.prog?.length?m.prog:["AMG","TD"],spec:true}));
  const auto=j.items.map(d=>({...d,prog:Array.isArray(d.prog)&&d.prog.length?d.prog:(d.amg?["AMG"]:["AMG","TD"]),spec:d.spec??!!d.amg}));
  DATA=[...manual,...auto].map(d=>({...d,_t:fold(d.title),_b:fold((d.text||"")+" "+safeDecode(d.url))}));
  updateNewsBadge();
  return DATA;
}
function inProgram(){return true}
function isNew(d){const seen=ls.get("seen")||dateDaysAgo(7);return !!d.date&&d.date>=seen&&(d.spec||d.type==="anunt")}
function fmtDate(d){return d?new Date(d+"T00:00:00").toLocaleDateString("ro-RO",{day:"numeric",month:"short",year:"numeric"}):""}
function updateNewsBadge(){
  const n=DATA.filter(d=>inProgram(d)&&d.type==="anunt"&&isNew(d)).length;
  document.querySelectorAll(".news-badge").forEach(b=>{b.textContent=n>99?"99+":String(n);b.hidden=!n});
}
document.addEventListener("programchange",updateNewsBadge);

function getFavorites(){try{return JSON.parse(ls.get("favorites")||"[]")}catch{return[]}}
function favoriteKey(d){return d.url||d.title}
function isFavorite(d){return getFavorites().some(x=>x.key===favoriteKey(d))}
function toggleFavorite(d){
  let favs=getFavorites(),key=favoriteKey(d);
  if(favs.some(x=>x.key===key))favs=favs.filter(x=>x.key!==key);
  else favs.unshift({key,title:d.title,url:d.url||"",source:d.source||"",type:d.type||"",date:d.date||""});
  ls.set("favorites",JSON.stringify(favs.slice(0,50)));
  document.dispatchEvent(new CustomEvent("favoriteschange"));
}
function getRecent(){try{return JSON.parse(ls.get("recentItems")||"[]")}catch{return[]}}
function recordRecent(d){
  if(!d)return;
  let items=getRecent().filter(x=>x.key!==favoriteKey(d));
  items.unshift({key:favoriteKey(d),title:d.title,url:d.url||"",source:d.source||"",date:d.date||""});
  ls.set("recentItems",JSON.stringify(items.slice(0,8)));
  document.dispatchEvent(new CustomEvent("recentchange"));
}
function renderSimpleStored(id,items,empty){
  const box=$(id);if(!box)return;
  box.innerHTML=items.length?items.slice(0,3).map(f=>`<li class="result"><a class="result-title" href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.title)}</a><div class="result-meta"><span>${esc(f.source)}</span>${f.date?`<span>${fmtDate(f.date)}</span>`:""}</div></li>`).join(""):`<li class="empty">${empty}</li>`;
  box.querySelectorAll(".result-title").forEach((a,i)=>a.addEventListener("click",()=>recordRecent(items[i])));
}
function renderFavorites(){renderSimpleStored("favoriteList",getFavorites(),"Nu ai încă favorite. Salvează un rezultat folosind steaua.")}
function renderRecent(){renderSimpleStored("recentList",getRecent(),"Elementele pe care le deschizi vor apărea aici.")}

function getCalendarEvents(){try{return JSON.parse(ls.get("calendarEvents")||"[]")}catch{return[]}}
function setCalendarEvents(v){ls.set("calendarEvents",JSON.stringify(v))}
function addCalendarFromResult(d){
  if(!d.date)return false;
  const events=getCalendarEvents();
  events.push({id:"r"+Date.now(),title:d.title,date:d.date,time:"",category:"Din portal",note:d.source||"",url:d.url||""});
  setCalendarEvents(events);return true;
}
async function shareItem(d){
  const data={title:d.title,text:d.title,url:d.url||location.href};
  try{if(navigator.share){await navigator.share(data)}else{await navigator.clipboard.writeText(data.url);alert("Link copiat.")}}catch{}
}
function bindResultActions(items,target){
  const box=$(target);if(!box)return;
  box.querySelectorAll("[data-fav-index]").forEach(btn=>btn.onclick=()=>{const d=items[Number(btn.dataset.favIndex)];toggleFavorite(d);btn.classList.toggle("saved",isFavorite(d));btn.setAttribute("aria-label",isFavorite(d)?"Elimină din favorite":"Adaugă la favorite")});
  box.querySelectorAll("[data-share-index]").forEach(btn=>btn.onclick=()=>shareItem(items[Number(btn.dataset.shareIndex)]));
  box.querySelectorAll("[data-cal-index]").forEach(btn=>btn.onclick=()=>{const d=items[Number(btn.dataset.calIndex)];if(addCalendarFromResult(d)){btn.textContent="Adăugat ✓";setTimeout(()=>btn.innerHTML=svg("calendar"),1200)}});
  box.querySelectorAll("[data-open-index]").forEach(a=>a.addEventListener("click",()=>recordRecent(items[Number(a.dataset.openIndex)])));
}
function renderList(items,target="results",limit=shown){
  const box=$(target);if(!box)return;
  const slice=items.slice(0,limit),favoriteKeys=new Set(getFavorites().map(x=>x.key));
  box.innerHTML=slice.length?slice.map((d,i)=>{const saved=favoriteKeys.has(favoriteKey(d));return `<li class="result">
    <div class="result-top"><a class="result-title" data-open-index="${i}" href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.title)}</a>
      <div class="result-actions"><button class="fav-btn${saved?" saved":""}" type="button" data-fav-index="${i}" aria-label="${saved?"Elimină din favorite":"Adaugă la favorite"}">${svg("star")}</button><button class="fav-btn" type="button" data-share-index="${i}" aria-label="Distribuie">${svg("share")}</button>${d.date?`<button class="fav-btn" type="button" data-cal-index="${i}" aria-label="Adaugă în calendar">${svg("calendar")}</button>`:""}</div>
    </div>
    ${d.text?`<p class="result-text">${esc(d.text.slice(0,240))}${d.text.length>240?"…":""}</p>`:""}
    <div class="result-meta"><span class="result-kind">${KIND[d.type]||""}</span>${d.spec?d.prog.map(p=>`<span class="badge">${p}</span>`).join(""):""}<span>${esc(d.source||"")}</span>${d.date?`<span>${fmtDate(d.date)}</span>`:""}${isNew(d)?'<span class="new-tag">Nou</span>':""}</div>
  </li>`}).join(""):'<li class="empty">Nu sunt rezultate pentru selecția curentă.</li>';
  bindResultActions(slice,target);
}
function bindMore(itemsProvider){
  const btn=$("more");if(!btn)return;
  btn.onclick=()=>{shown+=PAGE_SIZE;const items=itemsProvider();renderList(items);btn.hidden=shown>=items.length};
}
function bindProgramRefresh(fn){document.addEventListener("programchange",()=>{shown=PAGE_SIZE;fn()})}

function updateHomeDataCheck(){
  const box=$("crawlCheck"),label=$("dataLastChecked");if(!box||!label)return;
  const d=new Date(DATA_META.updated||"");if(Number.isNaN(d.getTime())){box.dataset.state="error";label.textContent="Ultima verificare indisponibilă";return}
  const age=Date.now()-d.getTime(),hours=age/36e5,cached=(DATA_META.sourceStatus||[]).filter(x=>x.used_cache);
  box.dataset.state=hours>12?"error":(hours>6||cached.length)?"warn":"ok";
  const exact=d.toLocaleString("ro-RO",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
  let relative=age<6e4?"acum":age<36e5?"acum "+Math.max(1,Math.floor(age/6e4))+" min":age<864e5?"acum "+Math.floor(age/36e5)+" h":"acum "+Math.floor(age/864e5)+" zile";
  label.textContent=cached.length?"Verificat "+exact+" · "+cached.length+" sursă(e) cu date anterioare":"Ultima verificare: "+exact+" · "+relative;
  box.title=cached.length?"Verificarea a rulat, dar unele surse nu au răspuns și au fost păstrate datele anterioare.":"Momentul ultimei actualizări automate a indexului";
}
async function initHome(){
  const data=await loadData();updateHomeDataCheck();
  const refresh=()=>{
    const announcements=data.filter(d=>inProgram(d)&&d.type==="anunt").sort((a,b)=>(b.date||"").localeCompare(a.date||""));const summary=$("announcementSummary");if(summary)summary.textContent=announcements.length+" anunțuri indexate · afișăm cele mai relevante 3";
    const importantWords=["urgent","important","examen","restant","bursa","tax","practica","orar","sesiune"];
    const important=announcements.filter(d=>importantWords.some(w=>d._t.includes(w)||d._b.includes(w))).slice(0,3);
    renderList(important.length?important:announcements.slice(0,3),"importantNow",3);
    renderFavorites();renderRecent();
  };
  refresh();bindProgramRefresh(refresh);
  document.addEventListener("favoriteschange",renderFavorites);document.addEventListener("recentchange",renderRecent);
  const q=$("homeSearch");$("homeSearchBtn").onclick=()=>{location.href="cautare.html?q="+encodeURIComponent(q.value.trim())};
  q.addEventListener("keydown",e=>{if(e.key==="Enter")$("homeSearchBtn").click()});
}
async function initAnnouncements(){
  const data=await loadData();let onlyNew=false;
  const filtered=()=>data.filter(d=>inProgram(d)&&d.type==="anunt"&&(!onlyNew||isNew(d))).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const refresh=()=>{const items=filtered();$("count").textContent=`${items.length} anunțuri`;renderList(items);$("more").hidden=shown>=items.length;bindMore(filtered)};
  refresh();bindProgramRefresh(refresh);
  $("onlyNew").onclick=()=>{onlyNew=!onlyNew;$("onlyNew").classList.toggle("on",onlyNew);$("onlyNew").setAttribute("aria-pressed",String(onlyNew));shown=PAGE_SIZE;refresh()};
  $("markSeen").onclick=()=>{ls.set("seen",localDate(new Date()));updateNewsBadge();refresh()};
}
async function initSearch(){
  const data=await loadData(),q=$("q"),type=$("type"),src=$("src");
  src.innerHTML='<option value="">Toate sursele</option>'+[...new Set(data.map(d=>d.source))].filter(Boolean).sort().map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join("");
  const params=new URLSearchParams(location.search);q.value=params.get("q")||"";type.value=params.get("tip")||"";
  const filtered=()=>{const toks=fold(q.value).split(/\s+/).filter(Boolean);return data.filter(d=>inProgram(d)&&(!type.value||d.type===type.value)&&(!src.value||d.source===src.value)&&toks.every(t=>d._t.includes(t)||d._b.includes(t))).sort((a,b)=>(b.date||"").localeCompare(a.date||""))};
  const refresh=()=>{const items=filtered();$("count").textContent=`${items.length} rezultate`;renderList(items);$("more").hidden=shown>=items.length;bindMore(filtered)};
  q.addEventListener("input",debounce(()=>{shown=PAGE_SIZE;refresh()}));[type,src].forEach(el=>el.addEventListener("change",()=>{shown=PAGE_SIZE;refresh()}));refresh();bindProgramRefresh(refresh);
}
async function initDocuments(){
  const data=await loadData(),q=$("q"),src=$("src");
  src.innerHTML='<option value="">Toate sursele</option>'+[...new Set(data.filter(d=>d.type==="document").map(d=>d.source))].filter(Boolean).sort().map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join("");
  const filtered=()=>{const term=fold(q.value);return data.filter(d=>d.type==="document"&&inProgram(d)&&(!src.value||d.source===src.value)&&(!term||d._t.includes(term)||d._b.includes(term))).sort((a,b)=>(b.date||"").localeCompare(a.date||""))};
  const refresh=()=>{const items=filtered();$("count").textContent=`${items.length} documente`;renderList(items);$("more").hidden=shown>=items.length;bindMore(filtered)};
  q.addEventListener("input",debounce(()=>{shown=PAGE_SIZE;refresh()}));src.addEventListener("change",()=>{shown=PAGE_SIZE;refresh()});refresh();bindProgramRefresh(refresh);
}
async function initUseful(){
  const data=await loadData();const requestedTopic=new URLSearchParams(location.search).get("topic");let topic=["examen","restante","burse","taxe","practica"].includes(requestedTopic)?requestedTopic:"examen";
  const labels={examen:"Examene",restante:"Restanțe",burse:"Burse",taxe:"Taxe",practica:"Practică"};
  const terms={examen:["examen","sesiune"],restante:["restanta","restante","reexamin"],burse:["bursa","burse"],taxe:["taxa","taxe"],practica:["practica"]};
  const filtered=()=>data.filter(d=>inProgram(d)&&terms[topic].some(t=>d._t.includes(t)||d._b.includes(t))).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const refresh=()=>{const items=filtered();$("usefulTitle").textContent=labels[topic];$("count").textContent=`${items.length} rezultate`;renderList(items);$("more").hidden=shown>=items.length;bindMore(filtered)};
  document.querySelectorAll("[data-topic]").forEach(b=>{b.classList.toggle("active",b.dataset.topic===topic);b.onclick=()=>{topic=b.dataset.topic;shown=PAGE_SIZE;history.replaceState(null,"","?topic="+encodeURIComponent(topic));document.querySelectorAll("[data-topic]").forEach(x=>x.classList.toggle("active",x===b));refresh()}});
  refresh();bindProgramRefresh(refresh);
}

function initCalendar(){
  const grid=$("calendarGrid"),title=$("calendarMonth"),form=$("calendarForm"),dayList=$("selectedDayEvents");
  if(!grid||!form)return;
  let view=new Date(2026,9,1),selected=localDate(new Date()),editId=null;
  const monthNames=["Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie","Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"];
  const visibleOfficial=()=>OFFICIAL_EVENTS;
  const allEvents=()=>[...visibleOfficial(),...getCalendarEvents().map(e=>({...e,kind:"personal"}))];
  const renderSelected=()=>{
    const items=allEvents().filter(e=>e.date===selected).sort((a,b)=>(a.time||"").localeCompare(b.time||""));
    $("selectedDateTitle").textContent=new Date(selected+"T00:00:00").toLocaleDateString("ro-RO",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    dayList.innerHTML=items.length?items.map(e=>`<div class="cal-detail ${e.kind==="official"?"official":""}"><div><strong>${esc(e.title)}</strong><span>${e.time?esc(e.time)+" · ":""}${esc(e.note||"")}</span></div>${e.kind==="personal"?`<div class="cal-detail-actions"><button type="button" data-edit="${esc(e.id)}">Editează</button><button type="button" data-delete="${esc(e.id)}">Șterge</button></div>`:'<span class="official-pill">Oficial</span>'}</div>`).join(""):'<p class="empty small">Niciun eveniment în această zi.</p>';
    dayList.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>{setCalendarEvents(getCalendarEvents().filter(e=>e.id!==b.dataset.delete));render()});
    dayList.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>{const e=getCalendarEvents().find(x=>x.id===b.dataset.edit);if(!e)return;editId=e.id;$("eventTitle").value=e.title;$("eventDate").value=e.date;$("eventTime").value=e.time||"";$("eventCategory").value=e.category||"Personal";$("eventNote").value=e.note||"";$("calendarSubmit").textContent="Salvează";$("calendarCancel").hidden=false;form.scrollIntoView({behavior:"smooth"})});
  };
  const render=()=>{
    title.textContent=monthNames[view.getMonth()]+" "+view.getFullYear();
    const first=new Date(view.getFullYear(),view.getMonth(),1),days=new Date(view.getFullYear(),view.getMonth()+1,0).getDate();
    const offset=(first.getDay()+6)%7;
    const events=allEvents();let html="";
    for(let i=0;i<offset;i++)html+='<div class="calendar-day outside" aria-hidden="true"></div>';
    for(let day=1;day<=days;day++){
      const date=`${view.getFullYear()}-${String(view.getMonth()+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
      const ev=events.filter(e=>e.date===date),today=date===localDate(new Date()),sel=date===selected;
      html+=`<button type="button" class="calendar-day${today?" today":""}${sel?" selected":""}" data-date="${date}"><span class="day-number">${day}</span><span class="day-events">${ev.slice(0,3).map(e=>`<span class="day-event ${e.kind==="official"?"official":""}">${esc(e.title)}</span>`).join("")}${ev.length>3?`<span class="day-more">+${ev.length-3}</span>`:""}</span></button>`;
    }
    grid.innerHTML=html;grid.querySelectorAll("[data-date]").forEach(b=>b.onclick=()=>{selected=b.dataset.date;$("eventDate").value=selected;render();renderSelected()});renderSelected();
  };
  $("calendarPrev").onclick=()=>{view=new Date(view.getFullYear(),view.getMonth()-1,1);render()};
  $("calendarNext").onclick=()=>{view=new Date(view.getFullYear(),view.getMonth()+1,1);render()};
  $("calendarToday").onclick=()=>{const d=new Date();view=new Date(d.getFullYear(),d.getMonth(),1);selected=localDate(d);render()};
  $("calendarCancel").onclick=()=>{editId=null;form.reset();$("calendarSubmit").textContent="Adaugă";$("calendarCancel").hidden=true;$("eventDate").value=selected};
  form.onsubmit=e=>{
    e.preventDefault();const titleVal=$("eventTitle").value.trim(),date=$("eventDate").value,time=$("eventTime").value,category=$("eventCategory").value,note=$("eventNote").value.trim();if(!titleVal||!date)return;
    let events=getCalendarEvents();
    if(editId)events=events.map(x=>x.id===editId?{...x,title:titleVal,date,time,category,note}:x);
    else events.push({id:"u"+Date.now(),title:titleVal,date,time,category,note});
    setCalendarEvents(events);selected=date;view=new Date(date+"T00:00:00");editId=null;form.reset();$("calendarSubmit").textContent="Adaugă";$("calendarCancel").hidden=true;$("eventDate").value=selected;render();
  };
  document.addEventListener("programchange",render);
  $("eventDate").value=selected;render();
}

async function initLinks(){
  const data=await loadData();
  const status=$("sourceStatus");if(!status)return;
  const counts={};data.forEach(d=>{counts[d.source]=(counts[d.source]||0)+1});
  const updated=DATA_META.updated?new Date(DATA_META.updated).toLocaleString("ro-RO"):"necunoscut";
  const sourceMeta=new Map((DATA_META.sourceStatus||[]).map(x=>[x.name,x]));
  status.innerHTML=`<div class="status-summary"><strong>${DATA_META.count||data.length}</strong><span>elemente indexate</span><small>Ultima actualizare: ${esc(updated)}${DATA_META.mode?" · "+esc(DATA_META.mode):""}</small></div>`+
    Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([s,n])=>{const meta=sourceMeta.get(s),fallback=!!meta?.used_cache;return `<div class="status-source${fallback?" status-warning":""}"><span class="status-dot"></span><strong>${esc(s)}</strong><span>${n} elemente${meta?" · "+meta.fresh_count+" verificate acum":""}${fallback?" · date anterioare păstrate":""}</span></div>`}).join("");
}
function initFeedback(){
  const form=$("feedbackForm"),status=$("feedbackStatus");if(!form)return;
  form.addEventListener("submit",e=>{e.preventDefault();const email=$("email").value.trim(),category=$("category").value,message=$("message").value.trim(),name=$("name").value.trim();if(!email||!category||!message){status.textContent="Completează emailul, categoria și mesajul.";return}const subject="[Portal AMG/TD] "+category;const body=[`Categorie: ${category}`,`Email expeditor: ${email}`,name?`Nume: ${name}`:"","", "Mesaj:",message,"","Trimis de pe portalul AMG · Tehnică Dentară."].filter(Boolean).join("\n");status.textContent="Se deschide aplicația de email...";location.href="mailto:gabi1dudan@gmail.com?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body)});
}


async function initFirstYear(){
  const box=$("firstYearNews");
  if(box){
    try{
      const data=await loadData();
      const yearWords=/\b(anul\s*(i|1)|an\s*(i|1)|boboc|boboci|grup|orar|burs|cazare|tax|practic)/i;
      const items=data.filter(d=>inProgram(d)&&(d.type==="anunt"||d.spec)&&yearWords.test((d.title||"")+" "+(d.text||""))).sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,6);
      renderList(items,box.id,6);
    }catch{box.innerHTML='<li class="empty">Nu am putut încărca anunțurile.</li>'}
  }
  document.querySelectorAll("[data-firstyear-check]").forEach(input=>{
    const key="firstyear:"+input.dataset.firstyearCheck;
    input.checked=ls.get(key)==="1";
    input.onchange=()=>ls.set(key,input.checked?"1":"0");
  });
  document.addEventListener("programchange",()=>{if(box)initFirstYearNewsOnly(box)});
}
async function initFirstYearNewsOnly(box){
  try{
    const data=await loadData();
    const re=/\b(anul\s*(i|1)|an\s*(i|1)|boboc|boboci|grup|orar|burs|cazare|tax|practic)/i;
    const items=data.filter(d=>inProgram(d)&&(d.type==="anunt"||d.spec)&&re.test((d.title||"")+" "+(d.text||""))).sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,6);
    renderList(items,box.id,6);
  }catch{}
}
async function init(){
  renderShell();applyTheme();document.querySelectorAll("[data-icon]").forEach(el=>el.innerHTML=svg(el.dataset.icon));
  try{
    const page=currentPage();
    if(page==="home")await initHome();
    if(page==="anunturi")await initAnnouncements();
    if(page==="cautare")await initSearch();
    if(page==="documente")await initDocuments();
    if(page==="utile")await initUseful();
    if(page==="calendar")initCalendar();
    if(page==="linkuri")await initLinks();
    if(page==="feedback")initFeedback();
  if(page==="anul1")initFirstYear();
    if(!DATA.length&&["calendar","feedback","faq","updates"].includes(page)===false)await loadData();
  }catch(e){
    const message="Datele nu au putut fi încărcate. Reîncarcă pagina pentru a încerca din nou.";
    const c=$("count");if(c)c.textContent=message;
    document.querySelectorAll("ol.results").forEach(box=>{
      if(box.querySelector(".empty"))box.innerHTML=`<li class="empty">${message}</li>`;
    });
    console.error(e);
  }
  if("serviceWorker" in navigator){navigator.serviceWorker.register("sw.js?v=41",{updateViaCache:"none"}).then(reg=>reg.update()).catch(()=>{});}
}
document.addEventListener("DOMContentLoaded",init);
