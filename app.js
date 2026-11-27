import { NexusCorpsV12, NexusRate, ajouterMemoire, CATALOGUES } from "./nexus-corps.mjs";
import * as JN from "./journal.js";
import { GUIDE_HTML } from "./guide.js";
import { VERSION, WORKER_URL, SITE_URL, POLLINATIONS_KEY, LIMITES_JOUR, MODELES_PERSO } from "./config.js";
import { PAGES, ORDRE, ACCUEIL } from "./legal.js";
import { compresser, texteLisible, normaliserReponse } from "./compression.js";
import * as IMG from "./stockage.js";
const $=s=>document.querySelector(s),V=VERSION;
const S={g(k,d){try{const v=localStorage.getItem('nexus_'+k);return v===null?d:JSON.parse(v)}catch{return d}},s(k,v){try{localStorage.setItem('nexus_'+k,JSON.stringify(v));return true}catch(e){return false}}};
const st={perso:S.g('perso',[]),legal:null,card:null,on:S.g('on',{}),convs:S.g('convs',[]),cur:S.g('cur',null),saved:S.g('saved',[]),busy:0,tests:[],sug:null,msg:''};
let pf=null;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=t=>t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/['’]/g,' ').replace(/\s+/g,' ').trim();
const num=s=>parseFloat(String(s).replace(',','.')),fx=x=>+x.toFixed(4);
function toast(m){const e=$('#ts');e.textContent=m;e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display='none',2800)}
let dernierL=null;
function L(type,d={}){if((type==='js_rejection'||type==='js_error')&&dernierL&&dernierL.type===type&&dernierL.msg===d.msg&&dernierL.at===(d.at||'')&&Date.now()-dernierL.t<30000)return;dernierL={type,msg:d.msg,at:d.at||'',t:Date.now()};JN.log(type,d)}
addEventListener('error',e=>L('js_error',{msg:e.message,at:(e.filename||'').split('/').pop()+':'+e.lineno}));
addEventListener('unhandledrejection',e=>{const msg=String(e.reason&&e.reason.message||e.reason).slice(0,200);L('js_rejection',{msg});if(/popErrorScope|device.*lost/i.test(msg))JN.log('webgpu_perdu',{msg:msg.slice(0,100)})});
const U={km:['l',1000],m:['l',1],cm:['l',.01],mm:['l',.001],mi:['l',1609.344],miles:['l',1609.344],ft:['l',.3048],pieds:['l',.3048],kg:['m',1],g:['m',.001],lb:['m',.45359237],livres:['m',.45359237],l:['v',1],ml:['v',.001],gal:['v',3.785411784],c:['t'],celsius:['t'],f:['t'],fahrenheit:['t'],kmh:['s',1],mph:['s',1.609344]};
const CITY={paris:'Europe/Paris',londres:'Europe/London',berlin:'Europe/Berlin',madrid:'Europe/Madrid',rome:'Europe/Rome',moscou:'Europe/Moscow',istanbul:'Europe/Istanbul',casablanca:'Africa/Casablanca',alger:'Africa/Algiers',tunis:'Africa/Tunis',dakar:'Africa/Dakar',abidjan:'Africa/Abidjan',lagos:'Africa/Lagos',"le caire":'Africa/Cairo',dubai:'Asia/Dubai',tokyo:'Asia/Tokyo',pekin:'Asia/Shanghai',shanghai:'Asia/Shanghai',seoul:'Asia/Seoul',bangkok:'Asia/Bangkok',delhi:'Asia/Kolkata',sydney:'Australia/Sydney',"new york":'America/New_York',montreal:'America/Toronto',chicago:'America/Chicago',"los angeles":'America/Los_Angeles',"sao paulo":'America/Sao_Paulo',"mexico":'America/Mexico_City'};
const CUR=x=>/^euro/.test(x)?'EUR':/^dollar/.test(x)?'USD':x.toUpperCase();
const wc=c=>c===0?'ciel dégagé':c<4?'nuageux':c<50?'brouillard':c<60?'bruine':c<70?'pluie':c<80?'neige':c<85?'averses':c<95?'averses de neige':'orage';
const fd=d=>d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const J=async u=>{const r=await fetch(u);if(!r.ok)throw new Error(r.status);return r.json()};
async function local(raw){const n=norm(raw),now=new Date();let m;
if(m=n.match(/^(bonjour|salut|hello|coucou|bonsoir|hey|cc)( nexus)?\s*[!.?]*$/))return(now.getHours()<18?'Bonjour':'Bonsoir')+' ! Je suis NEXUS 👋 Posez-moi une question ou tapez **aide**.';
if(/^(merci|merci beaucoup|thanks)( nexus)?\s*[!.]*$/.test(n))return'Avec plaisir ! 😊';
if(/^(qui es[- ]tu|tu es qui|presente[- ]toi)\??$/.test(n))return'Je suis **NEXUS**, un assistant qui répond seul aux demandes simples et choisit une IA gratuite quand c\'est nécessaire.';
if(/^(aide|help|commandes|que (sais|peux)[- ]tu faire)\??$/.test(n))return'**En local (0 crédit)** : calculs, pourcentages, conversions (`10 km en mi`), devises, dates, heure, météo, Wikipédia, dés, pile ou face, mot de passe, `compte mots : texte`.\n**Forcer une IA** : `/groq`, `/gemini`, `/local` + votre question.';
if(/^(quelle heure est[- ]il|il est quelle heure)\??$/.test(n))return'Il est **'+now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})+'** ('+fd(now)+').';
if(m=n.match(/^(?:quelle heure est[- ]il|il est quelle heure) (?:a|au|en) (.+?)\??$/)){const z=CITY[m[1].trim()];if(z)return'À **'+m[1].trim()+'** il est **'+now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',timeZone:z})+'**.'}
if(/^(quel jour (sommes|est)[- ]nous|on est quel jour|quelle est la date( d aujourd hui)?|date d aujourd hui|quelle date sommes[- ]nous)\??$/.test(n))return'Nous sommes le **'+fd(now)+'**.';
if(m=n.match(/^dans (\d+) (jours?|semaines?|mois|ans?)\??$/)){const d=new Date(),k=+m[1];/^jour/.test(m[2])?d.setDate(d.getDate()+k):/^sem/.test(m[2])?d.setDate(d.getDate()+7*k):m[2]==='mois'?d.setMonth(d.getMonth()+k):d.setFullYear(d.getFullYear()+k);return'📅 Dans '+m[1]+' '+m[2]+', nous serons le **'+fd(d)+'**.'}
if(/^(pile ou face|lance une piece)\??$/.test(n))return'🪙 **'+(Math.random()<.5?'Pile':'Face')+'** !';
if(m=n.match(/^(?:lance|jette|roule) (?:un )?des? ?(?:a )?(\d+)? ?(?:faces)?\??$/)){const f=Math.max(2,+m[1]||6);return'🎲 Dé à '+f+' faces : **'+(1+Math.floor(Math.random()*f))+'**'}
if(m=n.match(/^(?:genere|cree|creer|donne)(?:[- ]moi)? un (?:mot de passe|mdp)(?: de (\d+) caracteres)?\??$/)){const L2=Math.min(64,Math.max(8,+m[1]||16)),cs='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';let p='';for(const v of crypto.getRandomValues(new Uint32Array(L2)))p+=cs[v%cs.length];return'🔐 Mot de passe :\n\n`'+p+'`'}
if(m=n.match(/^(\d+(?:[.,]\d+)?)\s*%\s*de\s*(\d+(?:[.,]\d+)?)\??$/))return'**'+m[1]+' % de '+m[2]+' = '+fx(num(m[1])*num(m[2])/100)+'**';
if(/^[\d\s+\-*/().,^%x×÷]+$/.test(n)&&/\d/.test(n)&&/[+\-*/^x×÷]/.test(n)&&!/^\d{4}-\d{2}-\d{2}$/.test(n)){const e=n.replace(/,/g,'.').replace(/[x×]/g,'*').replace(/÷/g,'/').replace(/\^/g,'**').replace(/%/g,'/100');if(/^[\d\s+\-*/().]+$/.test(e))try{const v=Function('"use strict";return('+e+')')();if(typeof v==='number'&&isFinite(v))return'**'+raw.trim()+' = '+fx(v)+'**'}catch{}}
if(m=n.replace(/km\/h/g,'kmh').match(/^(-?\d+(?:[.,]\d+)?)\s*([a-z]+)\s+(?:en|to|vers)\s+([a-z]+)\??$/)){const A=U[m[2]],B=U[m[3]],x=num(m[1]);if(A&&B&&A[0]===B[0]){let r;if(A[0]==='t'){const f=/^f/.test(m[2]),g=/^f/.test(m[3]);r=f===g?x:f?(x-32)*5/9:x*9/5+32}else r=x*A[1]/B[1];return'📏 **'+x+' '+m[2]+' = '+fx(r)+' '+m[3]+'**'}}
return null}
function wait(m){st.msg=m;const e=document.getElementById('typ');if(e)e.textContent=m}
const SUG=[{i:'👋',t:'Bonjour !'},{i:'🌤️',t:'Météo à Paris',q:'Météo Paris'},{i:'💱',t:'100 euros en dollars'},{i:'📅',t:'Dans 3 semaines'},{i:'🕐',t:'Quelle heure est-il à Tokyo ?'},{i:'🎲',t:'Lance un dé'},{i:'🔐',t:'Génère-moi un mot de passe'},{i:'📖',t:'Qui est Marie Curie ?'},{i:'🧮',t:'15 % de 240'},{i:'📏',t:'10 km en miles'},{i:'🧠',t:'Explique-moi ce qu\'est une étoile simplement'},{i:'⚡',t:'Écris-moi une fonction JavaScript'},{i:'✍️',t:'Raconte-moi une histoire drôle'},{i:'🌍',t:'Traduis « bonjour » en anglais'},{i:'🍳',t:'Une idée de dîner rapide ?'}];
function pick3(){const a=[...SUG];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a.slice(0,3)}
const SUG2=[{i:'🎨',t:'Génère-moi une image de coucher de soleil'},{i:'🌡️',t:'Convertis 25 °C en °F'},{i:'⏳',t:'Combien de jours avant Noël ?'},{i:'🐍',t:'Écris un script Python pour trier une liste'},{i:'💡',t:'Donne-moi une idée de cadeau'},{i:'🧘',t:'Un exercice de respiration de 2 minutes'},{i:'🗺️',t:'Idées de week-end en France'},{i:'🔤',t:'Corrige : je suis aller au marché'},{i:'📝',t:'Aide-moi à écrire un message poli'},{i:'🎵',t:'Une idée de playlist pour travailler'}];SUG.push(...SUG2);
function sugHtml(){const x=st.sug[0];return'<button class="sug fl" data-q="'+esc(x.q||x.t)+'">'+x.i+' '+esc(x.t)+'</button>'}
function welcome(){if(!st.sug)st.sug=pick3();return'<div class="wel"><div class="sugs">'+sugHtml()+'</div></div>'}
function syncAv(){const b=document.getElementById('bgav');if(!b)return;const c=cur0(),v=document.querySelector('.v.on'),chat=!v||v.id==='v-chat';b.className=chat?((!c||!c.m.length)?'home':'chat'):'off'}
const avw=document.querySelector('#bgav .avw');let dernierAv='';
function animAv(){if(document.hidden||!avw)return;const c=cur0();if(c&&c.m.length&&Math.random()<.5)return;const k=['doWave','doWink','doSpin','doHop'].filter(x=>x!==dernierAv)[Math.floor(Math.random()*3)];dernierAv=k;avw.classList.add(k);setTimeout(()=>avw.classList.remove(k),2400)}
setInterval(animAv,5200);setTimeout(animAv,1200);
setInterval(()=>{const c=cur0();if(document.hidden||st.busy||(c&&c.m.length))return;const el=document.querySelector('#v-chat.on .sugs');if(!el)return;const prev=st.sug&&st.sug[0]&&st.sug[0].t;let n=pick3();if(n[0].t===prev)n=pick3();st.sug=n;el.classList.add('out');setTimeout(()=>{el.innerHTML=sugHtml();el.classList.remove('out')},350)},6000);
let TL=null;
const TP=import('./nexus-tools.js').then(m=>{TL=m;return m}).catch(e=>{L('tools_error',{msg:String(e&&e.message||e).slice(0,160)});return null});
const needTools=async()=>{const m=TL||await TP;if(!m)throw new Error('Module outils indisponible');return m};
const g=id=>document.getElementById(id);
const IMGQ=0;
async function runOcr(){if(!pf||pf.kind!=='image')return;st.card=null;st.busy=1;st.msg='Lecture du texte de l\'image (sur le téléphone, gratuit)…';updSb();render();let again=false;try{const T=await needTools();const txt=await T.ocrImage(pf.file||pf.img,p=>wait('Lecture du texte… '+p));if(!txt||txt.length<3){toast('Aucun texte détecté dans l\'image');return}pf={name:pf.name+' (texte lu)',size:txt.length,kind:'text',text:txt.slice(0,20000),trunc:txt.length>20000,src:'ocr'};chip();again=true}catch(e){L('ocr_error',{msg:String(e&&e.message||e).slice(0,120)});toast('Lecture impossible : '+(e&&e.message||'erreur'))}finally{st.busy=0;st.msg='';updSb();render()}if(again)await proposeCard()}
async function showDl(i){const c=cur0(),m=c&&c.m[i];if(!m)return;let T;try{T=await needTools()}catch(e){toast(e.message);return}st.dlm=m;g('dlbox').innerHTML='<div class="set-title" style="margin-bottom:8px">Télécharger la réponse</div>'+T.exportFormats(m.c).map(f=>'<button class="b2" data-fmt="'+f.fmt+'">'+esc(f.label)+'</button>').join('')+'<button class="b2" data-fmt="">Fermer</button>';g('dlmenu').style.display='flex'}
async function exportMsg(fmt){toast('Création du fichier…');try{const T=await needTools(),r=await T.makeFile(fmt,st.dlm.c,(cur0()&&cur0().t)||'nexus'),res=await T.saveBlob(r.blob,r.name);toast(res==='cancel'?'Annulé':'Fichier prêt : '+r.name)}catch(e){L('export_error',{msg:String(e&&e.message||e).slice(0,120)});toast('Création impossible : '+(e&&e.message||'erreur'))}}
const cur0=()=>st.convs.find(c=>c.id===st.cur);
const idsImages=c=>(c.m||[]).flatMap(m=>[m.imgId,m.file&&m.file.fullId]).filter(Boolean);
const persistable=c=>({...c,m:c.m.map(m=>{let o=m;if(o.img&&(o.imgId||!/^https?:/.test(o.img))){o={...o,img:null};if(!o.imgId)o={...o,c:o.c+' (image non conservée)'}}if(o.file&&o.file.full)o={...o,file:{...o.file,full:undefined}};return o})});
function save(){if(st.convs.length>50){IMG.supprimer(st.convs.slice(0,-50).flatMap(idsImages));st.convs=st.convs.slice(-50)}
  let ok=S.s('convs',st.convs.map(persistable));
  while(!ok&&st.convs.length>1){const old=st.convs.shift();IMG.supprimer(idsImages(old));if(st.cur===old.id)st.cur=null;JN.log('stockage_plein',{n:st.convs.length});ok=S.s('convs',st.convs.map(persistable))}
  S.s('cur',st.cur)}
