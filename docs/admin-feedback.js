(()=>{"use strict";
const uiTheme=localStorage.getItem("uiTheme")==="dark"?"dark":"light";
document.body.classList.add("theme-"+uiTheme);
document.documentElement.style.colorScheme=uiTheme;
const themeMeta=document.querySelector('meta[name="theme-color"]');if(themeMeta)themeMeta.content=uiTheme==="dark"?"#110d0f":"#f8fafb";
const c=window.PORTAL_SUPABASE;if(!c||!window.supabase)return;const db=window.supabase.createClient(c.url,c.key),$=id=>document.getElementById(id),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));let rows=[],filter="all";function show(s){$("adminLogin").hidden=!!s;$("adminDashboard").hidden=!s;$("adminLogout").hidden=!s;if(s)load()}async function load(){const {data,error}=await db.from("feedback").select("*").order("created_at",{ascending:false});if(error){$("adminFeedbackList").innerHTML='<div class="empty">Acces refuzat sau baza de date nu este configurată.</div>';return}rows=data||[];render()}function render(){const a=filter==="all"?rows:rows.filter(x=>x.status===filter);$("adminCount").textContent=rows.length+" mesaje în total";$("adminFeedbackList").innerHTML=a.length?a.map(x=>'<article class="admin-feedback-card"><div class="admin-feedback-meta"><span class="badge">'+esc(x.category)+'</span><span>'+new Date(x.created_at).toLocaleString("ro-RO")+'</span><span>'+esc(x.program)+'</span></div><p class="admin-message">'+esc(x.message)+'</p><div class="admin-sender">'+(x.name?'<strong>'+esc(x.name)+'</strong>':"Anonim")+(x.email?" · "+esc(x.email):"")+'</div><div class="admin-card-actions"><select data-status="'+x.id+'"><option value="nou"'+(x.status==="nou"?" selected":"")+'>Nou</option><option value="in_lucru"'+(x.status==="in_lucru"?" selected":"")+'>În lucru</option><option value="rezolvat"'+(x.status==="rezolvat"?" selected":"")+'>Rezolvat</option></select><button class="danger-btn" data-delete="'+x.id+'">Șterge</button></div></article>').join(""):'<div class="empty">Nu există mesaje aici.</div>';document.querySelectorAll("[data-status]").forEach(e=>e.onchange=async()=>{await db.from("feedback").update({status:e.value}).eq("id",e.dataset.status);load()});document.querySelectorAll("[data-delete]").forEach(e=>e.onclick=async()=>{if(confirm("Ștergi definitiv acest feedback?")){await db.from("feedback").delete().eq("id",e.dataset.delete);load()}})}db.auth.getSession().then(({data})=>show(data.session));db.auth.onAuthStateChange((_e,s)=>show(s));
const loginStatus=$("adminLoginStatus"),loginSubmit=$("adminLoginSubmit");
function setLoginStatus(message,type=""){loginStatus.textContent=message;loginStatus.className="admin-login-status"+(type?" "+type:"")}
$("toggleAdminPassword").onclick=()=>{const input=$("adminPassword"),showPassword=input.type==="password";input.type=showPassword?"text":"password";$("toggleAdminPassword").classList.toggle("showing",showPassword);$("toggleAdminPassword").setAttribute("aria-pressed",String(showPassword));$("toggleAdminPassword").setAttribute("aria-label",showPassword?"Ascunde parola":"Afișează parola")};
$("adminEmail").addEventListener("input",()=>setLoginStatus(""));
$("adminPassword").addEventListener("input",()=>setLoginStatus(""));
$("adminLoginForm").onsubmit=async e=>{
  e.preventDefault();const email=$("adminEmail"),password=$("adminPassword");
  email.value=email.value.trim();
  if(!email.value){setLoginStatus("Introdu adresa de email.","error");email.focus();return}
  if(!email.validity.valid){setLoginStatus("Adresa de email nu are un format valid.","error");email.focus();return}
  if(!password.value){setLoginStatus("Introdu parola.","error");password.focus();return}
  loginSubmit.disabled=true;loginSubmit.classList.add("loading");loginSubmit.querySelector("span").textContent="Se verifică…";setLoginStatus("Verific datele de autentificare…","checking");
  try{
    const {error}=await db.auth.signInWithPassword({email:email.value,password:password.value});
    if(error){
      if(error.status===429)setLoginStatus("Prea multe încercări. Așteaptă puțin și încearcă din nou.","error");
      else if(error.status>=500)setLoginStatus("Serviciul de autentificare nu răspunde momentan. Încearcă din nou.","error");
      else setLoginStatus("Emailul sau parola sunt incorecte. Verifică ambele câmpuri.","error");
      password.select();
    }else setLoginStatus("");
  }catch(_){setLoginStatus("Nu s-a putut contacta serviciul de autentificare. Verifică conexiunea.","error")}
  finally{loginSubmit.disabled=false;loginSubmit.classList.remove("loading");loginSubmit.querySelector("span").textContent="Intră în panou"}
};
$("adminLogout").onclick=()=>db.auth.signOut();$("adminRefresh").onclick=load;document.querySelectorAll("[data-feedback-filter]").forEach(b=>b.onclick=()=>{filter=b.dataset.feedbackFilter;document.querySelectorAll("[data-feedback-filter]").forEach(x=>x.classList.toggle("on",x===b));render()})
// Update-uri & Roadmap
let portalUpdates=[];
const updateEsc=esc;
function setAdminTab(tab){document.querySelectorAll("[data-admin-tab]").forEach(b=>b.classList.toggle("on",b.dataset.adminTab===tab));$("adminFeedbackPanel").hidden=tab!=="feedback";$("adminUpdatesPanel").hidden=tab!=="updates";$("adminStatusPanel").hidden=tab!=="status";if(tab==="updates")loadPortalUpdates();if(tab==="status")loadSiteStatus()}
document.querySelectorAll("[data-admin-tab]").forEach(b=>b.onclick=()=>setAdminTab(b.dataset.adminTab));
async function loadPortalUpdates(){const {data,error}=await db.from("portal_updates").select("*").order("sort_order",{ascending:true}).order("created_at",{ascending:false});if(error){$("adminUpdatesList").innerHTML='<div class="empty">Rulează mai întâi SQL-ul pentru Update-uri în Supabase.</div>';return}portalUpdates=data||[];renderPortalUpdates()}
function renderPortalUpdates(){$("adminUpdatesList").innerHTML=portalUpdates.length?portalUpdates.map(x=>'<article class="admin-feedback-card"><div class="admin-feedback-meta"><span class="badge">'+(x.type==="roadmap"?"Roadmap":"Update")+'</span><span>'+updateEsc(x.status)+'</span><span>'+(x.visible?"Public":"Ascuns")+'</span></div><p class="admin-message"><strong>'+updateEsc(x.title)+'</strong><br>'+updateEsc(x.description||"")+'</p><div class="admin-card-actions"><button class="secondary-btn" data-edit-update="'+x.id+'">Editează</button><button class="danger-btn" data-delete-update="'+x.id+'">Șterge</button></div></article>').join(""):'<div class="empty">Nu ai adăugat încă nimic.</div>';document.querySelectorAll("[data-edit-update]").forEach(b=>b.onclick=()=>editPortalUpdate(b.dataset.editUpdate));document.querySelectorAll("[data-delete-update]").forEach(b=>b.onclick=async()=>{if(confirm("Ștergi definitiv acest element?")){await db.from("portal_updates").delete().eq("id",b.dataset.deleteUpdate);loadPortalUpdates()}})}
function resetUpdateEditor(){$("updateEditor").reset();$("updateId").value="";$("updateOrder").value="100";$("updateVisible").checked=true;$("updateCancel").hidden=true;$("updateEditorStatus").textContent=""}
function editPortalUpdate(id){const x=portalUpdates.find(v=>String(v.id)===String(id));if(!x)return;$("updateId").value=x.id;$("updateType").value=x.type;$("updateStatus").value=x.status;$("updateTitle").value=x.title;$("updateDescription").value=x.description||"";$("updateDate").value=x.event_date||"";$("updateOrder").value=x.sort_order??100;$("updateVisible").checked=!!x.visible;$("updateCancel").hidden=false;$("updateEditor").scrollIntoView({behavior:"smooth",block:"start"})}
$("updateCancel").onclick=resetUpdateEditor;
$("updateEditor").onsubmit=async e=>{e.preventDefault();const id=$("updateId").value,payload={type:$("updateType").value,status:$("updateStatus").value,title:$("updateTitle").value.trim(),description:$("updateDescription").value.trim()||null,event_date:$("updateDate").value||null,sort_order:Number($("updateOrder").value)||100,visible:$("updateVisible").checked};if(!payload.title)return;const q=id?db.from("portal_updates").update(payload).eq("id",id):db.from("portal_updates").insert(payload);const {error}=await q;$("updateEditorStatus").textContent=error?"Nu s-a putut salva: "+error.message:"Salvat ✓";$("updateEditorStatus").className="feedback-status "+(error?"error":"success");if(!error){resetUpdateEditor();loadPortalUpdates()}};

