(() => {
  const $ = id => document.getElementById(id);
  const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const lsSet = (k,v) => { try { localStorage.setItem(k,v); } catch {} };
  const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const localDate = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  const fmtDate = d => new Date(d+"T00:00:00").toLocaleDateString("ro-RO",{day:"numeric",month:"short",year:"numeric"});
  const program = () => lsGet("prog") || "both";

  function getRecent(){ try { return JSON.parse(lsGet("recentItems")||"[]"); } catch { return []; } }
  function addRecent(title,url){
    if(!title||!url)return;
    let arr=getRecent().filter(x=>x.url!==url);
    arr.unshift({title,url,date:localDate(new Date())});
    lsSet("recentItems",JSON.stringify(arr.slice(0,8)));
    renderRecent();
  }
  function renderRecent(){
    const box=$("recentList"); if(!box)return;
    const arr=getRecent();
    box.innerHTML=arr.length?arr.slice(0,5).map(x=>'<li class="result"><a class="result-title" href="'+esc(x.url)+'" target="_blank" rel="noopener">'+esc(x.title)+'</a><div class="result-meta"><span>Accesat recent</span></div></li>').join(""):'<li class="empty">Nu ai accesat încă rezultate.</li>';
  }
  async function share(title,url){
    if(navigator.share){ try{ await navigator.share({title,text:title,url}); return; }catch(e){ if(e.name==="AbortError")return; } }
    try{ await navigator.clipboard.writeText(url); alert("Link copiat."); }catch{ prompt("Copiază linkul:",url); }
  }
  function enhanceResults(){
    document.querySelectorAll(".result").forEach(li=>{
      if(li.dataset.enhanced)return;
      const a=li.querySelector(".result-title"); if(!a)return;
      li.dataset.enhanced="1";
      a.addEventListener("click",()=>addRecent(a.textContent.trim(),a.href));
      const top=li.querySelector(".result-top") || a.parentElement;
      if(top && !li.querySelector(".share-mini")){
        const b=document.createElement("button");
        b.type="button"; b.className="share-mini"; b.textContent="↗"; b.setAttribute("aria-label","Distribuie");
        b.onclick=e=>{e.preventDefault();share(a.textContent.trim(),a.href)};
        top.appendChild(b);
      }
    });
  }
  const obs=new MutationObserver(enhanceResults);
  obs.observe(document.documentElement,{subtree:true,childList:true});
  enhanceResults(); renderRecent();

  async function loadIndex(){
    const gz=await fetch("data.json.gz",{cache:"no-cache"});
    if(gz.ok && "DecompressionStream" in window && gz.body){
      const text=await new Response(gz.body.pipeThrough(new DecompressionStream("gzip"))).text();
      return JSON.parse(text);
    }
    const r=await fetch("data.json",{cache:"no-cache"}); if(!r.ok)throw 0; return r.json();
  }
  async function updateNewsBadge(){
    try{
      const j=await loadIndex(); if(!Array.isArray(j.items))return;
      const seen=lsGet("seen")||localDate(new Date(Date.now()-7*86400000));
      const p=program();
      const n=j.items.filter(d=>d.type==="anunt"&&d.date&&d.date>=seen&&(p==="both"||((d.prog||[]).includes(p)))).length;
      lsSet("newCount",String(n));
      const s=$("sourceStatus");
      if(s){
        const d=j.updated?new Date(j.updated):null;
        s.textContent=d&&!isNaN(d)?"Index actualizat: "+d.toLocaleString("ro-RO")+" · "+j.items.length+" intrări":"Index disponibil";
      }
      document.querySelectorAll('.desktop-nav a[href="anunturi.html"]').forEach(a=>{
        let b=a.querySelector(".nav-badge");
        if(n&&!b){b=document.createElement("span");b.className="nav-badge";a.append(" ",b);}
        if(b){b.textContent=n>99?"99+":String(n);b.hidden=!n;}
      });
    }catch{}
  }
  if(["home","anunturi"].includes(document.body.dataset.page))updateNewsBadge();

  if(document.body.dataset.page==="anunturi"){
    const btn=$("onlyNew");
    if(btn){
      let on=false;
      btn.onclick=()=>{
        on=!on; btn.classList.toggle("on",on); btn.setAttribute("aria-pressed",String(on));
        document.querySelectorAll("#results .result").forEach(li=>{
          const isNew=!!li.querySelector(".new-tag");
          li.hidden=on&&!isNew;
        });
      };
    }
  }

  let installPrompt=null;
  window.addEventListener("beforeinstallprompt",e=>{
    e.preventDefault(); installPrompt=e;
    const b=$("installApp"); if(b)b.hidden=false;
  });
  const install=$("installApp");
  if(install) install.onclick=async()=>{ if(!installPrompt)return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt=null; install.hidden=true; };

  function initCalendar(){
    const grid=$("monthGrid"), form=$("calendarForm"); if(!grid||!form)return;
    const monthTitle=$("monthTitle");
    const MONTHS=["Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie","Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"];
    const official=[
      {date:"2026-09-30",title:"Festivitatea ULBS pentru anul I",note:"Piața Mare · 14:00",scope:"both"},
      {date:"2026-10-02",title:"Deschiderea anului la Facultatea de Medicină",note:"Aula Magna · 09:00",scope:"both"},
      {date:"2027-09-06",title:"Examen practică de vară / început sesiune restanțe",note:"Dată publicată de Facultatea de Medicină",scope:"both"}
    ];
    let view=new Date(); view.setDate(1);
    if(view.getFullYear()<2026||view.getFullYear()>2027)view=new Date(2026,9,1);
    let editId=null;
    const read=()=>{try{return JSON.parse(lsGet("calendarEvents")||"[]")}catch{return[]}};
    const write=v=>lsSet("calendarEvents",JSON.stringify(v));
    const visible=e=>e.scope==="both"||program()==="both"||e.scope===program();
    const all=()=>official.map(e=>Object.assign({kind:"official"},e)).concat(read().map(e=>Object.assign({kind:"personal"},e))).filter(visible);

    function renderList(){
      const box=$("calendarList"); if(!box)return;
      const ev=all().sort((a,b)=>a.date.localeCompare(b.date));
      box.innerHTML=ev.length?ev.map(e=>'<li class="calendar-item '+e.kind+'"><div><strong>'+esc(e.title)+'</strong><span>'+fmtDate(e.date)+(e.time?" · "+esc(e.time):"")+(e.note?" · "+esc(e.note):"")+'</span></div>'+(e.kind==="personal"?'<div class="calendar-actions"><button type="button" data-edit="'+esc(e.id)+'">Editează</button><button type="button" data-remove="'+esc(e.id)+'">✕</button></div>':'<span class="official-tag">Oficial</span>')+'</li>').join(""):'<li class="empty">Nu sunt evenimente.</li>';
      box.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{write(read().filter(e=>e.id!==b.dataset.remove));render()});
      box.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>{
        const e=read().find(x=>x.id===b.dataset.edit); if(!e)return; editId=e.id;
        $("eventTitle").value=e.title; $("eventDate").value=e.date; $("eventTime").value=e.time||""; $("eventCategory").value=e.category||"Personal"; $("eventNote").value=e.note||""; $("eventProgram").value=e.scope||"both"; $("saveEvent").textContent="Salvează modificările";
      });
    }
    function renderMonth(){
      monthTitle.textContent=MONTHS[view.getMonth()]+" "+view.getFullYear();
      const first=(new Date(view.getFullYear(),view.getMonth(),1).getDay()+6)%7;
      const days=new Date(view.getFullYear(),view.getMonth()+1,0).getDate();
      const prevDays=new Date(view.getFullYear(),view.getMonth(),0).getDate();
      const events=all(); let html="";
      for(let i=0;i<42;i++){
        let day,off=0,muted=false;
        if(i<first){day=prevDays-first+i+1;off=-1;muted=true}else if(i>=first+days){day=i-first-days+1;off=1;muted=true}else day=i-first+1;
        const dt=new Date(view.getFullYear(),view.getMonth()+off,day), key=localDate(dt), ev=events.filter(e=>e.date===key), today=key===localDate(new Date());
        html+='<button type="button" class="month-day'+(muted?" muted":"")+(today?" today":"")+'" data-date="'+key+'"><span class="day-num">'+day+'</span><span class="day-events">'+ev.slice(0,3).map(e=>'<span class="event-dot '+e.kind+'" title="'+esc(e.title)+'"></span>').join("")+'</span>'+(ev.length?'<small>'+ev.length+' ev.</small>':"")+'</button>';
      }
      grid.innerHTML=html;
      grid.querySelectorAll("[data-date]").forEach(b=>b.onclick=()=>{$("eventDate").value=b.dataset.date;$("eventTitle").focus()});
    }
    function render(){renderMonth();renderList()}
    $("prevMonth").onclick=()=>{view.setMonth(view.getMonth()-1);renderMonth()};
    $("nextMonth").onclick=()=>{view.setMonth(view.getMonth()+1);renderMonth()};
    $("todayMonth").onclick=()=>{view=new Date();view.setDate(1);renderMonth()};
    form.onsubmit=e=>{
      e.preventDefault();
      const title=$("eventTitle").value.trim(),date=$("eventDate").value;if(!title||!date)return;
      const arr=read(), obj={id:editId||String(Date.now()),title,date,time:$("eventTime").value,category:$("eventCategory").value,note:$("eventNote").value.trim(),scope:$("eventProgram").value};
      const idx=arr.findIndex(x=>x.id===editId); if(idx>=0)arr[idx]=obj; else arr.push(obj); write(arr); editId=null; form.reset(); $("saveEvent").textContent="Adaugă eveniment"; render();
    };
    document.addEventListener("programchange",render); render();
  }
  initCalendar();
})();