// Rend leurs images aux messages d'une conversation (elles vivent dans IndexedDB, pas dans la conversation).
async function rehydrater(c){if(!c)return;let change=false;for(const m of c.m){if(m.imgId&&!m.img){const u=await IMG.lire(m.imgId);if(u){m.img=u;change=true}}if(m.file&&m.file.fullId&&!m.file.full){const u=await IMG.lire(m.file.fullId);if(u){m.file.full=u;change=true}}}if(change&&cur0()===c)render()}
function cur(){let c=cur0();if(!c){c={id:Date.now(),t:'',d:Date.now(),m:[]};st.convs.push(c);st.cur=c.id}return c}
function md(t){const sp=[],k=h=>{sp.push(h);return'\u0001'+(sp.length-1)+'\u0001'};let h=String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
h=h.replace(/```\w*\n?([\s\S]*?)```/g,(m,c)=>k('<pre><code>'+c.replace(/\n$/,'')+'</code></pre>')).replace(/`([^`\n]+)`/g,(m,c)=>k('<code>'+c+'</code>'));
const inl=x=>x.replace(/\*\*([^*\n]+)\*\*/g,'<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g,'$1<i>$2</i>').replace(/\[([^\]]+)\]\((https?:[^)"\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
const ls=h.split('\n'),o=[],isR=x=>/^\s*\|.*\|\s*$/.test(x);
for(let i=0;i<ls.length;){if(isR(ls[i])){let j=i;while(j<ls.length&&isR(ls[j]))j++;const rows=ls.slice(i,j).filter(r=>!/^\s*\|(\s*:?-{2,}:?\s*\|)+\s*$/.test(r)).map(r=>r.trim().replace(/^\||\|$/g,'').split('|').map(x=>x.trim()));if(j-i>=2&&rows.length){o.push(k('<div class="tb"><table>'+rows.map((r,ri)=>'<tr>'+r.map(x=>(ri===0?'<th>':'<td>')+inl(x)+(ri===0?'</th>':'</td>')).join('')+'</tr>').join('')+'</table></div>'));i=j;continue}}o.push(ls[i]);i++}
h=o.join('\n');
h=h.replace(/^#{1,6}\s*(.+)$/gm,'<b>$1</b>').replace(/^\s*[-*]\s+/gm,'• ').replace(/^&gt;\s?(.+)$/gm,'<span class="bq">$1</span>').replace(/^\s*(?:-{3,}|\*{3,})\s*$/gm,'<hr>');
h=inl(h);
return h.replace(/\n/g,'<br>').replace(/\u0001(\d+)\u0001/g,(m,i)=>sp[i]).replace(/<\/table><\/div><br>/g,'</table></div>').replace(/<hr><br>/g,'<hr>')}
function fileThumb(f){if(!f)return'';if(f.kind==='image'&&(f.thumb||f.full))return'<div class="ath"><img class="th" data-lb="'+esc(f.full||f.thumb)+'" src="'+esc(f.thumb||f.full)+'" alt="'+esc(f.name)+'"><span>'+esc(f.name)+'</span></div>';return'<div class="ath"><div class="fi">'+(f.kind==='image'?'🖼️':'📄')+'</div><span>'+esc(f.name)+(f.size?' · '+kb(f.size):'')+'</span></div>'}
function render(){const c=cur0(),e=$('#msgs');if(!c||!c.m.length){e.innerHTML=welcome()+cardHtml();syncAv();return}
e.innerHTML=c.m.map((m,i)=>{if(m.r==='user')return`<div class="m user"><div class="bb">${fileThumb(m.file)}${esc(m.c)}</div></div>`;
const body=m.img?'<div>'+md(m.c)+'</div><img class="gimg" loading="lazy" data-lb="'+esc(m.img)+'" src="'+esc(m.img)+'" alt="'+esc(m.prompt||'image')+'">':md(m.c);
const srcs=(m.src&&m.src.length)?'<div class="srcs">🔎 Sources : '+m.src.filter(x=>/^https?:/i.test(x.u)).map(x=>'<a href="'+esc(x.u)+'" target="_blank" rel="noopener">'+esc(x.t)+'</a>').join(' · ')+'</div>':'';
return`<div class="m ai"><div class="bb">${body}</div>${srcs}<div class="mt"><span class="who"><img src="avatar.png" class="av" alt="">NEXUS</span><button data-a="cp" data-i="${i}" title="Copier">📋</button><button data-a="tts" data-i="${i}" title="Écouter">🔊</button>${m.img?`<button data-a="imgsave" data-i="${i}">💾</button><button data-a="imgnew" data-i="${i}">🔄</button>`:(m.err?'':`<button data-a="dl" data-i="${i}">⬇️</button>`)}<button data-a="sv" data-i="${i}">Sauvegarder</button><button data-a="gd" data-i="${i}" class="${m.good?'on':''}" title="Bonne réponse">👍</button><button data-a="bd" data-i="${i}" class="${m.bad?'on bad':''}" title="Mauvaise réponse">👎</button>${m.pbtn?'<button class="b2 pcn" data-a="pcn">🔌 Se connecter à Puter (gratuit)</button>':''}${(m.via&&!m.err&&!m.img)?`<button data-a="re" data-i="${i}">🔁 Redemander à une autre IA</button>`:''}</div></div>`}).join('')+(st.busy?'<div class="m ai"><div class="bb" id="typ">'+esc(st.msg||'…')+'</div></div>':'')+cardHtml();e.scrollTop=e.scrollHeight;syncAv()}
function openLb(s){const l=$('#lb');if(!l)return;l.querySelector('img').src=s;l.hidden=false;JN.log('plein_ecran',{})}
$('#lb').onclick=()=>{$('#lb').hidden=true};
function say(c,o){if(typeof o.c==='string'&&!o.err)o.c=normaliserReponse(o.c);c.m.push({r:'ai',...o});save();render()}
// ---------- Nexus : créé UNE seule fois ----------
const nx=new NexusCorpsV12();
try{const m=S.g('memoires',[]);if(Array.isArray(m))nx.memoires=m}catch{}
const entrees=()=>[...nx.annuaire.entrees.values()];
const groupe=e=>{const t=e.tags||[];return t.includes('perso')?'perso':t.includes('groq')?'groq':t.includes('openrouter')?'openrouter':t.includes('cloudflare')?'cloudflare':t.includes('puter')?'puter':t.includes('pollinations')?'pollinations':'autre'};
const actifs=()=>entrees().filter(e=>e.actif!==false);
let puterOK=false,LASTVIA=null,cfV=1,cfCaps={};
const GJ=()=>{const d=new Date().toISOString().slice(0,10);let c=S.g('cnt',{});if(!c||c.d!==d)c={d};return c};
const incr=g=>{const c=GJ();c[g]=(c[g]||0)+1;S.s('cnt',c)};
// ---------- Puter : aucune fenêtre d'erreur, aucune attente ----------
// Toute erreur Puter est écrite dans le journal, jamais montrée. Un appel Puter ne dure jamais plus de 15 s,
// et dès que Puter n'a plus de crédit ou de connexion, Nexus l'écarte (voir annuaire.signalerEchec) au lieu de le réessayer.
const WO=window.open.bind(window);let puterBg=0,puterSignIn=false;
const limite=(p,ms)=>{let t;return Promise.race([p,new Promise((_,ko)=>{t=setTimeout(()=>ko(Object.assign(new Error('délai dépassé'),{status:408,kind:'timeout'})),ms)})]).finally(()=>clearTimeout(t))};
function puterSilence(){const cache=n=>{if(puterSignIn||!n||n.nodeType!==1)return;const tag=(n.tagName||'').toLowerCase(),cls=String(n.className&&n.className.baseVal!==undefined?n.className.baseVal:n.className||''),id=n.id||'',src=n.src||'';if(/^puter-/.test(tag)||/puter/i.test(cls)||/^puter/i.test(id)||(tag==='iframe'&&/puter\.(com|site)/i.test(src))){n.style.setProperty('display','none','important');JN.log('puter_popup_masque',{tag})}};
  const ob=new MutationObserver(ms=>{for(const m of ms)m.addedNodes.forEach(cache)});const go=()=>{ob.observe(document.documentElement,{childList:true});document.body&&ob.observe(document.body,{childList:true})};document.body?go():addEventListener('DOMContentLoaded',go)}
puterSilence();
const erreurPuter=(kind,msg)=>Object.assign(new Error(msg||('Puter '+kind)),{kind,status:kind==='auth'?401:kind==='quota'?429:kind==='timeout'?408:500});
async function puterChat(...args){
  if(!puterOK||!window.puter)throw erreurPuter('auth','Puter non connecté');
  try{if(!window.puter.auth.isSignedIn())throw erreurPuter('auth','Puter déconnecté')}catch(e){if(e.kind)throw e}
  puterBg++;if(puterBg===1)window.open=function(...a){if(puterSignIn)return WO(...a);JN.log('puter_fenetre_bloquee',{});return null};
  try{const pr=window.puter.ai.chat(...args);pr.catch&&pr.catch(()=>{});return await limite(pr,15000)}
  catch(e){if(e&&e.kind&&e.status)throw e;const m=String(e&&(e.message||e.error?.message||e.error)||e)+JSON.stringify(e||{});const er=new Error(m.slice(0,200));
    if(/credit|crédit|insufficient|quota|limit|402|429|balance|funds|allowance|payment|upgrade|usage/i.test(m)){er.status=429;er.kind='quota'}else if(/auth|sign.?in|login|401|token/i.test(m)){er.status=401;er.kind='auth'}else er.status=500;
    JN.log('puter_erreur',{msg:m.slice(0,200),kind:er.kind});throw er}
  finally{puterBg--;if(!puterBg)window.open=WO}}
// Crédit restant du compte Puter (si Puter le dit) : on évite d'appeler Puter quand il est vide.
async function puterCredit(){try{if(!puterOK||!window.puter.auth.getMonthlyUsage)return null;const u=await limite(Promise.resolve(window.puter.auth.getMonthlyUsage()),4000),r=u&&u.allowanceInfo&&u.allowanceInfo.remaining;JN.log('puter_credit',{ok:typeof r==='number'?r>0:null});return typeof r==='number'?r>0:null}catch(e){JN.log('puter_credit',{ok:null,msg:String(e&&e.message||e).slice(0,80)});return null}}
// Journal de chaque appel + plafond quotidien sur les crédits partagés de Nexus (Cloudflare, Pollinations).
function enrober(){for(const en of nx.annuaire.entrees.values()){if(en._w)continue;const o=en.transport,g=groupe(en);en.transport=async(arg)=>{const t0=Date.now(),lim=LIMITES_JOUR[g],test=!!(arg&&arg.test);
  if(lim&&!test&&(GJ()[g]||0)>=lim){JN.log('plafond_jour',{ia:en.id,groupe:g,limite:lim});const e=new Error('plafond quotidien');e.status=429;e.kind='quota';throw e}
  JN.log('ia_appel',{id:en.id,groupe:g,test,fonctionnalite:arg&&arg.fonctionnalite,nb_messages:arg&&arg.messages&&arg.messages.length,taille:JSON.stringify(arg&&arg.messages||'').length});if(lim&&!test)incr(g);
  try{const r=await o(arg);JN.log('ia_ok',{id:en.id,ms:Date.now()-t0,texte:String(r&&r.texte||'').slice(0,4000)});if(!test)LASTVIA=en.id;return r}
  catch(e){JN.log('ia_erreur',{id:en.id,fournisseur:nx.annuaire.fournisseurDe(en),ms:Date.now()-t0,statut:e&&e.status,type:e&&e.kind,msg:String(e&&(e.message||e.error?.message)||e).slice(0,300)});throw e}};en._w=1}}
const NR=Object.values(nx).find(v=>v instanceof NexusRate);let nrT='';
function syncRate(){if(!NR)return;for(const e of (NR.entries||[]).filter(x=>x.date>nrT)){JN.log('corps_'+e.type,e);nrT=e.date}}
const nm=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/['’\-]/g,' ').replace(/\s+/g,' ').trim();
const cap1=s=>s?s[0].toUpperCase()+s.slice(1):s;
function apprendre(t){try{let m=ajouterMemoire(t);if(!m){const x=String(t).match(/\b(?:mon (?:nom|prenom|prénom) (?:est|c'est|c’est)|je me (?:prénomme|prenomme|nomme)|moi c'est|moi c’est)\s+([A-Za-zÀ-ÿ'’-]{2,30})/i);if(x)m={categorie:'identite',texte:"Je m'appelle "+cap1(x[1])+".",date:new Date().toISOString()}}if(m&&!nx.memoires.some(k=>nm(k.texte)===nm(m.texte))){nx.memoires.push(m);S.s('memoires',nx.memoires);JN.log('memoire_ajout',m)}}catch(e){JN.log('memoire_erreur',{msg:String(e&&e.message||e)})}}
function memRepondre(t){const n=nm(t),nom=()=>{const k=nx.memoires.find(x=>/m'appelle/i.test(x.texte||''));return k?String(k.texte).replace(/^Je m'appelle\s*/i,'').replace(/\.$/,''):null};
if(/(comment je m appelle|quel est mon (prenom|nom)|tu connais mon (prenom|nom)|tu sais comment je m appelle|tu te souviens de mon (prenom|nom))/.test(n)){const p=nom();return p?'Tu t\'appelles '+p+'.':'Je ne sais pas encore comment tu t\'appelles. Dis-moi : « Je m\'appelle … ».'}
if(/(que sais tu de moi|qu est ce que tu sais de moi|ce que tu sais sur moi|dis moi ce que tu sais de moi)/.test(n)){return nx.memoires.length?'Voici ce que je retiens de toi :\n'+nx.memoires.map(x=>'• '+x.texte).join('\n'):'Je ne sais encore rien sur toi. Dis-moi par exemple : « Je m\'appelle … » ou « J\'aime … ».'}return null}
function mkThumb(d){return new Promise(ok=>{try{const im=new Image();im.onload=()=>{try{const k=Math.min(1,140/Math.max(im.naturalWidth,im.naturalHeight)),cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(im.naturalWidth*k));cv.height=Math.max(1,Math.round(im.naturalHeight*k));cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);ok(cv.toDataURL('image/jpeg',.6))}catch{ok('')}};im.onerror=()=>ok('');im.src=d}catch{ok('')}})}
const prenomMem=()=>{const k=nx.memoires.find(x=>/m'appelle/i.test(x.texte||''));return k?String(k.texte).replace(/^Je m'appelle\s*/i,'').replace(/\.$/,'').trim():''};
let dernierTalk='';
function smallTalk(t){const n=nm(t);if(n.length>48||/\d/.test(n))return null;const p=prenomMem(),h=new Date().getHours(),soir=h>=18||h<5;const P=p?' '+p:'';let pool=null;
 if(/^(salut|bonjour|bonsoir|coucou|hello|hey|yo|hola|salutations)( nexus)?[ !.?]*$/.test(n))pool=[(soir?'Bonsoir':'Bonjour')+P+' ! Ravi de te retrouver. Qu\'est-ce que je peux faire pour toi ?','Salut'+P+' ! Dis-moi ce dont tu as besoin.',(soir?'Bonsoir':'Bonjour')+P+' ! Une question, un calcul, une idée ? Je t\'écoute.','Hello'+P+' ! Comment puis-je t\'aider aujourd\'hui ?'];
 else if(/^(ca va|comment (ca va|vas tu|tu vas|allez vous|va)|tu vas bien|la forme|comment tu vas)( nexus)?[ ?!.]*$/.test(n))pool=['Ça va très bien, merci ! Et toi, comment se passe ta journée ?','Au top, merci de demander ! Et de ton côté ?','Je vais bien, prêt à t\'aider. Et toi, ça va ?'];
 else if(/^(ca va bien|tres bien|bien et toi|je vais bien|ca roule|nickel|ca va super|pas mal)[ !.]*$/.test(n))pool=['Content de l\'entendre ! Je peux t\'aider sur quelque chose ?','Tant mieux ! Qu\'est-ce que je peux faire pour toi ?'];
 else if(/^(merci|merci beaucoup|ok merci|super merci|thanks|thx|mille mercis|je te remercie|merci nexus)[ !.]*$/.test(n))pool=['Avec plaisir !','De rien'+P+', n\'hésite pas si tu as besoin d\'autre chose.','Je t\'en prie ! C\'est toujours un plaisir.'];
 else if(/^(au revoir|a demain|a bientot|a plus|a plus tard|bye|bonne nuit|bonne journee|bonne soiree|ciao|a la prochaine)( nexus)?[ !.]*$/.test(n))pool=[/nuit/.test(n)?'Bonne nuit'+P+' ! Fais de beaux rêves.':'À bientôt'+P+' ! Prends soin de toi.','À la prochaine'+P+' !',/nuit/.test(n)?'Bonne nuit ! À demain.':'Au revoir'+P+', et bonne continuation !'];
 else if(/^(qui es tu|tu es qui|c est quoi nexus|presente toi|tu fais quoi|que sais tu faire|tu es quoi)[ ?!.]*$/.test(n))pool=['Je suis NEXUS, ton assistant IA. Je réponds seul aux demandes simples (calculs, conversions, heure, météo…) et je fais appel à la bonne IA quand il le faut. Écris « aide » pour voir tout ce que je sais faire.'];
 else if(/^(bravo|bien joue|genial|parfait|excellent|trop fort|j adore|top|super|cool|magnifique)[ !.]*$/.test(n))pool=['Merci, ça me fait plaisir !','Content que ça te plaise !','Merci'+P+' ! On continue ?'];
 else if(/^(lol|mdr|haha+|hihi|ptdr|xd)[ !.]*$/.test(n))pool=['Content que ça te fasse sourire !','Haha ! 😄','Ça fait plaisir de te voir de bonne humeur.'];
 else if(/^(ok|d accord|ca marche|entendu|compris|oui|non|ok d accord)[ !.]*$/.test(n))pool=['Parfait !','Très bien. Dis-moi si tu as besoin de quelque chose.','D\'accord !'];
 if(!pool)return null;const ch=pool.filter(x=>x!==dernierTalk);dernierTalk=ch[Math.floor(Math.random()*ch.length)]||pool[0];return dernierTalk}
async function workerInfo(){const c=S.g('cfi',null);if(c&&c.v&&Date.now()-c.t<1800e3)return c;try{const a=new AbortController(),to=setTimeout(()=>a.abort(),4000);const r=await fetch(WORKER_URL,{signal:a.signal});clearTimeout(to);const j=await r.json();if(!j||!j.ok)throw new Error('worker '+(j&&j.error||r.status));const o={v:+j.v||1,caps:j.caps||{},t:Date.now()};S.s('cfi',o);return o}catch(e){JN.log('worker_info_erreur',{msg:String(e&&e.message||e).slice(0,100)});return c||{v:1,caps:{},t:0}}}
function restaurerPannes(){const A=nx.annuaire,now=Date.now(),pn=S.g('pannes',{});for(const [f,o] of Object.entries(pn||{})){if(o&&o.j>now)A.poserPanneFournisseur(f,{kind:o.k,raison:o.r,dureeMs:o.j-now})}}
async function demarrer(){
  nx.annuaire.surPanne=ev=>{L('panne_'+ev.niveau,{fournisseur:ev.fournisseur,id:ev.id,kind:ev.kind,raison:ev.raison,ms:ev.jusqua-Date.now()});if(ev.niveau==='fournisseur'&&ev.jusqua-Date.now()>300e3){const pn=S.g('pannes',{});pn[ev.fournisseur]={j:ev.jusqua,k:ev.kind,r:ev.raison};S.s('pannes',pn)}};
  for(let i=0;i<20&&!window.puter;i++)await new Promise(r=>setTimeout(r,100));
  try{puterOK=!!(window.puter&&await limite(Promise.resolve(window.puter.auth.isSignedIn()),3000))}catch{puterOK=false}
  const wi=await workerInfo();cfV=wi.v;cfCaps=wi.caps||{};
  try{const r=nx.configurerNexus({workerUrl:WORKER_URL,workerVersion:cfV,workerCaps:cfCaps,pollinationsKey:POLLINATIONS_KEY,puterChat:puterOK?puterChat:null,perso:st.perso,fetchFn:(...x)=>fetch(...x)});L('config',{ajoutes:r.ajoutes.length,refuses:r.refuses.map(x=>x.id)})}catch(e){L('config_error',{msg:String(e&&e.message||e)})}
  restaurerPannes();enrober();upd();pbadge();JN.log('config_finale',{actifs:actifs().length,puter:puterOK,worker_v:cfV,perso:st.perso.length});
  if(puterOK)puterCredit().then(ok=>{if(ok===false)nx.annuaire.poserPanneFournisseur('puter',{kind:'quota',raison:'crédit Puter épuisé',dureeMs:3*3600e3})});
}
const pret=demarrer();
function upd(){pbadge();$('#stt').textContent=navigator.onLine?(actifs().length?'Prêt':'Aucune IA connectée'):'Hors ligne — fonctions locales seulement'}
function pbadge(){const b=$('#pbadge');if(!b)return;b.style.display=(!puterOK&&window.puter&&S.g('fr_ok',false))?'inline-flex':'none'}
async function puterConnexion(){puterSignIn=true;try{if(!window.puter)throw new Error('Puter n\'a pas pu se charger (réseau ?)');JN.log('puter_connexion',{etat:'demande'});await window.puter.auth.signIn();JN.log('puter_connexion',{etat:'ok'});const pn=S.g('pannes',{});delete pn.puter;S.s('pannes',pn);location.reload()}catch(x){JN.log('puter_connexion',{etat:'echec',msg:String(x&&x.message||x)});toast('Puter : '+(x&&x.message||'connexion annulée'))}finally{puterSignIn=false}}

// ---------- Fichier joint -> carte d'action (sans nom d'IA) ----------
async function proposeCard(){let T;try{T=await needTools()}catch(e){toast('Module outils indisponible');return}const an=T.analyzeDoc(pf);let acts=an.actions;if(pf.kind==='image'){const lo=acts.filter(x=>x.local);if(lo.length)acts=lo}const a0=acts[0];st.card={label:an.label,actions:acts,sel:a0.id,open:false,size:kb(pf.size),vis:pf.kind==='image'};render()}
function cardPick(id){const cd=st.card;if(!cd)return;if(!cd.actions.find(x=>x.id===id))return;cd.sel=id;cd.open=false;render()}
async function cardOk(){const cd=st.card;if(!cd)return;const a=cd.actions.find(x=>x.id===cd.sel);if(a.local){await runOcr();return}st.card=null;await send(a.prompt)}
function cardHtml(){const cd=st.card;if(!cd||st.busy)return'';const a=cd.actions.find(x=>x.id===cd.sel);return'<div class="m ai"><div class="bb card">'+(cd.vis?'🖼️':'📄')+' Ce document ressemble à <b>'+esc(cd.label)+'</b> ('+esc(cd.size)+').<br>Je propose : « <b>'+esc(a.label)+'</b> ».<div class="cbtn"><button data-a="cardok">'+(a.local?'Lancer':'Envoyer')+'</button><button data-a="cardalt">Autre action</button><button data-a="cardno">Annuler</button></div>'+(cd.open?'<div class="clist">'+cd.actions.map(x=>'<button data-a="cardpick" data-id="'+x.id+'">'+esc(x.label)+'</button>').join('')+'</div>':'')+'</div></div>'}

// ---------- Génération d'image : (traduction en anglais) -> Cloudflare -> Pollinations -> compte Puter ----------
const promptEn=new Map();
// Les générateurs d'images comprennent mieux l'anglais : la demande (et seulement elle) est traduite avant l'envoi.
async function enAnglais(prompt){
  if(promptEn.has(prompt))return promptEn.get(prompt);
  if(!/[àâäçéèêëîïôöùûüœ]|\b(le|la|les|un|une|des|du|de|d'|et|avec|sur|dans|qui|au|aux|en|pour|sous|près|vue)\b/i.test(prompt))return prompt;
  try{
    nx.annuaire.reglage={niveau:2,difficulte:'simple',premium:false};
    const r=await nx.annuaire.appelerViaAnnuaire({fonctionnalite:'translation',timeoutMs:12000,messages:[{role:'system',content:'You translate image descriptions from French into English. Reply with the English translation only: no quotes, no comments. Keep every detail (subjects, colors, style, quantity, setting). Add nothing.'},{role:'user',content:prompt}]});
    const t=String(r.texte||'').replace(/^["'«\s]+|["'»\s]+$/g,'').replace(/\s*\n+\s*/g,' ').trim();
    if(t&&t.length<=Math.max(300,prompt.length*4)){promptEn.set(prompt,t);JN.log('image_traduction',{ok:true,via:r.transportId});return t}
  }catch(e){JN.log('image_traduction',{ok:false,msg:String(e&&e.message||e).slice(0,100)})}
  return prompt}
async function genImage(c,prompt){
  wait('Génération de l\'image… (10 à 30 s)');let url=null,last='';const seed=Math.floor(Math.random()*1e6);let T=null;try{T=await needTools()}catch{}
  const pEn=await enAnglais(prompt);if(st.stop)return;
  const voies=[];
  if(cfV>=2&&(GJ().cloudflare||0)<LIMITES_JOUR.cloudflare&&!nx.annuaire.fournisseurEnPause('cloudflare'))voies.push(['cloudflare',async()=>{incr('cloudflare');const r=await limite(fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:true,prompt:pEn})}),45000);if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();if(!j.image)throw new Error('image vide');return j.image}]);
  voies.push(['pollinations',async()=>{const u='https://gen.pollinations.ai/image/'+encodeURIComponent(pEn)+'?model=z-image-turbo&width=1024&height=1024&nologo=true&seed='+seed+'&key='+encodeURIComponent(POLLINATIONS_KEY);
    try{const r=await limite(fetch(u),70000);if(!r.ok)throw new Error('HTTP '+r.status);const b=await r.blob();if(!/^image\//.test(b.type)||!b.size)throw new Error('image vide');return b}catch(e){if(T){await T.loadImage(u,70000);return u}throw e}}]);
  if(puterOK&&!nx.annuaire.fournisseurEnPause('puter'))voies.push(['puter',async()=>{const im=await puterGuardImg(pEn);if(!im||!im.src)throw new Error('image vide');return im.src}]);
  for(const [nom,f] of voies){const t0=Date.now();try{url=await f();JN.log('image_ok',{voie:nom,ms:Date.now()-t0,prompt,prompt_en:pEn!==prompt});break}catch(e){last=String(e&&e.message||e);JN.log('image_echec',{voie:nom,ms:Date.now()-t0,msg:last.slice(0,160)});if(nom==='puter')nx.annuaire.poserPanneFournisseur('puter',{kind:/credit|quota|limit|insufficient|402|429/i.test(last)?'quota':'unknown',raison:last,dureeMs:/credit|quota|limit|insufficient|402|429/i.test(last)?3*3600e3:5*60e3})}if(st.stop)return}
  if(st.stop)return;
  if(url){const blob=url instanceof Blob?url:null,src=blob?URL.createObjectURL(blob):url,id=await IMG.garder(blob||url);say(c,{p:'local',c:'Voici ton image.',img:src,imgId:id,prompt})}
  else say(c,{p:'local',err:1,c:'⚠️ Impossible de générer l\'image pour le moment. Réessaie dans quelques instants.'});
}
async function puterGuardImg(prompt){if(!puterOK||!window.puter)throw new Error('Puter non connecté');puterBg++;if(puterBg===1)window.open=function(...a){if(puterSignIn)return WO(...a);return null};try{const pr=window.puter.ai.txt2img(prompt);pr.catch&&pr.catch(()=>{});return await limite(pr,45000)}finally{puterBg--;if(!puterBg)window.open=WO}}

// ---------- Envoi d'un message ----------
async function send(t0){
  if(st.busy){st.stop=1;JN.log('arret_demande',{});return}
  const raw=(t0??$('#in').value).trim();
  if(!raw){if(pf)await proposeCard();return}
  stopMic();st.card=null;$('#in').value='';$('#in').style.height='auto';
  const att=pf,c=cur();
  if(att){pf=null;chip()}
  const fm=att?{name:att.name,size:att.size,kind:att.kind}:null;
  if(fm&&att.kind==='image'){fm.thumb=await mkThumb(att.img);fm.full=att.img;fm.fullId=await IMG.garder(att.img)}
  c.m.push({r:'user',c:raw,...(fm?{file:fm}:{})});
  if(!c.t)c.t=raw.slice(0,40);save();st.busy=1;st.stop=0;st.msg='Nexus réfléchit...';$('#sb').innerHTML=IC_STOP;updSb();render();
  JN.log('message_utilisateur',{texte:raw,fichier:att?{name:att.name,kind:att.kind,size:att.size,trunc:att.trunc,src:att.src}:null,hors_ligne:!navigator.onLine});
  try{
    let web='',webInfo=null,srcs=null,pageUrl=null,pageInfo=null;
    await pret;apprendre(raw);
    if(!att){
      const mr=memRepondre(raw);if(mr){JN.log('reponse',{via:'memoire',texte:mr});say(c,{p:'local',c:mr});return}
      const stk=smallTalk(raw);if(stk){JN.log('reponse',{via:'petite-phrase',texte:stk});nx.noterEchange(raw,stk);say(c,{p:'local',c:stk});return}
      const T0=await needTools().catch(()=>null);
      if(T0&&/image|photo|illustration|dessin|logo|affiche|portrait|paysage|visuel/i.test(raw)){const gp=T0.parseImageRequest(raw);if(gp){JN.log('route',{via:'image',prompt:gp});await genImage(c,gp);return}}
      const l=await local(raw);
      if(l){JN.log('reponse',{via:'local',texte:l});say(c,{p:'local',c:l});return}
      pageUrl=T0&&navigator.onLine&&cfV>=3?T0.urlDans(raw):null;
      if(pageUrl){wait('Nexus lit la page…');pageInfo=await T0.readPage(WORKER_URL,pageUrl);JN.log('lecture_page',{ok:!pageInfo.erreur,h:(()=>{try{return new URL(pageUrl).host}catch{return ''}})(),msg:pageInfo.erreur||''});if(pageInfo.erreur){say(c,{p:'local',err:1,c:'Je n\'ai pas pu lire cette page ('+pageInfo.erreur+'). Vérifie l\'adresse ou copie-colle le texte qui t\'intéresse.'});return}srcs=[{t:pageInfo.titre||pageUrl,u:pageInfo.url||pageUrl}]}
      const calc=/(\d\s*[x×*+\/÷-]\s*\d)|combien (font|fait|ca fait)|^calcul/.test(nm(raw));
      const webOk=!!cfCaps.web&&(GJ().web||0)<LIMITES_JOUR.web;
      if(!pageInfo&&navigator.onLine&&T0&&!calc&&(T0.isFactual(raw)||(webOk&&T0.needsWeb(raw)))){
        wait('Nexus cherche sur Internet…');
        try{if(webOk)incr('web');webInfo=await T0.searchWeb(raw,{timeout:6000,workerUrl:WORKER_URL,workerWebOk:webOk});if(webInfo.found&&webInfo.sources.length)srcs=webInfo.sources;JN.log('recherche_web',{q:raw,wikipedia:!!webInfo.wiki,web:webInfo.web.length,duckduckgo:!!webInfo.ddg,erreurs:webInfo.erreurs,wiki:webInfo.wiki&&webInfo.wiki.title});if(webInfo.found)web=webInfo.context;const defQ=/^(qui est|qui etait|qui sont|qu est ce que|qu est ce qu|c est quoi|que signifie|definition de|definition du|parle moi de|dis moi qui est)\b/.test(nm(raw));const wt=webInfo.wiki?webInfo.wiki.text:'',dt=webInfo.ddg?webInfo.ddg.text:'',best=dt.length>wt.length?dt:wt;if(defQ&&best.length>=140){const rep2='**'+(webInfo.wiki?webInfo.wiki.title:raw.replace(/\?/g,'').trim())+'**\n\n'+best+'\n\n_Source : '+(best===wt?'Wikipédia':(webInfo.ddg&&webInfo.ddg.source||'DuckDuckGo'))+'._';JN.log('reponse',{via:'web-direct',texte:rep2});nx.noterEchange(raw,best);say(c,{p:'local',c:rep2});return}}catch(e){JN.log('recherche_web_erreur',{msg:String(e&&e.message||e)})}
      }
    }
    let fichier=null,texte=raw;
    if(pageInfo&&pageInfo.texte){const cp=compresser({name:'page.html',text:pageInfo.texte,question:raw,budget:3200});fichier={name:pageInfo.titre||pageUrl,text:cp.text};texte=raw.replace(pageUrl,'').trim()||'Résume cette page en points clés.';JN.log('compression',{methode:cp.methode,avant:cp.avant,apres:cp.apres})}
    if(att&&att.kind!=='image'){const cp=compresser({name:att.name,text:String(att.text||''),question:raw,budget:2800});fichier={name:att.name,text:cp.text};JN.log('compression',{fichier:att.name,avant:cp.avant,apres:cp.apres,methode:cp.methode})}
    if(att&&att.kind==='image'){wait('Nexus regarde l\'image…');fichier={name:att.name,kind:'image',text:'',img:att.img}}
    const t1=Date.now();LASTVIA=null;
    let r=await nx.recevoirAutonome({texte,fichier,enLigne:navigator.onLine,contexteWeb:web});
    if(att&&att.kind==='image'&&r.panne&&!st.stop){
      // Aucune IA ne peut voir l'image : on lit le texte qu'elle contient (gratuit, local), sans jamais inventer.
      let txt='';try{const T=await needTools();wait('Lecture du texte de l\'image…');txt=await T.ocrImage(att.file||att.img,p=>wait('Lecture du texte… '+p))}catch(e){L('ocr_error',{msg:String(e&&e.message||e).slice(0,120)})}
      if(!texteLisible(txt)){say(c,{p:'local',err:1,pbtn:!puterOK?1:0,c:'Je n\'arrive pas à analyser cette image pour le moment : aucune IA de vision n\'est disponible'+(puterOK?'':' (connecte-toi à Puter pour en débloquer)')+' et je n\'y trouve pas de texte lisible. Réessaie plus tard.'});return}
      r=await nx.recevoirAutonome({texte:raw+'\n\n(Je ne peux pas voir l\'image, seulement le texte qu\'elle contient.)',fichier:{name:att.name+' (texte lu)',text:compresser({name:att.name,text:txt,question:raw,budget:2000}).text},enLigne:navigator.onLine})
    }
    if(r.panne&&webInfo&&webInfo.found&&!st.stop){
      // Plus aucune IA : on répond honnêtement avec ce que Wikipédia / DuckDuckGo ont trouvé, sans rien inventer.
      const p=[];if(webInfo.wiki)p.push('**'+webInfo.wiki.title+'** (Wikipédia) : '+webInfo.wiki.text);if(webInfo.ddg)p.push(webInfo.ddg.text+(webInfo.ddg.source?' (Source : '+webInfo.ddg.source+')':' (Source : DuckDuckGo)'));
      r={...r,texte:'Aucune IA n\'est disponible pour reformuler, mais voici ce que j\'ai trouvé :\n\n'+p.join('\n\n'),panne:false,chemin:'web-sources'};JN.log('reponse',{via:'web-sources'})
    }
    syncRate();S.s('memoires',nx.memoires);
    JN.log('resultat_corps',{chemin:r.chemin,intent:r.intent,bloque:r.bloque,champs:Object.keys(r),ms:Date.now()-t1,texte:r.texte});
    if(st.stop)return;
    const loc=r.chemin==='pharmacie-local',err=!!r.bloque||/panne|quota|hors-ligne|refuse|invalide|nez-|fermee|vide/.test(r.chemin||'');
    say(c,{p:loc?'local':'nexus',c:r.texte,err:err?1:0,...(err&&!puterOK&&!loc?{pbtn:1}:{}),...(!loc&&!err&&LASTVIA?{via:LASTVIA}:{}),...(!err&&srcs&&srcs.length?{src:srcs.slice(0,6)}:{})});
  }catch(e){L('send_error',{msg:String(e&&e.message||e),pile:String(e&&e.stack||'').slice(0,600)});say(c,{p:'local',err:1,c:'❌ Erreur : '+(e&&e.message||e)})}
  finally{st.busy=0;st.msg='';st.sug=null;$('#sb').innerHTML=IC_SEND;updSb();render()}
}
// « Redemander à une autre IA » : on écarte l'IA qui vient de répondre, puis on repose la question.
async function reask(i){
  if(st.busy)return;const c=cur0(),m=c&&c.m[i];if(!m||!m.via)return;let q=i-1;while(q>=0&&c.m[q].r!=='user')q--;if(q<0)return;
  const prev=m.via,question=c.m[q].c;st.busy=1;st.stop=0;st.msg='Nexus cherche une autre réponse…';render();JN.log('redemander',{ecarte:prev,question});
  const off=entrees().filter(e=>e.id===prev);off.forEach(e=>nx.desactiverTransport(e.id));
  try{
    try{nx.cache&&nx.cache.clear&&nx.cache.clear()}catch{}
    if(!actifs().length){say(c,{p:'local',err:1,c:'Aucune autre IA n\'est disponible pour le moment.'});return}
    LASTVIA=null;const r=await nx.recevoirAutonome({texte:question,fichier:null,enLigne:navigator.onLine});syncRate();
    JN.log('resultat_corps',{chemin:r.chemin,redemande:true,texte:r.texte});
    const err=!!r.bloque||/panne|quota|hors-ligne|refuse|invalide|nez-|fermee|vide/.test(r.chemin||'');
    say(c,{p:'nexus',c:r.texte,err:err?1:0,...(!err&&LASTVIA&&LASTVIA!==prev?{via:LASTVIA}:{})});
  }catch(e){say(c,{p:'local',err:1,c:'❌ Erreur : '+(e&&e.message||e)})}
  finally{off.forEach(e=>nx.activerTransport(e.id));st.busy=0;st.msg='';render()}
}

// ---------- Réglages ----------
const memHtml=()=>nx.memoires.length?nx.memoires.map((x,i)=>'<div class="set-line"><b style="font-weight:400">'+esc(x.texte||x.t||'')+'</b><button class="ib" data-a="memdel" data-i="'+i+'">✕</button></div>').join('')+'<button class="b2 r" data-a="memclr">Tout oublier</button>':'<div class="set-note">Rien de retenu pour l\'instant.</div>';
const slugp=m=>String(m).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const persoId=p=>'perso-'+slugp(p.nom||p.model);
const INP='style="width:100%;margin-top:6px;padding:10px;border-radius:10px;border:1px solid var(--line);font:inherit;background:#fff"';
const NOMS={cloudflare:'Cloudflare',puter:'Puter',pollinations:'Pollinations',groq:'Groq',openrouter:'OpenRouter'};
const nomFourn=f=>NOMS[f]||(String(f).startsWith('perso-')?((st.perso.find(p=>persoId(p)===f)||{}).nom||f.slice(6)):f);
function testHtml(){return st.tests.length?st.tests.map(t=>'<div class="set-line"><b style="font-weight:600">'+esc(t.nom)+'</b><span class="h">'+(t.ok?'✅ répond · '+esc(t.d):(t.ok===null?'— '+esc(t.d):'❌ '+esc(t.d)))+'</span></div>').join(''):''}
// ---- Installation sur l'écran d'accueil ----
const isStandalone=()=>{try{return matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||matchMedia('(display-mode: minimal-ui)').matches||navigator.standalone===true}catch{return false}};
const plat=()=>{const u=navigator.userAgent||'';if(/iPhone|iPad|iPod/.test(u)||(/Macintosh/.test(u)&&navigator.maxTouchPoints>1))return'ios';if(/Android/.test(u))return'android';return'autre'};
let promptInstall=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptInstall=e;JN.log('install_possible',{})});
addEventListener('appinstalled',()=>{promptInstall=null;S.s('inst_off',true);JN.log('app_installee',{})});
const installVisible=()=>!isStandalone()&&plat()!=='autre'&&!S.g('inst_off',false)&&Date.now()>S.g('inst_snooze',0);
function installHtml(){const u=navigator.userAgent||'',p=plat();
  if(p==='ios'){const safari=!/CriOS|FxiOS|EdgiOS|OPiOS/.test(u);return '<ol class="steps"><li>Touche le bouton <b>Partager</b> <span class="ico">⬆️</span> (le carré avec une flèche vers le haut), en bas de l\'écran'+(/iPad/.test(u)?' ou en haut':'')+'.</li><li>Fais défiler le menu et touche <b>« Sur l\'écran d\'accueil »</b>.</li><li>Touche <b>Ajouter</b>. Nexus apparaît alors comme une application : ouvre-le depuis son icône.</li></ol>'+(safari?'':'<p class="note">Tu utilises un autre navigateur que Safari : si « Sur l\'écran d\'accueil » n\'apparaît pas, ouvre cette page dans <b>Safari</b> et recommence.</p>')}
  return (promptInstall?'<button class="b2 pri" data-a="instnow">📲 Installer Nexus maintenant</button><p class="note">ou à la main :</p>':'')+'<ol class="steps"><li>Touche le menu du navigateur <b>⋮</b> (trois points, en haut à droite'+(/SamsungBrowser/.test(u)?' ; sur Samsung Internet : le menu ≡ en bas':'')+').</li><li>Touche <b>« Installer l\'application »</b> (ou <b>« Ajouter à l\'écran d\'accueil »</b>).</li><li>Confirme. Nexus apparaît sur ton écran d\'accueil : ouvre-le depuis son icône.</li></ol>'}
// ---- Rapport technique anonyme (accord de l'utilisateur obligatoire) ----
function deviceId(){let d=S.g('did','');if(!d){d=(crypto.randomUUID?crypto.randomUUID():'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,12));S.s('did',d)}return d}
function envInfo(){const u=navigator.userAgent||'',os=/iPhone|iPad|iPod/.test(u)?'iOS':/Android/.test(u)?'Android':/Windows/.test(u)?'Windows':/Mac OS X|Macintosh/.test(u)?'macOS':/Linux/.test(u)?'Linux':'?',ver=((u.match(/(?:OS|Android|Windows NT|Mac OS X) ([\d._]+)/)||[])[1]||'').replace(/_/g,'.').split('.').slice(0,2).join('.'),nav=/EdgA?\/|EdgiOS/.test(u)?'Edge':/SamsungBrowser/.test(u)?'Samsung':/OPR\//.test(u)?'Opera':/Firefox|FxiOS/.test(u)?'Firefox':/CriOS|Chrome/.test(u)?'Chrome':/Safari/.test(u)?'Safari':'?',nv=(u.match(/(?:Version|CriOS|Chrome|Firefox|FxiOS|EdgA?|EdgiOS)\/(\d+)/)||[])[1]||'';
  return{os,os_v:ver,nav,nav_v:nv,ecran:[screen.width,screen.height,+(devicePixelRatio||1).toFixed(2)],fenetre:[innerWidth,innerHeight],standalone:isStandalone(),langue:(navigator.language||'').slice(0,5),mem:navigator.deviceMemory||null,v:V}}
let envoiEnCours=false;
async function envoyerRapport(){
  if(envoiEnCours||S.g('tel',null)!==true||!navigator.onLine||cfV<3||!cfCaps.journal)return false;
  const jour=new Date().toISOString().slice(0,10);if(S.g('tel_day','')===jour)return false;
  envoiEnCours=true;
  try{const {entrees,dernier}=await JN.rapportAnonyme(S.g('tel_t',''));
    if(!entrees.length){S.s('tel_day',jour);return false}
    const r=await limite(fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'journal',device:deviceId(),v:V,env:envInfo(),entrees})}),15000);
    if(r.ok){S.s('tel_day',jour);S.s('tel_t',dernier);JN.log('rapport_envoye',{n:entrees.length});return true}
    JN.log('rapport_echec',{statut:r.status})}catch(e){JN.log('rapport_echec',{msg:String(e&&e.message||e).slice(0,80)})}finally{envoiEnCours=false}
  return false}
async function envoyerAvis(){
  const msg=(($('#fb-msg')||{}).value||'').trim();if(msg.length<3)return toast('Écris d\'abord ton message');
  if(!navigator.onLine)return toast('Pas de connexion : réessaie plus tard');if(cfV<3||!cfCaps.journal)return toast('L\'envoi n\'est pas disponible pour le moment');
  const b=$('#fb-go');b.disabled=true;
  try{const r=await limite(fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'feedback',device:deviceId(),v:V,categorie:($('#fb-cat')||{}).value||'autre',message:msg.slice(0,2000),contact:(($('#fb-ct')||{}).value||'').trim().slice(0,120)})}),15000);
    if(r.ok){$('#fb-msg').value='';toast('Merci ! Ton message a bien été envoyé.');JN.log('avis_envoye',{nom:($('#fb-cat')||{}).value})}
    else toast(r.status===429?'Trop de messages envoyés : réessaie plus tard':'Envoi impossible pour le moment')}
  catch(e){toast('Envoi impossible : vérifie ta connexion')}finally{b.disabled=false}}
function rset(){
st.legal=null;
const pu=nx.annuaire.fournisseurEnPause('puter');
let h='<button class="b2" data-v="chat" style="margin-bottom:12px">← Retour au chat</button>';
h+='<div class="set-card"><div class="set-title">Guide</div><div class="set-note">Comment utiliser Nexus et ajouter ta propre IA.</div><button class="b2" data-v="guide">📖 Ouvrir le guide</button></div>';
if(!isStandalone()&&plat()!=='autre')h+='<div class="set-card"><div class="set-title">Installer Nexus</div><div class="set-note">Ajoute Nexus à ton écran d\'accueil : il s\'ouvre alors comme une vraie application, en plein écran.</div><button class="b2" data-a="inst">📲 Comment faire</button></div>';
h+='<div class="set-card"><div class="set-title">Compte Puter</div><div class="set-note">'+(puterOK?(pu&&pu.kind==='quota'?'✅ Connecté. Ton crédit gratuit Puter semble épuisé pour le moment : Nexus utilise d\'autres IA en attendant.':'✅ Connecté. Nexus utilise en priorité les crédits de ton compte Puter, ce qui économise les crédits partagés.'):'Connecte-toi (gratuit, sans carte bancaire) pour utiliser en priorité les crédits de ton compte Puter.')+'</div><button class="b2" data-a="pl">'+(puterOK?'Se déconnecter de Puter':'🔌 Se connecter à Puter')+'</button></div>';
const m0=MODELES_PERSO[0];
h+='<div class="set-card"><details id="paBox"'+(st.perso.length?' open':'')+'><summary class="set-title" style="cursor:pointer">IA personnelles</summary><div class="set-note" style="margin-top:8px">Ajoute ta propre IA (clé API) : Nexus l\'utilisera <b>en premier</b>, ce qui économise les crédits communs. Si tu as une clé pour un fournisseur que Nexus utilise déjà (Groq, OpenRouter, Cloudflare, Pollinations), garde <b>*</b> comme modèle : tous les modèles de Nexus passeront par ta clé. Ta clé reste uniquement sur cet appareil.</div>';
st.perso.forEach((p,k)=>{h+='<div class="set-line"><label class="sw"><input type="checkbox" data-pa-on="'+k+'"'+(p.actif===false?'':' checked')+'></label><b>'+esc(p.nom||p.model)+'</b><small class="h">'+esc(p.model==='*'?'tous les modèles Nexus':p.model)+'</small><button class="ib" data-a="padel" data-i="'+k+'" title="Supprimer">✕</button></div>'});
h+='<div class="set-sub" style="margin-top:12px">Ajouter une IA</div><select id="pa-tpl" '+INP+'>'+MODELES_PERSO.map((m,k)=>'<option value="'+k+'">'+esc(m.nom)+'</option>').join('')+'</select>'
 +'<input id="pa-nom" type="text" placeholder="Nom (ex. Mon Groq)" autocomplete="off" value="'+esc(m0.nom)+'" '+INP+'><input id="pa-url" type="url" placeholder="Adresse de l\'API (https://…)" autocomplete="off" value="'+esc(m0.url)+'" '+INP+'><input id="pa-key" type="password" placeholder="Clé API" autocomplete="off" '+INP+'><input id="pa-model" type="text" list="pa-dl" placeholder="Modèle" autocomplete="off" autocapitalize="off" value="'+esc(m0.model)+'" '+INP+'><datalist id="pa-dl">'+modelesDe(m0).map(x=>'<option value="'+esc(x)+'">').join('')+'</datalist>'
 +'<div class="set-note" id="pa-aide">Clé à créer sur : '+esc(m0.aide)+'</div><button class="b2" data-a="paadd">➕ Ajouter cette IA</button></details></div>';
h+='<div class="set-card"><div class="set-title">Test</div><button class="b2" data-a="tt" id="tt">▶ Tester mes IA</button><div id="tres">'+testHtml()+'</div><div class="set-note">Envoie simplement « 1 » à un modèle de chaque fournisseur pour vérifier qu\'il répond (coût minimal). Une panne d\'un seul modèle n\'écarte pas son fournisseur.</div></div>';
h+='<div class="set-card"><div class="set-title">Mémoire de Nexus</div><div class="set-note">Nexus retient, sur ce téléphone, ce que tu lui demandes de retenir (ex : « je m\'appelle … »).</div>'+memHtml()+'</div>';
h+='<div class="set-card"><div class="set-title">Voix de Nexus</div><div class="set-note">Nexus lit les réponses avec la voix de ton appareil (gratuit, hors connexion).</div><select id="voxsel" '+INP+'><option value="">Voix de l\'appareil : automatique</option>'+voixFR().map(v=>'<option value="'+esc(v.name)+'"'+(v.name===voixNom?' selected':'')+'>'+esc(v.name)+'</option>').join('')+'</select><button class="b2" data-a="voxt">🔊 Écouter un exemple</button></div>';
h+='<div class="set-card"><div class="set-title">Une remarque, une idée ?</div><div class="set-note">Dis-nous ce qui ne va pas ou ce que tu aimerais. Ton message est envoyé à l\'éditeur de Nexus. N\'y mets pas d\'information personnelle ou sensible.</div><select id="fb-cat" '+INP+'><option value="suggestion">💡 Suggestion</option><option value="probleme">🐞 Problème</option><option value="autre">💬 Autre</option></select><textarea id="fb-msg" maxlength="2000" rows="4" placeholder="Ton message…" '+INP+'></textarea><input id="fb-ct" type="text" maxlength="120" placeholder="E-mail pour te répondre (facultatif)" autocomplete="off" '+INP+'><button class="b2 pri" id="fb-go" data-a="fbgo">📨 Envoyer</button></div>';
h+='<div class="set-card"><div class="set-title">Journal</div><div class="set-note" id="jcount">…</div><div class="set-note">Tout ce qui se passe dans l\'app est enregistré sur ton appareil (y compris tes messages). Les clés sont masquées.</div><label class="set-line sw" style="gap:10px"><input type="checkbox" id="tel-on"'+(S.g('tel',null)===true?' checked':'')+'><span style="font-size:13px;flex:1">Envoyer chaque jour un <b>rapport technique anonyme</b> (erreurs, pannes d\'IA, type d\'appareil) pour aider à corriger Nexus. Jamais le contenu de tes messages.</span></label><div class="j-row" data-a="vj"><span>👁️</span><b>Voir le journal</b><span>›</span></div><textarea id="rep" readonly placeholder="Le journal apparaît ici" style="display:none"></textarea><button class="b2" data-a="jdl">📥 Télécharger le journal complet</button><button class="b2" data-a="jcp">📋 Copier les 300 dernières lignes</button><button class="b2" data-a="jclr">🗑️ Vider le journal</button></div>';
h+='<div class="set-card"><div class="set-title">Mes données</div><div class="set-note">Tout est stocké sur cet appareil. Tu peux l\'exporter ou tout effacer à tout moment.</div><button class="b2" data-a="dexp">📦 Exporter mes données</button><button class="b2 r" data-a="all">Tout effacer (conversations, images, mémoire, IA perso, journal)</button></div>';
h+='<div class="legal-bas">'+ORDRE.map(k=>'<a href="#" data-a="leg" data-p="'+k+'">'+PAGES[k][0]+'</a>').join(' · ')+'<br>NEXUS AI v'+V+'</div>';
$('#v-set').innerHTML=h;JN.count().then(n=>{const e=$('#jcount');if(e)e.textContent=n+' entrées enregistrées'});
}
const modelesDe=m=>m.cat&&CATALOGUES[m.cat]?['*',...CATALOGUES[m.cat].map(x=>x[0])]:[];
async function tests(){const b=$('#tt');b.disabled=true;b.textContent='⏳ Test…';await pret;const t00=Date.now();JN.log('test_ias',{debut:true});const A=nx.annuaire;
  // un modèle (le moins cher) par fournisseur : on teste le fournisseur, pas chaque modèle
  const par={};for(const e of entrees().filter(e=>e.actif!==false&&!(e.fonctionnalites||[]).includes('vision'))){const f=A.fournisseurDe(e),c=e.meta?.cout??5;if(!par[f]||c<(par[f].meta?.cout??5))par[f]=e}
  const taches=Object.entries(par).map(([f,e])=>[f,e]);
  const un=async([f,e])=>{const nom=nomFourn(f),t0=Date.now(),ac2=new AbortController();
    try{const r=await Promise.race([e.transport({fonctionnalite:e.fonctionnalites[0],messages:[{role:'user',content:'1'}],signal:ac2.signal,test:true}),new Promise((_,ko)=>setTimeout(()=>{ac2.abort();ko(new Error('délai dépassé'))},15000))]);const ok=!!(r&&String(r.texte||'').trim());
      if(ok){A.leverPanneFournisseur(f);e.panneJusqua=0;e.enPanne=false}
      return{nom,ok,d:ok?((Date.now()-t0)/1000).toFixed(1)+' s':'réponse vide'}}
    catch(x){const pause=A.fournisseurEnPause(f);return{nom,ok:false,d:String(x&&x.status?'erreur '+x.status:x&&x.message||x).slice(0,60)+(pause?' · fournisseur en pause':'')}}};
  st.tests=await Promise.all(taches.map(un));
  if(!puterOK)st.tests.push({nom:'Puter',ok:null,d:'non connecté'});
  st.tests.push({nom:'Relais Nexus (Worker)',ok:cfV>=2,d:cfV>=2?'v'+cfV+(cfV>=3?' · Groq '+(cfCaps.groq?'✓':'—')+' · OpenRouter '+(cfCaps.openrouter?'✓':'—')+' · Web '+(cfCaps.web?'✓':'—')+' · Journal '+(cfCaps.journal?'✓':'—'):' (à mettre à jour)'):'indisponible'});
  const ep=Object.values(A.etatFournisseurs()).reduce((a,o)=>a+o.modelesEnPanne.length,0);if(ep)st.tests.push({nom:'Modèles écartés',ok:null,d:ep+' modèle(s) en pause temporaire (les autres du même fournisseur restent utilisés)'});
  st.tests.forEach(t=>JN.log('test_ia',{nom:t.nom,ok:t.ok,msg:t.d}));JN.log('test_ias',{fin:true,ms:Date.now()-t00});
  const r=$('#tres');if(r)r.innerHTML=testHtml();b.disabled=false;b.textContent='▶ Tester mes IA'}
$('#v-set').addEventListener('change',e=>{const t=e.target;
  if(t.id==='voxsel'){voixNom=t.value;S.s('voix',voixNom);return}
  if(t.id==='tel-on'){S.s('tel',t.checked);JN.log('telemetrie',{etat:t.checked?'accepte':'refuse'});if(t.checked)envoyerRapport();return}
  if(t.id==='pa-tpl'){const m=MODELES_PERSO[+t.value];$('#pa-nom').value=m.nom==='Autre'?'':m.nom;$('#pa-url').value=m.url;$('#pa-model').value=m.model;$('#pa-dl').innerHTML=modelesDe(m).map(x=>'<option value="'+esc(x)+'">').join('');$('#pa-aide').textContent=m.aide?'Clé à créer sur : '+m.aide:'Indique l\'adresse de base de l\'API (elle se termine souvent par /v1).';return}
  if(t.dataset.paOn!==undefined){const p=st.perso[+t.dataset.paOn];if(p){p.actif=t.checked;S.s('perso',st.perso);JN.log('perso_bascule',{nom:p.nom,actif:t.checked});location.reload()}}});
$('#v-set').addEventListener('click',async e=>{const el=e.target.closest('[data-a]');const a=el?el.dataset.a:null;if(!a)return;
if(a==='pl'){if(puterOK){try{await window.puter.auth.signOut()}catch{}location.reload()}else puterConnexion()}
else if(a==='inst'){FR.hidden=false;FR.innerHTML='<div class="frb"><h2>Installer Nexus</h2>'+installHtml()+'<button class="b2" data-a="frclose">Fermer</button></div>'}
else if(a==='fbgo')envoyerAvis()
else if(a==='paadd'){const nom=$('#pa-nom').value.trim()||MODELES_PERSO[+$('#pa-tpl').value].nom,url=$('#pa-url').value.trim(),key=$('#pa-key').value.trim(),model=$('#pa-model').value.trim();
  const tp=MODELES_PERSO[+$('#pa-tpl').value],cat=tp&&tp.cat&&url.replace(/\/+$/,'')===tp.url.replace(/\/+$/,'')?tp.cat:(tp&&tp.cat&&/TON_ACCOUNT_ID/.test(tp.url)?tp.cat:undefined);
  if(!/^https:\/\//i.test(url))return toast('L\'adresse doit commencer par https://');if(/TON_ACCOUNT_ID/.test(url))return toast('Remplace TON_ACCOUNT_ID par l\'identifiant de ton compte Cloudflare');if(key.length<8)return toast('Colle ta clé API');if(!model)return toast('Indique le modèle');
  if(model==='*'&&!(tp&&tp.cat))return toast('Indique un modèle précis pour cette IA');
  if(st.perso.some(p=>persoId(p)===persoId({nom})))return toast('Une IA porte déjà ce nom');
  st.perso.push({nom,url,apiKey:key,model,actif:true,...(cat?{cat}:{})});S.s('perso',st.perso);JN.log('perso_ajout',{nom,url:url.replace(/\/\/([^/]+).*/,'//$1'),model});toast('IA ajoutée');location.reload()}
else if(a==='padel'){const p=st.perso[+el.dataset.i];if(p&&confirm('Supprimer « '+(p.nom||p.model)+' » ?')){st.perso.splice(+el.dataset.i,1);S.s('perso',st.perso);JN.log('perso_suppression',{nom:p.nom});location.reload()}}
else if(a==='leg'){e.preventDefault();st.legal=el.dataset.p;view('guide')}
else if(a==='dexp'){const blob=new Blob([JSON.stringify({app:'NEXUS AI',version:V,exporte:new Date().toISOString(),conversations:st.convs,identifiant_rapport:deviceId(),memoire:nx.memoires,ia_personnelles:st.perso.map(p=>({...p,apiKey:'***'}))},null,1)],{type:'application/json'});const u=URL.createObjectURL(blob),x=document.createElement('a');x.href=u;x.download='nexus-mes-donnees.json';document.body.appendChild(x);x.click();setTimeout(()=>{x.remove();URL.revokeObjectURL(u)},4000);toast('Données exportées')}
else if(a==='vj'){const r=$('#rep');if(r){if(r.style.display==='none'){const all=await JN.all();r.value=all.length?all.slice(-200).map(x=>{const {t,type,_k,...rest}=x;return String(t).slice(11,19)+' '+type+' '+JSON.stringify(rest)}).join('\n'):'Journal vide.';r.style.display='block'}else r.style.display='none'}}
else if(a==='tt')tests();
else if(a==='jdl'){const all=await JN.all();const blob=new Blob([JSON.stringify({app:'NEXUS AI',version:V,exporte:new Date().toISOString(),entrees:all},null,1)],{type:'application/json'});const u=URL.createObjectURL(blob),x=document.createElement('a');x.href=u;x.download='nexus-journal-'+Date.now()+'.json';document.body.appendChild(x);x.click();setTimeout(()=>{x.remove();URL.revokeObjectURL(u)},4000);toast('Journal exporté ('+all.length+' lignes)')}
else if(a==='jcp'){const all=await JN.all();toast(await copy(JSON.stringify(all.slice(-300)))?'Copié (300 dernières lignes)':'Copie impossible')}
else if(a==='jclr'){if(confirm('Vider tout le journal ?')){await JN.clear();S.s('tel_t','');toast('Journal vidé');rset()}}
else if(a==='voxt'){lire('Bonjour, je suis Nexus. Voici ma voix. Que puis-je faire pour toi ?')}
else if(a==='memdel'){nx.memoires.splice(+el.dataset.i,1);S.s('memoires',nx.memoires);rset()}
else if(a==='memclr'){nx.memoires=[];S.s('memoires',[]);rset()}
else if(a==='all'&&confirm('Tout effacer ? Cette action est définitive.')){await JN.clear();await IMG.toutEffacer();Object.keys(localStorage).filter(k=>k.startsWith('nexus_')).forEach(k=>localStorage.removeItem(k));location.reload()}});
function rhist(){const q=norm($('#q').value||''),l=[...st.convs].reverse().filter(c=>!q||norm(c.t+' '+c.m.map(m=>m.c).join(' ')).includes(q));$('#hl').innerHTML=l.length?l.map(c=>`<div class="hi" data-o="${c.id}"><div><b>${esc(c.t||'(vide)')}</b><br><small>${new Date(c.d).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})} · ${c.m.length} messages</small></div><button class="ib" data-del="${c.id}">🗑</button></div>`).join(''):'<div class="h">Aucune conversation.</div>';const sv=(st.saved||[]).filter(s=>!q||norm((s.t||'')+' '+(s.c||'')).includes(q));const se=$('#stock');if(se)se.innerHTML='<div class="stock-title">Stockage</div><div class="h" style="margin-top:0">'+sv.length+' élément'+(sv.length>1?'s':'')+' sauvegardé'+(sv.length>1?'s':'')+'</div>'+(sv.length?sv.slice().reverse().map(s=>`<div class="stock-card"><b>${esc(s.t||'Réponse sauvegardée')}</b><br><small>${new Date(s.d).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})} · ${'NEXUS'}</small><div class="h">${esc((s.c||'').slice(0,160))}${(s.c||'').length>160?'…':''}</div><div class="stock-actions"><button data-svcp="${s.id}">Copier</button><button data-svdel="${s.id}">Supprimer</button></div></div>`).join(''):'<div class="h">Aucun élément sauvegardé.</div>')}
async function copy(t){try{await navigator.clipboard.writeText(t);return 1}catch{const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();let ok=0;try{ok=document.execCommand('copy')}catch{}a.remove();return ok}}
function view(v){const bar=document.getElementById('bar');if(bar)bar.style.display=(v==='chat'?'flex':'none');document.querySelectorAll('.v').forEach(e=>e.classList.toggle('on',e.id==='v-'+v));document.querySelectorAll('[data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===v));if(v==='set')rset();if(v==='hist')rhist();if(v==='guide')rguide();syncAv()}
function rguide(){const p=st.legal&&PAGES[st.legal];$('#v-guide').innerHTML='<button class="b2" data-v="set" style="margin-bottom:12px">← Retour aux paramètres</button><div class="guide">'+(p?'<h2>'+p[0]+'</h2>'+p[1]():GUIDE_HTML)+'</div>'}
document.addEventListener('click',e=>{const b=e.target.closest('[data-v]');if(!b)return;const v=b.dataset.v;const cur=document.querySelector('.v.on')?.id?.replace('v-','');if(b.classList&&b.classList.contains('head-center')){if(cur==='chat'){newChat();JN.log('nouveau_chat',{via:'logo'})}else view('chat');return}if(v===cur&&v!=='chat')view('chat');else view(v);});
function newChat(){pf=null;chip();st.sug=null;st.cur=null;nx.effacerConversation();save();render();view('chat')}
$('#sb').onclick=()=>send();$('#nw').onclick=newChat;$('#q').oninput=rhist;
let rec=null,micOn=false,micBase='';
const INTERRO=/^(qui|que|quoi|quand|où|ou|comment|pourquoi|combien|quel|quelle|quels|quelles|est[- ]ce|peux[- ]tu|peut[- ]on|as[- ]tu|es[- ]tu|tu peux|tu sais|sais[- ]tu|y a[- ]t[- ]il|c'est quoi)\b/i;
function ponctuer(t){t=String(t||'').replace(/\s+/g,' ').trim();if(!t)return t;t=t[0].toUpperCase()+t.slice(1);if(/[.!?…]$/.test(t))return t;if(INTERRO.test(t))return t+' ?';return t.split(' ').length>=6?t+'.':t}
function stopMic(){micOn=false;micBase='';if(rec){try{rec.onresult=null;rec.onend=null;rec.onerror=null;rec.abort?rec.abort():rec.stop()}catch{}rec=null}$('#mic').classList.remove('on')}
$('#mic').onclick=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast('Micro non disponible dans ce navigateur');JN.log('mic',{etat:'indisponible'});return}
if(micOn){stopMic();JN.log('mic',{etat:'stop'});return}
try{rec=new SR();rec.lang='fr-FR';rec.continuous=true;rec.interimResults=true;rec.maxAlternatives=1;micOn=true;micBase=$('#in').value.trim();$('#mic').classList.add('on');JN.log('mic',{etat:'start'});
rec.onresult=e=>{let interim='';for(let k=e.resultIndex;k<e.results.length;k++){const r=e.results[k];if(r.isFinal)micBase=(micBase+' '+ponctuer(r[0].transcript)).trim();else interim+=r[0].transcript}const inp=$('#in');inp.value=(micBase+(interim?' '+interim.trim():'')).trim();inp.dispatchEvent(new Event('input'))};
rec.onerror=e=>{JN.log('mic',{etat:'erreur',err:e&&e.error});if(e&&(e.error==='not-allowed'||e.error==='service-not-allowed')){toast('Micro refusé : autorise-le dans les réglages');stopMic()}};
rec.onend=()=>{if(micOn){try{rec.start()}catch{stopMic()}}};
rec.start()}catch(x){stopMic();toast('Micro impossible');JN.log('mic',{etat:'exception',msg:String(x&&x.message||x)})}};
// ---- Voix : celle de l'appareil (gratuite), lue par phrases pour garder une intonation naturelle
let ttsI=null,voixNom=S.g('voix','');
const voixFR=()=>{try{return (speechSynthesis.getVoices()||[]).filter(v=>/^fr/i.test(v.lang))}catch{return[]}};
function meilleureVoix(){const vs=voixFR();if(!vs.length)return null;const p=vs.find(v=>v.name===voixNom);if(p)return p;const sc=v=>{const n=v.name.toLowerCase();let s=0;if(/premium|enhanced|amélioré|ameliore/.test(n))s+=8;if(/siri/.test(n))s+=6;if(/amélie|amelie|audrey|aurélie|aurelie|marie|léa|lea|google/.test(n))s+=3;if(/fr[-_]fr/i.test(v.lang))s+=2;if(v.localService)s+=1;return s};return [...vs].sort((x,y)=>sc(y)-sc(x))[0]}
function pourLire(t){return String(t).replace(/```[\s\S]*?```/g,' Voir le code à l\'écran. ').replace(/`([^`]+)`/g,'$1').replace(/https?:\/\/\S+/g,'lien').replace(/[*_#>~|]/g,'').replace(/^\s*[-•]\s+/gm,'').replace(/\p{Extended_Pictographic}/gu,'').replace(/([.!?…:;])\s*\n+/g,'$1 ').replace(/\n+/g,'. ').replace(/\s+/g,' ').trim()}
function phrases(t){const ph=t.match(/[^.!?;:]+[.!?;:]*/g)||[t],out=[];let cur='';for(const p of ph){if((cur+p).length>230&&cur){out.push(cur.trim());cur=p}else cur+=p}if(cur.trim())out.push(cur.trim());return out}
function arretVoix(){try{speechSynthesis.cancel()}catch{}}
function lireAppareil(txt){if(!('speechSynthesis' in window)){toast('Lecture vocale indisponible');return}const v=meilleureVoix(),ph=phrases(pourLire(txt).slice(0,5000));ph.forEach((ch,i)=>{const u=new SpeechSynthesisUtterance(ch);u.lang='fr-FR';if(v)u.voice=v;u.rate=.92;u.pitch=1;u.volume=1;if(i===ph.length-1)u.onend=()=>{if(ttsI===txt)ttsI=null};window.speechSynthesis.speak(u)});JN.log('tts',{etat:'start',moteur:'appareil',voix:v&&v.name})}
function lire(txt){const meme=ttsI===txt;arretVoix();if(meme){ttsI=null;JN.log('tts',{etat:'stop'});return}ttsI=txt;lireAppareil(txt)}
if('speechSynthesis' in window)speechSynthesis.onvoiceschanged=()=>{if(document.querySelector('#v-set.on'))rset()};
const IC_SEND='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"></path><path d="M22 2 15 22l-4-9-9-4 20-7z"></path></svg>';
const IC_STOP='<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"></rect></svg>';
$('#att').onclick=()=>$('#attfile').click();const TXT=/\.(txt|md|markdown|csv|tsv|json|jsonl|xml|html?|css|js|mjs|ts|tsx|jsx|py|java|c|h|cpp|cs|go|rs|php|rb|sh|sql|log|ya?ml|toml|ini|cfg|conf|env|svg|srt|vtt|tex)$/i,IMGEXT=/\.(png|jpe?g|gif|webp|heic|heif|bmp)$/i,PDOC=/\.(pdf|docx|xlsx|xls|ods)$/i;
const kb=n=>n<1024?n+' o':n<1048576?Math.round(n/1024)+' Ko':(n/1048576).toFixed(1)+' Mo';
function updSb(){$('#sb').disabled=false}
function chip(){const c=$('#fchip');if(!pf){c.style.display='none';{const th=$('#fth');if(th)th.style.display='none'}$('#focr').style.display='none';$('#bar').classList.remove('hf');$('#v-chat').classList.remove('hf');$('#in').placeholder='Demandez à NEXUS...'}else{c.style.display='flex';{const th=$('#fth');if(th){if(pf.kind==='image'){th.src=pf.img;th.style.display='block'}else th.style.display='none'}}$('#focr').style.display=pf.kind==='image'?'inline-block':'none';$('#bar').classList.add('hf');$('#v-chat').classList.add('hf');$('#fname').textContent=(pf.kind==='image'?'🖼️ ':'📎 ')+pf.name+' · '+kb(pf.size)+(pf.trunc?' · coupé':'');$('#in').placeholder='Posez votre question…'}updSb()}
function shrink(f){return new Promise((ok,ko)=>{const u=URL.createObjectURL(f),im=new Image();im.onload=()=>{try{const w=im.naturalWidth,h=im.naturalHeight;if(!w||!h)throw new Error('vide');const go=(mx,q)=>{const k=Math.min(1,mx/Math.max(w,h)),cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(w*k));cv.height=Math.max(1,Math.round(h*k));const cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,cv.width,cv.height);cx.drawImage(im,0,0,cv.width,cv.height);return cv.toDataURL('image/jpeg',q)};let d=go(1024,.75);if(d.length>900000)d=go(768,.6);URL.revokeObjectURL(u);ok(d)}catch(e){URL.revokeObjectURL(u);ko(e)}};im.onerror=()=>{URL.revokeObjectURL(u);ko(new Error('image illisible'))};im.src=u})}
$('#attfile').onchange=async e=>{const f=e.target.files&&e.target.files[0];if(!f)return;try{
if(f.type.startsWith('image/')||IMGEXT.test(f.name)){const d=await shrink(f);pf={name:f.name,size:f.size,kind:'image',img:d,file:f}}
else if(PDOC.test(f.name)||/pdf|officedocument/.test(f.type)){toast('Lecture du document…');const T=await needTools();const r=await T.readDoc(f,p=>toast(p));if(!r.text||r.text.length<3)throw new Error('aucun texte');pf={name:f.name,size:f.size,kind:'text',text:r.text.slice(0,20000),trunc:!!r.trunc||r.text.length>20000,src:r.src}}
else if(f.type.startsWith('text/')||TXT.test(f.name)||['application/json','application/xml'].includes(f.type)){const raw=await f.slice(0,200000).text();if(raw.includes('\u0000'))throw new Error('binaire');pf={name:f.name,size:f.size,kind:'text',text:raw.slice(0,20000),trunc:f.size>200000||raw.length>20000}}
else{toast('Format non pris en charge');return}
st.card=null;chip();render();$('#in').focus();toast(pf.trunc?'Fichier coupé':'Fichier prêt')}catch(x){L('file_error',{name:f.name,msg:String(x&&x.message||x).slice(0,120)});toast('Impossible de lire : '+String(x&&x.message||x).slice(0,60))}finally{e.target.value=''}};
$('#fx').onclick=()=>{pf=null;st.card=null;chip();render()};
$('#focr').onclick=()=>runOcr();
$('#in').addEventListener('input',updSb);
$('#in').addEventListener('input',e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'});
$('#in').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!matchMedia('(pointer:coarse)').matches){e.preventDefault();send()}});
async function regenImage(q){const c=cur();st.busy=1;st.stop=0;st.msg='Génération…';updSb();render();try{await genImage(c,q)}finally{st.busy=0;st.msg='';updSb();render()}}
$('#msgs').onclick=async e=>{const lbi=e.target.closest('img[data-lb]');if(lbi){openLb(lbi.dataset.lb);return}const pc=e.target.closest('[data-a="pcn"]');if(pc){puterConnexion();return}const sg=e.target.closest('.sug');if(sg){send(sg.dataset.q);return}
const b=e.target.closest('button');if(!b)return;const a=b.dataset.a;
if(a==='cardok'){await cardOk();return}if(a==='cardalt'){if(st.card){st.card.open=!st.card.open;render()}return}if(a==='cardpick'){cardPick(b.dataset.id);return}if(a==='cardno'){st.card=null;render();return}
const c=cur0(),m=c&&c.m[b.dataset.i];if(!m)return;
if(a==='tts')lire(m.c);else if(a==='gd'){m.good=!m.good;if(m.good)m.bad=false;L('feedback',{bon:m.good,via:m.via||m.p,qtxt:(c.m[b.dataset.i-1]||{}).c?.slice(0,200),atxt:m.c.slice(0,300)});save();render()}else if(a==='re'){await reask(+b.dataset.i)}else if(a==='cp')toast(await copy(m.c)?'Copié':'Copie impossible');
else if(a==='sv'){const ex=(st.saved||[]).find(s=>s.c===m.c&&s.conv===c.id);if(ex){toast('Déjà sauvegardé');return}st.saved=[...(st.saved||[]),{id:Date.now(),d:Date.now(),t:(c.t||m.c.slice(0,40)),c:m.c,p:m.p,conv:c.id}];S.s('saved',st.saved);toast('Sauvegardé')}
else if(a==='dl')showDl(+b.dataset.i);
else if(a==='imgsave'){const T=await needTools();toast('Enregistrement…');await T.saveRemoteImage(m.img,'nexus-image.jpg')}
else if(a==='imgnew'){if(m.prompt&&!st.busy)await regenImage(m.prompt)}
else{m.bad=!m.bad;if(m.bad)m.good=false;L('feedback',{bad:m.bad,p:m.p,via:m.via,qtxt:(c.m[b.dataset.i-1]||{}).c?.slice(0,200),atxt:m.c.slice(0,300)});save();render()}};
g('dlmenu').addEventListener('click',async e=>{const b=e.target.closest('button');if(e.target.id==='dlmenu'||(b&&!b.dataset.fmt)){g('dlmenu').style.display='none';return}if(b&&b.dataset.fmt){g('dlmenu').style.display='none';await exportMsg(b.dataset.fmt)}});
$('#hl').onclick=e=>{const d=e.target.closest('[data-del]');if(d){const gone=st.convs.find(c=>c.id==d.dataset.del);if(gone)IMG.supprimer(idsImages(gone));st.convs=st.convs.filter(c=>c.id!=d.dataset.del);if(st.cur==d.dataset.del)st.cur=null;save();rhist();return}const o=e.target.closest('[data-o]');if(o){pf=null;chip();st.cur=+o.dataset.o;save();render();view('chat');rehydrater(cur0())}};
$('#stock').onclick=async e=>{const del=e.target.closest('[data-svdel]');if(del){st.saved=(st.saved||[]).filter(s=>s.id!=del.dataset.svdel);S.s('saved',st.saved);rhist();toast('Supprimé');return}const cp=e.target.closest('[data-svcp]');if(cp){const s=(st.saved||[]).find(x=>x.id==cp.dataset.svcp);if(s)toast(await copy(s.c)?'Copié':'Copie impossible')}};
addEventListener('online',upd);addEventListener('offline',upd);
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(e=>L('sw_error',{msg:e.message})));
// ---------- Mise en page : on mesure l'en-tête et la barre de saisie réels (toutes tailles d'écran, clavier, pièce jointe) ----------
const racine=document.documentElement;
function mesures(){const bar=document.getElementById('bar'),hd=document.querySelector('header');if(bar&&bar.offsetHeight)racine.style.setProperty('--barh',Math.ceil(document.getElementById('app').getBoundingClientRect().bottom-bar.getBoundingClientRect().top)+'px');if(hd)racine.style.setProperty('--headh',Math.ceil(hd.getBoundingClientRect().bottom)+'px')}
try{const ro=new ResizeObserver(mesures);ro.observe(document.getElementById('bar'));ro.observe(document.querySelector('header'))}catch{}
mesures();addEventListener('resize',mesures);addEventListener('orientationchange',()=>setTimeout(mesures,250));addEventListener('pageshow',mesures);
function viewportDiag(tag){try{const sa=document.getElementById('sa'),r=x=>Math.round(x),ap=document.querySelector('#app').getBoundingClientRect(),bar=document.querySelector('#bar').getBoundingClientRect(),vv=window.visualViewport;JN.log('ecran',{tag,innerH:innerHeight,vvH:vv&&r(vv.height),appH:r(ap.height),safeBottom:sa?r(sa.getBoundingClientRect().height):null,standalone:isStandalone(),navStandalone:navigator.standalone})}catch{}}
// ---------- Premier lancement : consentement, rapport anonyme, Puter, installation ----------
const FR=$('#fr');
const frShow=h=>{FR.hidden=false;FR.innerHTML='<div class="frb">'+h+'</div>'};
function frEtape(){if(!FR)return;
  if(!S.g('fr_ok',false)){frShow('<h2>Bienvenue sur NEXUS AI</h2>'+ACCUEIL+'<p class="note">Détails : <a href="#" data-a="frleg" data-p="confidentialite">confidentialité</a> · <a href="#" data-a="frleg" data-p="cgu">conditions d\'utilisation</a>.</p><button class="b2 pri" data-a="frok">J\'ai compris, continuer</button>');return}
  if(S.g('tel',null)===null){frShow('<h2>Aider à améliorer Nexus ?</h2><p>Chaque jour, Nexus peut envoyer à son éditeur un <b>rapport technique anonyme</b> : erreurs, pannes d\'IA, type d\'appareil et de navigateur. Cela permet de corriger les problèmes dans les prochaines mises à jour.</p><p><b>Jamais</b> le contenu de tes messages, de tes réponses, de tes fichiers ni de ta mémoire.</p><p class="note">Tu peux changer d\'avis à tout moment dans Paramètres → Journal. <a href="#" data-a="frleg" data-p="confidentialite">En savoir plus</a></p><button class="b2 pri" data-a="telok">Oui, j\'accepte</button><button class="b2" data-a="telno">Non merci</button>');return}
  if(!S.g('fr_puter',false)&&!puterOK){frShow('<h2>Utilise tes crédits Puter</h2><p>Connecte-toi à <b>Puter</b> (gratuit, sans carte bancaire) : Nexus utilisera en priorité les crédits de ton compte, ce qui économise les crédits partagés et te donne accès à plus de modèles.</p><button class="b2 pri" data-a="frpl">🔌 Se connecter à Puter</button><button class="b2" data-a="frlater">Plus tard</button><p class="note">Tu pourras le faire à tout moment avec le bouton « Connecter Puter » ou dans Paramètres.</p>');return}
  if(installVisible()){frShow('<h2>Installe Nexus sur ton écran d\'accueil</h2><p>Nexus s\'ouvrira en plein écran, comme une vraie application.</p>'+installHtml()+'<button class="b2 pri" data-a="instok">J\'ai compris</button><button class="b2" data-a="instoff">Ne plus me le montrer</button>');return}
  FR.hidden=true}