const runtimeIssues=[];
window.addEventListener("error",e=>runtimeIssues.push(e.message||"Eroare JavaScript necunoscută"));
window.addEventListener("unhandledrejection",e=>runtimeIssues.push(String(e.reason||"Promise respins")));
const statusRank={ok:0,warn:1,error:2};
function statusCard(title,state,detail,meta=""){return '<article class="site-status-card" data-state="'+state+'"><div class="site-status-card-head"><span class="site-status-dot"></span><strong>'+esc(title)+'</strong><span class="site-status-label">'+(state==="ok"?"Operațional":state==="warn"?"Atenție":"Eroare")+'</span></div><p>'+esc(detail)+'</p>'+(meta?'<small>'+esc(meta)+'</small>':"")+'</article>'}
async function fetchHealth(url){try{const r=await fetch(url+(url.includes("?")?"&":"?")+"health="+Date.now(),{cache:"no-store"});return {ok:r.ok,status:r.status,response:r}}catch(e){return {ok:false,status:0,error:e}}}
async function readHealthData(){
  let r=await fetchHealth("data.json");
  if(r.ok){try{const j=await r.response.json();if(j&&j.updated&&Array.isArray(j.items))return j}catch{}}
  r=await fetchHealth("data.json.gz");if(!r.ok)throw new Error("Indexul de date nu răspunde");
  const buf=await r.response.arrayBuffer();
  try{const plain=new TextDecoder().decode(buf),j=JSON.parse(plain);if(j&&j.updated)return j}catch{}
  if(!("DecompressionStream" in window))throw new Error("Browserul nu poate verifica fișierul gzip");
  return JSON.parse(await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).text());
}
async function loadSiteStatus(){
  const grid=$("siteStatusGrid"),overall=$("siteOverall");if(!grid)return;
  grid.innerHTML='<div class="empty">Rulez diagnosticul…</div>';overall.dataset.state="checking";$("siteOverallText").textContent="Se verifică…";$("siteOverallNote").textContent="Testez componentele esențiale.";
  const checks=[],pages=["index.html","anunturi.html","cautare.html","documente.html","calendar.html"];
  const pageResults=await Promise.all(pages.map(fetchHealth)),failed=pageResults.filter(x=>!x.ok).length;
  checks.push({title:"Pagini principale",state:failed?"error":"ok",detail:failed?failed+" din "+pages.length+" pagini nu răspund corect.":"Toate cele "+pages.length+" pagini verificate răspund corect.",meta:failed?"Verifică GitHub Pages / deployment.":"Frontend disponibil"});
  try{const data=await readHealthData(),d=new Date(data.updated),age=(Date.now()-d.getTime())/36e5,state=!Number.isFinite(age)?"error":age>12?"error":age>6?"warn":"ok";
    const sourceStatus=Array.isArray(data.source_status)?data.source_status:[],cached=sourceStatus.filter(x=>x.used_cache);
    const sourceMeta=sourceStatus.length?(sourceStatus.length-cached.length)+"/"+sourceStatus.length+" surse verificate acum"+(cached.length?" · fallback: "+cached.map(x=>x.name).join(", "):""):"status surse indisponibil";
    if(cached.length&&state==="ok")state="warn";
    checks.push({title:"Index anunțuri",state,detail:Number.isFinite(age)?"Ultima actualizare: "+d.toLocaleString("ro-RO")+" · mod "+(data.mode||"necunoscut"):"Data ultimei actualizări este invalidă.",meta:(data.count??data.items?.length??0)+" elemente · "+sourceMeta})}catch(e){checks.push({title:"Index anunțuri",state:"error",detail:"Datele nu au putut fi citite.",meta:e.message||"Verifică workflow-ul crawlerului."})}
  try{const {error}=await db.from("feedback").select("id",{count:"exact",head:true});checks.push({title:"Supabase / Feedback",state:error?"error":"ok",detail:error?"Conexiunea la baza de date a eșuat.":"Conexiunea la baza de date funcționează.",meta:error?error.message:"Sesiunea admin și RLS răspund"})}catch(e){checks.push({title:"Supabase / Feedback",state:"error",detail:"Nu s-a putut testa baza de date.",meta:e.message||""})}
  const [sw,manifest]=await Promise.all([fetchHealth("sw.js"),fetchHealth("manifest.webmanifest")]);checks.push({title:"PWA / Service Worker",state:sw.ok&&manifest.ok?"ok":"error",detail:sw.ok&&manifest.ok?"Fișierele PWA sunt disponibile.":"Unul dintre fișierele PWA nu răspunde.",meta:"sw.js · manifest.webmanifest"});
  checks.push(runtimeIssues.length?{title:"Erori JavaScript",state:"warn",detail:runtimeIssues.length+" eroare/erori detectate în această sesiune Admin.",meta:runtimeIssues.slice(-2).join(" · ")}:{title:"Erori JavaScript",state:"ok",detail:"Nu au fost detectate erori JavaScript în această sesiune Admin.",meta:"Monitorizare locală în browser"});
  grid.innerHTML=checks.map(x=>statusCard(x.title,x.state,x.detail,x.meta)).join("");
  const worst=checks.reduce((a,x)=>statusRank[x.state]>statusRank[a]?x.state:a,"ok");overall.dataset.state=worst;$("siteOverallText").textContent=worst==="ok"?"Toate sistemele sunt operaționale":worst==="warn"?"Site funcțional, dar necesită atenție":"A fost detectată o problemă";$("siteOverallNote").textContent=worst==="ok"?"Nu am găsit probleme în verificările automate.":worst==="warn"?"Vezi elementele marcate cu Atenție mai jos.":"Vezi componenta marcată cu Eroare pentru cauza probabilă.";$("statusCheckedAt").textContent="Diagnostic rulat: "+new Date().toLocaleString("ro-RO");
}
$("statusRefresh").onclick=loadSiteStatus;

})();