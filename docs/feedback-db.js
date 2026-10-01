(()=>{"use strict";
const $=id=>document.getElementById(id),f=$("dbFeedbackForm"),s=$("dbFeedbackStatus"),b=$("feedbackSubmit");
if(!f)return;
const c=window.PORTAL_SUPABASE;
if(!c||!window.supabase){s.className="feedback-status error";s.textContent="Serviciul de feedback nu este disponibil momentan.";b.disabled=true;return}
const db=window.supabase.createClient(c.url,c.key);
f.onsubmit=async e=>{
  e.preventDefault();if($("feedbackWebsite").value)return;
  const message=$("feedbackMessage").value.trim(),category=$("feedbackCategory").value,name=$("feedbackName").value.trim(),email=$("feedbackEmail").value.trim();
  if(message.length<5||!category){s.className="feedback-status error";s.textContent="Completează categoria și un mesaj de cel puțin 5 caractere.";return}
  b.disabled=true;b.textContent="Se trimite…";s.textContent="";
  try{
    const {error}=await db.from("feedback").insert({category,message,name:name||null,email:email||null,program:"both",page:"feedback.html"});
    s.className="feedback-status "+(error?"error":"success");
    s.textContent=error?"Nu s-a putut trimite momentan. Încearcă din nou.":"Feedback trimis. Mulțumim! ✓";
    if(!error)f.reset();
  }catch(_){s.className="feedback-status error";s.textContent="Nu s-a putut contacta serviciul de feedback. Verifică conexiunea și încearcă din nou."}
  finally{b.disabled=false;b.textContent="Trimite feedback"}
};
})();