if(FR)FR.addEventListener('click',async e=>{const b=e.target.closest('[data-a]');if(!b)return;e.preventDefault();const k=b.dataset.a;
 if(k==='frok'){S.s('fr_ok',true);JN.log('consentement',{ok:true,version:V});frEtape();pbadge()}
 else if(k==='telok'){S.s('tel',true);JN.log('telemetrie',{etat:'accepte'});frEtape();setTimeout(envoyerRapport,3000)}
 else if(k==='telno'){S.s('tel',false);JN.log('telemetrie',{etat:'refuse'});frEtape()}
 else if(k==='frpl'){S.s('fr_puter',true);FR.hidden=true;puterConnexion()}
 else if(k==='frlater'){S.s('fr_puter',true);frEtape();pbadge()}
 else if(k==='frleg'){const p=PAGES[b.dataset.p];FR.innerHTML='<div class="frb"><button class="b2" data-a="frback">← Retour</button><h2>'+p[0]+'</h2>'+p[1]()+'</div>'}
 else if(k==='frback')frEtape()
 else if(k==='frclose')FR.hidden=true
 else if(k==='instnow'){try{promptInstall.prompt();const r=await promptInstall.userChoice;JN.log('install_choix',{etat:r&&r.outcome});promptInstall=null;FR.hidden=true}catch{}}
 else if(k==='instok'){S.s('inst_snooze',Date.now()+7*864e5);frEtape()}
 else if(k==='instoff'){S.s('inst_off',true);frEtape()}});
pret.then(()=>{frEtape();setTimeout(envoyerRapport,6000)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)envoyerRapport()});
const PB=$('#pbadge');if(PB)PB.onclick=puterConnexion;
render();rehydrater(cur0());upd();view('chat');viewportDiag('start');setTimeout(()=>viewportDiag('1s'),1000);addEventListener('resize',()=>viewportDiag('resize'));addEventListener('pageshow',()=>view('chat'));setTimeout(upd,1500);setInterval(()=>{upd();pbadge()},60000);
JN.instrumenter({version:V,standalone:isStandalone()});
L('start',{v:V});
