import { NexusCorpsV12, NexusRate, ajouterMemoire } from "./nexus-corps.mjs";
import * as JN from "./journal.js";
import { voir } from "./vision.js";
import { GUIDE_HTML } from "./guide.js";
import { construireConfig } from "./comptes.js";
const $=s=>document.querySelector(s),V='1.0';
const S={g(k,d){try{const v=localStorage.getItem('nexus_'+k);return v===null?d:JSON.parse(v)}catch{return d}},s(k,v){try{localStorage.setItem('nexus_'+k,JSON.stringify(v))}catch(e){}}};
const P={"groq": ["Groq", "⚡"], "openrouter": ["OpenRouter", "🔀"], "puter": ["Puter", "🖥️"], "pollinations": ["Pollinations", "🌸"], "cohere": ["Cohere", "💬"], "cloudflare": ["Cloudflare", "☁️"]};
const PI=Object.fromEntries(Object.entries(P).map(([k,v])=>[k,{n:v[0],i:v[1]}]));
const PROV=Object.keys(PI);
const old=S.g('keys',{})||{};
const st={diag:{},card:null,comptes:S.g('comptes',null)||{groq:{apiKey:old.groq||''},openrouter:{apiKey:old.openrouter||''},cohere:{apiKey:old.cohere||''},cloudflare:{workerUrl:old.cloudflare||S.g('cf_worker','')||'',model:S.g('cf_model','')||''},pollinations:{apiKey:old.pollinations||''}},on:S.g('on',{}),convs:S.g('convs',[]),cur:S.g('cur',null),log:S.g('log',[]),saved:S.g('saved',[]),busy:0,tests:{},sug:null,msg:''};
let ac=null,pf=null;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=t=>t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/['’]/g,' ').replace(/\s+/g,' ').trim();
const num=s=>parseFloat(String(s).replace(',','.')),fx=x=>+x.toFixed(4);
function toast(m){const e=$('#ts');e.textContent=m;e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display='none',2800)}
function L(type,d){const now=new Date().toISOString(),last=st.log[st.log.length-1];if((type==='js_rejection'||type==='js_error')&&last&&last.type===type&&last.msg===d.msg&&(last.at||'')===(d.at||'')){last.n=(last.n||1)+1;last.t2=now}else st.log.push({t:now,type,...d});if(st.log.length>300)st.log=st.log.slice(-300);S.s('log',st.log);JN.log(type,d)}
addEventListener('error',e=>L('js_error',{msg:e.message,at:(e.filename||'').split('/').pop()+':'+e.lineno}));
addEventListener('unhandledrejection',e=>{const msg=String(e.reason&&e.reason.message||e.reason).slice(0,200);L('js_rejection',{msg});if(/popErrorScope|device.*lost/i.test(msg))brainBroken(msg)});
const signed=()=>{try{return puter.auth.isSignedIn()}catch{return false}};
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
function sugHtml(){return st.sug.map((x,k)=>'<button class="sug fl" style="animation-delay:'+(k*.7)+'s" data-q="'+esc(x.q||x.t)+'"><img src="avatar.png" class="mini" alt="">'+x.i+' '+esc(x.t)+'</button>').join('')}
function welcome(){if(!st.sug)st.sug=pick3();return'<div class="wel"><div class="bgav"><img src="avatar.png" alt=""><img src="avatar.png" alt=""><img src="avatar.png" alt=""></div><h2 style="color:var(--tx)">NEXUS AI</h2>Je réponds seul aux demandes simples et je ne sollicite une IA que si c\'est nécessaire.<br>Tapez <b>aide</b> pour voir ce que je sais faire.<div class="sugs">'+sugHtml()+'</div></div>'}
setInterval(()=>{const c=cur0();if(document.hidden||st.busy||(c&&c.m.length))return;const el=document.querySelector('#v-chat.on .sugs');if(!el)return;st.sug=pick3();el.classList.add('out');setTimeout(()=>{el.innerHTML=sugHtml();el.classList.remove('out')},350)},7000);
let TL=null;
const TP=import('./nexus-tools.js').then(m=>{TL=m;return m}).catch(e=>{L('tools_error',{msg:String(e&&e.message||e).slice(0,160)});return null});
const needTools=async()=>{const m=TL||await TP;if(!m)throw new Error('Module outils indisponible');return m};
const g=id=>document.getElementById(id);
const IMGQ=0;
async function runOcr(){if(!pf||pf.kind!=='image')return;st.card=null;st.busy=1;st.msg='Lecture du texte de l\'image (sur le téléphone, gratuit)…';updSb();render();let again=false;try{const T=await needTools();const txt=await T.ocrImage(pf.file||pf.img,p=>wait('Lecture du texte… '+p));if(!txt||txt.length<3){toast('Aucun texte détecté dans l\'image');return}pf={name:pf.name+' (texte lu)',size:txt.length,kind:'text',text:txt.slice(0,20000),trunc:txt.length>20000,src:'ocr'};chip();again=true}catch(e){L('ocr_error',{msg:String(e&&e.message||e).slice(0,120)});toast('Lecture impossible : '+(e&&e.message||'erreur'))}finally{st.busy=0;st.msg='';updSb();render()}if(again)await proposeCard()}
async function showDl(i){const c=cur0(),m=c&&c.m[i];if(!m)return;let T;try{T=await needTools()}catch(e){toast(e.message);return}st.dlm=m;g('dlbox').innerHTML='<div class="set-title" style="margin-bottom:8px">Télécharger la réponse</div>'+T.exportFormats(m.c).map(f=>'<button class="b2" data-fmt="'+f.fmt+'">'+esc(f.label)+'</button>').join('')+'<button class="b2" data-fmt="">Fermer</button>';g('dlmenu').style.display='flex'}
async function exportMsg(fmt){toast('Création du fichier…');try{const T=await needTools(),r=await T.makeFile(fmt,st.dlm.c,(cur0()&&cur0().t)||'nexus'),res=await T.saveBlob(r.blob,r.name);toast(res==='cancel'?'Annulé':'Fichier prêt : '+r.name)}catch(e){L('export_error',{msg:String(e&&e.message||e).slice(0,120)});toast('Création impossible : '+(e&&e.message||'erreur'))}}
const cur0=()=>st.convs.find(c=>c.id===st.cur),save=()=>{st.convs=st.convs.slice(-50);S.s('convs',st.convs.map(c=>({...c,m:c.m.map(m=>{if(m.img&&!/^https?:/.test(m.img))m={...m,img:null,c:m.c+' (image non conservée)'};if(m.file&&m.file.full)m={...m,file:{...m.file,full:undefined}};return m})})));S.s('cur',st.cur)};
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
function render(){const c=cur0(),e=$('#msgs');if(!c||!c.m.length){e.innerHTML=welcome()+cardHtml();return}
e.innerHTML=c.m.map((m,i)=>{if(m.r==='user')return`<div class="m user"><div class="bb">${fileThumb(m.file)}${esc(m.c)}</div></div>`;
const body=m.img?'<div>'+md(m.c)+'</div><img class="gimg" data-lb="'+esc(m.img)+'" src="'+esc(m.img)+'" alt="'+esc(m.prompt||'image')+'">':md(m.c);
return`<div class="m ai"><div class="bb">${body}</div><div class="mt"><span class="who"><img src="avatar.png" class="av" alt="">NEXUS</span><button data-a="cp" data-i="${i}" title="Copier">📋</button><button data-a="tts" data-i="${i}" title="Écouter">🔊</button>${m.img?`<button data-a="imgsave" data-i="${i}">💾</button><button data-a="imgnew" data-i="${i}">🔄</button>`:(m.err?'':`<button data-a="dl" data-i="${i}">⬇️</button>`)}<button data-a="sv" data-i="${i}">Sauvegarder</button><button data-a="gd" data-i="${i}" class="${m.good?'on':''}" title="Bonne réponse">👍</button><button data-a="bd" data-i="${i}" class="${m.bad?'on bad':''}" title="Mauvaise réponse">👎</button>${(m.via&&!m.err&&!m.img)?`<button data-a="re" data-i="${i}">🔁 Redemander à une autre IA</button>`:''}</div></div>`}).join('')+(st.busy?'<div class="m ai"><div class="bb" id="typ">'+esc(st.msg||'…')+'</div></div>':'')+cardHtml();e.scrollTop=e.scrollHeight}
function openLb(s){const l=$('#lb');if(!l)return;l.querySelector('img').src=s;l.hidden=false;JN.log('plein_ecran',{})}
$('#lb').onclick=()=>{$('#lb').hidden=true};
function say(c,o){c.m.push({r:'ai',...o});save();render()}
// ---------- Nexus : créé UNE seule fois ----------
const nx=new NexusCorpsV12();
try{const m=S.g('memoires',[]);if(Array.isArray(m))nx.memoires=m}catch{}
const provDe=e=>PROV.find(p=>(e.tags||[]).includes(p));
const entrees=()=>nx.listerCarnet();
const actifs=()=>PROV.filter(p=>entrees().some(e=>provDe(e)===p&&e.actif!==false));
let puterOK=false,LASTVIA=null;
const FREE_PUTER='liquid/lfm-2.5-1.2b-instruct:free';
async function puterSecours(...args){try{return await window.puter.ai.chat(...args)}catch(e){const m=String(e&&(e.message||e.error?.message||e.error||e.code)||e)+JSON.stringify(e||{});if(/credit|insufficient|quota|limit|402|429|balance|funds/i.test(m)){JN.log('puter_secours_gratuit',{msg:m.slice(0,160)});const b=[...args],k=b.findIndex(x=>x&&typeof x==='object'&&!Array.isArray(x));if(k>=0)b[k]={...b[k],model:FREE_PUTER};else b.push({model:FREE_PUTER});return await window.puter.ai.chat(...b)}throw e}}
function enrober(){for(const en of nx.annuaire.entrees.values()){if(en._w)continue;const o=en.transport;en.transport=async(arg)=>{const t0=Date.now();JN.log('ia_appel',{id:en.id,fonctionnalite:arg&&arg.fonctionnalite,nb_messages:arg&&arg.messages&&arg.messages.length});try{const r=await o(arg);JN.log('ia_ok',{id:en.id,ms:Date.now()-t0,texte:String(r&&r.texte||'').slice(0,4000)});LASTVIA=provDe({tags:en.tags||[]})||en.id;return r}catch(e){JN.log('ia_erreur',{id:en.id,ms:Date.now()-t0,statut:e&&e.status,type:e&&e.kind,msg:String(e&&(e.message||e.error?.message)||e).slice(0,300)});throw e}};en._w=1}}
const NR=Object.values(nx).find(v=>v instanceof NexusRate);let nrT='';
function syncRate(){if(!NR)return;for(const e of (NR.entries||[]).filter(x=>x.date>nrT)){JN.log('corps_'+e.type,e);nrT=e.date}}
const nm=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/['’\-]/g,' ').replace(/\s+/g,' ').trim();
const cap1=s=>s?s[0].toUpperCase()+s.slice(1):s;
function apprendre(t){try{let m=ajouterMemoire(t);if(!m){const x=String(t).match(/\b(?:mon (?:nom|prenom|prénom) (?:est|c'est|c’est)|je me (?:prénomme|prenomme|nomme)|moi c'est|moi c’est)\s+([A-Za-zÀ-ÿ'’-]{2,30})/i);if(x)m={categorie:'identite',texte:"Je m'appelle "+cap1(x[1])+".",date:new Date().toISOString()}}if(m&&!nx.memoires.some(k=>nm(k.texte)===nm(m.texte))){nx.memoires.push(m);S.s('memoires',nx.memoires);JN.log('memoire_ajout',m)}}catch(e){JN.log('memoire_erreur',{msg:String(e&&e.message||e)})}}
function memRepondre(t){const n=nm(t),nom=()=>{const k=nx.memoires.find(x=>/m'appelle/i.test(x.texte||''));return k?String(k.texte).replace(/^Je m'appelle\s*/i,'').replace(/\.$/,''):null};
if(/(comment je m appelle|quel est mon (prenom|nom)|tu connais mon (prenom|nom)|tu sais comment je m appelle|tu te souviens de mon (prenom|nom))/.test(n)){const p=nom();return p?'Tu t\'appelles '+p+'.':'Je ne sais pas encore comment tu t\'appelles. Dis-moi : « Je m\'appelle … ».'}
if(/(que sais tu de moi|qu est ce que tu sais de moi|ce que tu sais sur moi|dis moi ce que tu sais de moi)/.test(n)){return nx.memoires.length?'Voici ce que je retiens de toi :\n'+nx.memoires.map(x=>'• '+x.texte).join('\n'):'Je ne sais encore rien sur toi. Dis-moi par exemple : « Je m\'appelle … » ou « J\'aime … ».'}return null}
function mkThumb(d){return new Promise(ok=>{try{const im=new Image();im.onload=()=>{try{const k=Math.min(1,140/Math.max(im.naturalWidth,im.naturalHeight)),cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(im.naturalWidth*k));cv.height=Math.max(1,Math.round(im.naturalHeight*k));cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);ok(cv.toDataURL('image/jpeg',.6))}catch{ok('')}};im.onerror=()=>ok('');im.src=d}catch{ok('')}})}
function appliquer(){for(const e of entrees()){const p=provDe(e);if(!p)continue;st.on[p]===false?nx.desactiverTransport(e.id):nx.activerTransport(e.id)}}
async function demarrer(){
  for(let i=0;i<30&&!window.puter;i++)await new Promise(r=>setTimeout(r,100));
  try{puterOK=!!(window.puter&&await window.puter.auth.isSignedIn())}catch{puterOK=false}
  const cfg=construireConfig(st.comptes,{puterChat:puterOK?(...a)=>puterSecours(...a):null});
  try{const r=nx.configurerFournisseurs(cfg);L('config',{ajoutes:r.ajoutes.length,refuses:r.refuses.map(x=>x.id)})}catch(e){L('config_error',{msg:String(e&&e.message||e)})}
  appliquer();enrober();upd();pstat();JN.log('config_finale',{actifs:actifs(),puter:puterOK,nb_transports:entrees().length});
}
const pret=demarrer();
function upd(){const k=actifs().length;$('#stt').textContent=navigator.onLine?k+' IA prête'+(k>1?'s':''):'Hors ligne — fonctions locales seulement'}
function pstat(){for(const id of PROV){const e=$('#ps-'+id);if(!e)continue;const t=st.tests[id],n=entrees().filter(x=>provDe(x)===id).length;e.textContent=[n?'branchée':'non configurée',t?(t.ok?'✅ Test OK · '+t.d:'❌ '+t.d):''].filter(Boolean).join(' · ')}const pl=document.querySelector('[data-a="pl"]');if(pl)pl.textContent=puterOK?'Puter : Connecté ✓':'Puter : Se connecter'}

// ---------- Fichier joint -> carte d'action (sans nom d'IA) ----------
async function proposeCard(){let T;try{T=await needTools()}catch(e){toast('Module outils indisponible');return}const an=T.analyzeDoc(pf);let acts=an.actions;if(pf.kind==='image'){const lo=acts.filter(x=>x.local);if(lo.length)acts=lo}const a0=acts[0];st.card={label:an.label,actions:acts,sel:a0.id,open:false,size:kb(pf.size),vis:pf.kind==='image'};render()}
function cardPick(id){const cd=st.card;if(!cd)return;if(!cd.actions.find(x=>x.id===id))return;cd.sel=id;cd.open=false;render()}
async function cardOk(){const cd=st.card;if(!cd)return;const a=cd.actions.find(x=>x.id===cd.sel);if(a.local){await runOcr();return}st.card=null;await send(a.prompt)}
function cardHtml(){const cd=st.card;if(!cd||st.busy)return'';const a=cd.actions.find(x=>x.id===cd.sel);return'<div class="m ai"><div class="bb card">'+(cd.vis?'🖼️':'📄')+' Ce document ressemble à <b>'+esc(cd.label)+'</b> ('+esc(cd.size)+').<br>Je propose : « <b>'+esc(a.label)+'</b> ».<div class="cbtn"><button data-a="cardok">'+(a.local?'Lancer':'Envoyer')+'</button><button data-a="cardalt">Autre action</button><button data-a="cardno">Annuler</button></div>'+(cd.open?'<div class="clist">'+cd.actions.map(x=>'<button data-a="cardpick" data-id="'+x.id+'">'+esc(x.label)+'</button>').join('')+'</div>':'')+'</div></div>'}

// ---------- Génération d'image : Pollinations (clé si dispo) -> adresse gratuite -> compte Puter ----------
async function genImage(c,prompt){
  wait('Génération de l\'image… (10 à 30 s)');
  let url=null,last='';
  try{
    const T=await needTools(),seed=Math.floor(Math.random()*1e6),pk=((st.comptes.pollinations||{}).apiKey||'').trim(),essais=[];
    if(pk)essais.push(()=>'https://gen.pollinations.ai/image/'+encodeURIComponent(prompt)+'?model=flux&width=1024&height=1024&nologo=true&seed='+seed+'&key='+encodeURIComponent(pk));
    essais.push(()=>T.imageUrl(prompt,seed));
    for(const f of essais){try{const u=f();await T.loadImage(u,70000);url=u;break}catch(e){last=String(e&&e.message||e)}}
  }catch(e){last=String(e&&e.message||e)}
  if(!url&&window.puter&&puterOK){try{wait('Génération avec ton compte Puter…');const im=await window.puter.ai.txt2img(prompt);url=im&&im.src;if(!url)throw new Error('image vide')}catch(e){last=String(e&&e.message||e);url=null}}
  if(st.stop)return;
  if(url)say(c,{p:'local',c:'Voici ton image.',img:url,prompt,why:'image générée'});
  else{L('img_error',{msg:last.slice(0,120)});say(c,{p:'local',err:1,c:'⚠️ Impossible de générer l\'image pour le moment ('+(last||'erreur')+'). Réessaie plus tard.'})}
}

// ---------- Envoi d'un message ----------
async function send(t0){
  if(st.busy){st.stop=1;JN.log('arret_demande',{});return}
  const raw=(t0??$('#in').value).trim();
  if(!raw){if(pf)await proposeCard();return}
  stopMic();st.card=null;$('#in').value='';$('#in').style.height='auto';
  const att=pf,c=cur();
  if(att){pf=null;chip()}
  const fm=att?{name:att.name,size:att.size,kind:att.kind}:null;
  if(fm&&att.kind==='image'){fm.thumb=await mkThumb(att.img);fm.full=att.img}
  c.m.push({r:'user',c:raw,...(fm?{file:fm}:{})});
  if(!c.t)c.t=raw.slice(0,40);save();st.busy=1;st.stop=0;st.msg='Nexus réfléchit...';$('#sb').innerHTML=IC_STOP;updSb();render();
  JN.log('message_utilisateur',{texte:raw,fichier:att?{name:att.name,kind:att.kind,size:att.size,trunc:att.trunc,src:att.src}:null,hors_ligne:!navigator.onLine});
  try{
    await pret;apprendre(raw);
    if(!att){
      const mr=memRepondre(raw);if(mr){JN.log('reponse',{via:'memoire',texte:mr});say(c,{p:'local',c:mr});return}
      const T0=await needTools().catch(()=>null);
      if(T0&&/image|photo|illustration|dessin|logo|affiche|portrait|paysage|visuel/i.test(raw)){const gp=T0.parseImageRequest(raw);if(gp){JN.log('route',{via:'image',prompt:gp});await genImage(c,gp);return}}
      const l=await local(raw);
      if(l){JN.log('reponse',{via:'local',texte:l});say(c,{p:'local',c:l});return}
    }
    let fichier=att?{name:att.name,text:String(att.text||'').slice(0,190000)}:null,texte=raw;
    if(att&&att.kind==='image'){
      wait('Nexus regarde l\'image…');
      const v=await voir({dataUrl:att.img,question:raw,cle:((st.comptes.pollinations||{}).apiKey||'').trim(),puterChat:puterOK?(...x)=>puterSecours(...x):null,fetchFn:(...x)=>fetch(...x),log:JN.log});
      if(st.stop)return;
      if(v.ok){JN.log('reponse',{via:'vision',voie:v.voie,texte:v.texte});say(c,{p:'nexus',c:v.texte});return}
      let txt='';try{const T=await needTools();wait('Lecture du texte de l\'image…');txt=await T.ocrImage(att.file||att.img,p=>wait('Lecture du texte… '+p))}catch(e){L('ocr_error',{msg:String(e&&e.message||e).slice(0,120)})}
      if(!txt||txt.length<3){say(c,{p:'local',err:1,c:'Je n\'arrive pas à analyser cette image pour le moment : aucune IA capable de la regarder n\'est disponible (ou plus de crédit), et je n\'y trouve pas de texte à lire. Réessaie plus tard.'});return}
      fichier={name:att.name+' (texte lu)',text:txt.slice(0,190000)};texte=raw+'\n\n(Je ne peux pas voir l\'image, seulement le texte qu\'elle contient.)';
    }
    const t1=Date.now();LASTVIA=null;
    const r=await nx.recevoirAutonome({texte,fichier,enLigne:navigator.onLine});
    syncRate();S.s('memoires',nx.memoires);
    JN.log('resultat_corps',{chemin:r.chemin,intent:r.intent,bloque:r.bloque,champs:Object.keys(r),ms:Date.now()-t1,texte:r.texte});
    if(st.stop)return;
    const loc=r.chemin==='pharmacie-local',err=!!r.bloque||/panne|quota|hors-ligne|refuse|invalide|nez-|fermee|vide/.test(r.chemin||'');
    say(c,{p:loc?'local':'nexus',c:r.texte,err:err?1:0,...(!loc&&!err&&LASTVIA?{via:LASTVIA}:{})});
  }catch(e){L('send_error',{msg:String(e&&e.message||e),pile:String(e&&e.stack||'').slice(0,600)});say(c,{p:'local',err:1,c:'❌ Erreur : '+(e&&e.message||e)})}
  finally{st.busy=0;st.msg='';st.sug=null;$('#sb').innerHTML=IC_SEND;updSb();render()}
}
// « Redemander à une autre IA » : on écarte l'IA qui vient de répondre, puis on repose la question.
async function reask(i){
  if(st.busy)return;const c=cur0(),m=c&&c.m[i];if(!m||!m.via)return;let q=i-1;while(q>=0&&c.m[q].r!=='user')q--;if(q<0)return;
  const prev=m.via,question=c.m[q].c;st.busy=1;st.stop=0;st.msg='Nexus cherche une autre réponse…';render();JN.log('redemander',{ecarte:prev,question});
  const off=entrees().filter(e=>provDe(e)===prev);off.forEach(e=>nx.desactiverTransport(e.id));
  try{
    try{nx.cache&&nx.cache.clear&&nx.cache.clear()}catch{}
    if(!actifs().length){say(c,{p:'local',err:1,c:'Aucune autre IA n\'est disponible pour le moment.'});return}
    LASTVIA=null;const r=await nx.recevoirAutonome({texte:question,fichier:null,enLigne:navigator.onLine});syncRate();
    JN.log('resultat_corps',{chemin:r.chemin,redemande:true,texte:r.texte});
    const err=!!r.bloque||/panne|quota|hors-ligne|refuse|invalide|nez-|fermee|vide/.test(r.chemin||'');
    say(c,{p:'nexus',c:r.texte,err:err?1:0,...(!err&&LASTVIA&&LASTVIA!==prev?{via:LASTVIA}:{})});
  }catch(e){say(c,{p:'local',err:1,c:'❌ Erreur : '+(e&&e.message||e)})}
  finally{off.forEach(e=>{st.on[prev]===false?0:nx.activerTransport(e.id)});st.busy=0;st.msg='';render()}
}

// ---------- Réglages ----------
const memHtml=()=>nx.memoires.length?nx.memoires.map((x,i)=>'<div class="set-line"><b style="font-weight:400">'+esc(x.texte||x.t||'')+'</b><button class="ib" data-a="memdel" data-i="'+i+'">✕</button></div>').join('')+'<button class="b2 r" data-a="memclr">Tout oublier</button>':'<div class="set-note">Rien de retenu pour l\'instant.</div>';
const IS='style="width:100%;margin-top:6px"';
function champs(id){const c=st.comptes[id]||{},v=k=>esc(c[k]||'');const inp=(k,ph,t)=>`<input type="${t||'text'}" data-f="${id}" data-k="${k}" placeholder="${ph}" value="${v(k)}" autocomplete="off" ${IS}>`;
  if(id==='cloudflare')return inp('workerUrl','URL de ton Worker Cloudflare','password')+inp('model','Modèle (optionnel)')+'<div class="cf-instructions" style="display:block">Le Worker garde tes secrets <code>ACCOUNT_ID</code> et <code>API_TOKEN</code> côté Cloudflare. Colle ici seulement son adresse.</div>';
  if(id==='pollinations')return inp('apiKey','Clé gratuite (optionnelle)','password')+'<div class="cf-instructions" style="display:block">Sans clé, Pollinations reste actif comme secours gratuit quand les autres IA n\'ont plus de crédit.</div>';
  return inp('apiKey','Clé API '+PI[id].n,'password')+inp('model','Modèle (optionnel)')}
function rset(){
let h='';
h+='<button class="b2" data-v="chat" style="margin-bottom:12px">← Retour au chat</button>';
h+='<div class="set-card"><div class="set-title">Guide</div><div class="set-note">Comment créer ton compte et ta clé pour chaque IA.</div><button class="b2" data-v="guide">📖 Ouvrir le guide</button></div>';
h+='<div class="set-card"><div class="set-title">IA</div><div class="set-note">Un interrupteur désactive une IA. Les clés restent sur ce téléphone. Nexus choisit lui-même l\'IA selon la demande.</div>';
for(const id of PROV){const pp=PI[id];
  h+=`<div class="set-line"><label class="sw"><input type="checkbox" data-on="${id}" ${st.on[id]===false?'':'checked'}></label><span>${pp.i}</span><b>${pp.n}</b>`;
  if(id==='puter')h+=`<button class="b2" data-a="pl" style="margin:0;width:auto;padding:8px 10px">Puter : Se connecter</button>`;
  else h+=`<button class="b2" data-a="kedit" data-id="${id}" style="margin:0;padding:8px 10px;width:auto">Modifier</button><div id="kf-${id}" style="display:none;width:100%">${champs(id)}</div>`;
  h+=`<div class="h" id="ps-${id}"></div></div>`}
h+='<button class="b2" data-a="savec" style="margin-top:8px">💾 Enregistrer les comptes et recharger</button>';
h+='<div class="set-sub">Test</div><button class="b2" data-a="tt" id="tt">▶ Tester mes IA</button>';
h+='<div class="set-note">Envoie un court message à chaque IA branchée.</div></div>';
h+='<div class="set-card"><div class="set-title">Mémoire de Nexus</div><div class="set-note">Nexus retient, sur ce téléphone, ce que tu lui demandes de retenir (ex : « je m\'appelle … »).</div>'+memHtml()+'</div>';
h+='<div class="set-card"><div class="set-title">Journal détaillé</div><div class="set-note" id="jcount">…</div><div class="set-note">Enregistre tout ce qui se passe dans l\'app (messages, réponses, appels aux IA, erreurs, réseau, clics). Les clés sont masquées.</div><button class="b2" data-a="jdl">📥 Télécharger le journal complet</button><button class="b2" data-a="jcp">📋 Copier les 300 dernières lignes</button><button class="b2 r" data-a="jclr">🗑️ Vider le journal détaillé</button></div>';
h+='<div class="set-card"><div class="set-title">Journal</div><div class="set-note">Gestion du journal et des données.</div>';
h+='<div class="j-row" data-a="vj"><span>📋</span><b>Voir le journal</b><span>›</span></div>';
h+='<div class="j-row" data-a="rp"><span>📄</span><b>Copier le rapport</b><span>›</span></div>';
h+='<textarea id="rep" readonly placeholder="Le rapport apparaît ici" style="display:none"></textarea>';
h+='<div class="j-row" data-a="lc"><span>🗑️</span><b>Vider le journal</b><span>›</span></div>';
h+='<button class="b2 r" data-a="all">Tout effacer</button></div>';
h+='<div class="h" style="text-align:center;margin:14px">NEXUS AI v'+V+'</div>';
$('#v-set').innerHTML=h;pstat();JN.count().then(n=>{const e=$('#jcount');if(e)e.textContent=n+' entrées enregistrées'});
}
async function tests(){const b=$('#tt');b.disabled=true;b.textContent='⏳ Test…';await pret;const t00=Date.now();JN.log('test_ias',{debut:true});
  const un=async id=>{const es=entrees().filter(e=>provDe(e)===id&&e.actif!==false);if(!es.length){st.tests[id]={ok:false,d:'désactivée'};return}
    const en=nx.annuaire.entrees.get(es[0].id),t0=Date.now(),ac2=new AbortController();
    try{const r=await Promise.race([en.transport({fonctionnalite:es[0].fonctionnalites[0],messages:[{role:'user',content:'Réponds uniquement : OK'}],signal:ac2.signal}),new Promise((_,ko)=>setTimeout(()=>{ac2.abort();ko(new Error('délai dépassé'))},15000))]);const ok=!!(r&&String(r.texte||'').trim());st.tests[id]={ok,d:ok?((Date.now()-t0)/1000).toFixed(1)+' s':'réponse vide'}}
    catch(e){st.tests[id]={ok:false,d:String(e&&e.status?'erreur '+e.status:e&&e.message||e).slice(0,60)}}
    JN.log('test_ia',{ia:id,...st.tests[id]});pstat()};
  await Promise.all(PROV.filter(id=>st.on[id]!==false).map(un));
  PROV.filter(id=>st.on[id]===false).forEach(id=>{delete st.tests[id]});pstat();
  JN.log('test_ias',{fin:true,ms:Date.now()-t00});b.disabled=false;b.textContent='▶ Tester mes IA'}
$('#v-set').addEventListener('change',e=>{const t=e.target;
  if(t.dataset.on){st.on[t.dataset.on]=t.checked;S.s('on',st.on);appliquer();upd();return}
  if(t.dataset.f){(st.comptes[t.dataset.f]??={})[t.dataset.k]=t.type==='checkbox'?t.checked:t.value.trim();S.s('comptes',st.comptes)}});
$('#v-set').addEventListener('click',async e=>{const el=e.target.closest('[data-a]');const a=el?el.dataset.a:null;if(!a)return;
if(a==='pl'){try{if(!window.puter)throw new Error('Puter.js non chargé');puterOK?await window.puter.auth.signOut():await window.puter.auth.signIn();location.reload()}catch(x){toast('Puter : '+(x&&x.message||x))}}
else if(a==='kedit'){const w=$('#kf-'+el.dataset.id);if(w)w.style.display=w.style.display==='none'?'block':'none'}
else if(a==='savec'){S.s('comptes',st.comptes);location.reload()}
else if(a==='vj'){const r=$('#rep');if(r){if(r.style.display==='none'){r.value=st.log.length?st.log.map(x=>JSON.stringify(x)).join('\n'):'Journal vide.';r.style.display='block'}else r.style.display='none'}}
else if(a==='tt')tests();else if(a==='rp'){const r=report();$('#rep').value=r;toast(await copy(r)?'Rapport copié':'Sélectionnez le texte')}
else if(a==='jdl'){const all=await JN.all();const blob=new Blob([JSON.stringify({app:'NEXUS AI',version:V,exporte:new Date().toISOString(),entrees:all},null,1)],{type:'application/json'});const u=URL.createObjectURL(blob),x=document.createElement('a');x.href=u;x.download='nexus-journal-'+Date.now()+'.json';document.body.appendChild(x);x.click();setTimeout(()=>{x.remove();URL.revokeObjectURL(u)},4000);toast('Journal exporté ('+all.length+' lignes)')}
else if(a==='jcp'){const all=await JN.all();toast(await copy(JSON.stringify(all.slice(-300)))?'Copié (300 dernières lignes)':'Copie impossible')}
else if(a==='jclr'){if(confirm('Vider tout le journal détaillé ?')){await JN.clear();toast('Journal détaillé vidé');rset()}}
else if(a==='lc'){st.log=[];S.s('log',[]);toast('Journal vidé')}
else if(a==='memdel'){nx.memoires.splice(+el.dataset.i,1);S.s('memoires',nx.memoires);rset()}
else if(a==='memclr'){nx.memoires=[];S.s('memoires',[]);rset()}
else if(a==='all'&&confirm('Tout effacer ?')){Object.keys(localStorage).filter(k=>k.startsWith('nexus_')).forEach(k=>localStorage.removeItem(k));location.reload()}});
function rhist(){const q=norm($('#q').value||''),l=[...st.convs].reverse().filter(c=>!q||norm(c.t+' '+c.m.map(m=>m.c).join(' ')).includes(q));$('#hl').innerHTML=l.length?l.map(c=>`<div class="hi" data-o="${c.id}"><div><b>${esc(c.t||'(vide)')}</b><br><small>${new Date(c.d).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})} · ${c.m.length} messages</small></div><button class="ib" data-del="${c.id}">🗑</button></div>`).join(''):'<div class="h">Aucune conversation.</div>';const sv=(st.saved||[]).filter(s=>!q||norm((s.t||'')+' '+(s.c||'')).includes(q));const se=$('#stock');if(se)se.innerHTML='<div class="stock-title">Stockage</div><div class="h" style="margin-top:0">'+sv.length+' élément'+(sv.length>1?'s':'')+' sauvegardé'+(sv.length>1?'s':'')+'</div>'+(sv.length?sv.slice().reverse().map(s=>`<div class="stock-card"><b>${esc(s.t||'Réponse sauvegardée')}</b><br><small>${new Date(s.d).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})} · ${'NEXUS'}</small><div class="h">${esc((s.c||'').slice(0,160))}${(s.c||'').length>160?'…':''}</div><div class="stock-actions"><button data-svcp="${s.id}">Copier</button><button data-svdel="${s.id}">Supprimer</button></div></div>`).join(''):'<div class="h">Aucun élément sauvegardé.</div>')}
function report(){const c=cur0();return['# Rapport NEXUS AI v'+V,'Date : '+new Date().toISOString(),...(c?c.m.map(m=>'['+m.r+(m.p?' '+m.p:'')+'] '+m.c):['(aucune)']),...st.log.map(x=>JSON.stringify(x))].join('\n')}
async function copy(t){try{await navigator.clipboard.writeText(t);return 1}catch{const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();let ok=0;try{ok=document.execCommand('copy')}catch{}a.remove();return ok}}
function view(v){const bar=document.getElementById('bar');if(bar)bar.style.display=(v==='chat'?'flex':'none');document.querySelectorAll('.v').forEach(e=>e.classList.toggle('on',e.id==='v-'+v));document.querySelectorAll('[data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===v));if(v==='set')rset();if(v==='hist')rhist();if(v==='guide')rguide()}
function rguide(){$('#v-guide').innerHTML='<button class="b2" data-v="set" style="margin-bottom:12px">← Retour aux paramètres</button><div class="guide">'+GUIDE_HTML+'</div>'}
document.addEventListener('click',e=>{const b=e.target.closest('[data-v]');if(!b)return;const v=b.dataset.v;const cur=document.querySelector('.v.on')?.id?.replace('v-','');if(v===cur&&v!=='chat')view('chat');else view(v);});
$('#sb').onclick=()=>send();$('#nw').onclick=()=>{pf=null;chip();st.sug=null;st.cur=null;nx.historique=[];save();render();view('chat')};$('#q').oninput=rhist;
let rec=null,micOn=false,micBase='';
function stopMic(){micOn=false;micBase='';if(rec){try{rec.onresult=null;rec.onend=null;rec.onerror=null;rec.abort?rec.abort():rec.stop()}catch{}rec=null}$('#mic').classList.remove('on')}
$('#mic').onclick=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast('Micro non disponible dans ce navigateur');JN.log('mic',{etat:'indisponible'});return}
if(micOn){stopMic();JN.log('mic',{etat:'stop'});return}
try{rec=new SR();rec.lang='fr-FR';rec.continuous=false;rec.interimResults=true;rec.maxAlternatives=1;micOn=true;micBase=$('#in').value.trim();$('#mic').classList.add('on');JN.log('mic',{etat:'start'});
rec.onresult=e=>{let interim='';for(let k=e.resultIndex;k<e.results.length;k++){const r=e.results[k];if(r.isFinal)micBase=(micBase+' '+r[0].transcript).trim();else interim+=r[0].transcript}const inp=$('#in');inp.value=(micBase+(interim?' '+interim:'')).trim();inp.dispatchEvent(new Event('input'))};
rec.onerror=e=>{JN.log('mic',{etat:'erreur',err:e&&e.error});if(e&&(e.error==='not-allowed'||e.error==='service-not-allowed')){toast('Micro refusé : autorise-le dans les réglages');stopMic()}};
rec.onend=()=>{if(micOn){try{rec.start()}catch{stopMic()}}};
rec.start()}catch(x){stopMic();toast('Micro impossible');JN.log('mic',{etat:'exception',msg:String(x&&x.message||x)})}};
let ttsI=null;function lire(txt){if(!('speechSynthesis' in window)){toast('Lecture vocale indisponible');return}const s=window.speechSynthesis;const meme=ttsI===txt;if(s.speaking||s.pending){s.cancel();JN.log('tts',{etat:'stop'});ttsI=null;if(meme)return}ttsI=txt;const u=new SpeechSynthesisUtterance(String(txt).replace(/[*_`#>]/g,'').slice(0,4000));u.lang='fr-FR';const v=(s.getVoices()||[]).find(x=>/^fr/i.test(x.lang));if(v)u.voice=v;u.onend=u.onerror=()=>{ttsI=null};s.speak(u);JN.log('tts',{etat:'start',len:String(txt).length})}
const IC_SEND='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"></path><path d="M22 2 15 22l-4-9-9-4 20-7z"></path></svg>';
const IC_STOP='<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"></rect></svg>';
$('#att').onclick=()=>$('#attfile').click();const TXT=/\.(txt|md|markdown|csv|tsv|json|jsonl|xml|html?|css|js|mjs|ts|tsx|jsx|py|java|c|h|cpp|cs|go|rs|php|rb|sh|sql|log|ya?ml|toml|ini|cfg|conf|env|svg|srt|vtt|tex)$/i,IMG=/\.(png|jpe?g|gif|webp|heic|heif|bmp)$/i,PDOC=/\.(pdf|docx|xlsx|xls|ods)$/i;
const kb=n=>n<1024?n+' o':n<1048576?Math.round(n/1024)+' Ko':(n/1048576).toFixed(1)+' Mo';
function updSb(){$('#sb').disabled=false}
function chip(){const c=$('#fchip');if(!pf){c.style.display='none';{const th=$('#fth');if(th)th.style.display='none'}$('#focr').style.display='none';$('#bar').classList.remove('hf');$('#v-chat').classList.remove('hf');$('#in').placeholder='Demandez à NEXUS...'}else{c.style.display='flex';{const th=$('#fth');if(th){if(pf.kind==='image'){th.src=pf.img;th.style.display='block'}else th.style.display='none'}}$('#focr').style.display=pf.kind==='image'?'inline-block':'none';$('#bar').classList.add('hf');$('#v-chat').classList.add('hf');$('#fname').textContent=(pf.kind==='image'?'🖼️ ':'📎 ')+pf.name+' · '+kb(pf.size)+(pf.trunc?' · coupé':'');$('#in').placeholder='Posez votre question…'}updSb()}
function shrink(f){return new Promise((ok,ko)=>{const u=URL.createObjectURL(f),im=new Image();im.onload=()=>{try{const w=im.naturalWidth,h=im.naturalHeight;if(!w||!h)throw new Error('vide');const go=(mx,q)=>{const k=Math.min(1,mx/Math.max(w,h)),cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(w*k));cv.height=Math.max(1,Math.round(h*k));const cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,cv.width,cv.height);cx.drawImage(im,0,0,cv.width,cv.height);return cv.toDataURL('image/jpeg',q)};let d=go(1024,.75);if(d.length>900000)d=go(768,.6);URL.revokeObjectURL(u);ok(d)}catch(e){URL.revokeObjectURL(u);ko(e)}};im.onerror=()=>{URL.revokeObjectURL(u);ko(new Error('image illisible'))};im.src=u})}
$('#attfile').onchange=async e=>{const f=e.target.files&&e.target.files[0];if(!f)return;try{
if(f.type.startsWith('image/')||IMG.test(f.name)){const d=await shrink(f);pf={name:f.name,size:f.size,kind:'image',img:d,file:f}}
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
$('#msgs').onclick=async e=>{const lbi=e.target.closest('img[data-lb]');if(lbi){openLb(lbi.dataset.lb);return}const sg=e.target.closest('.sug');if(sg){send(sg.dataset.q);return}
const b=e.target.closest('button');if(!b)return;const a=b.dataset.a;
if(a==='cardok'){await cardOk();return}if(a==='cardalt'){if(st.card){st.card.open=!st.card.open;render()}return}if(a==='cardpick'){cardPick(b.dataset.id);return}if(a==='cardno'){st.card=null;render();return}
const c=cur0(),m=c&&c.m[b.dataset.i];if(!m)return;
if(a==='tts')lire(m.c);else if(a==='gd'){m.good=!m.good;if(m.good)m.bad=false;L('feedback',{bon:m.good,q:(c.m[b.dataset.i-1]||{}).c?.slice(0,200),a:m.c.slice(0,300)});save();render()}else if(a==='re'){await reask(+b.dataset.i)}else if(a==='cp')toast(await copy(m.c)?'Copié':'Copie impossible');
else if(a==='sv'){const ex=(st.saved||[]).find(s=>s.c===m.c&&s.conv===c.id);if(ex){toast('Déjà sauvegardé');return}st.saved=[...(st.saved||[]),{id:Date.now(),d:Date.now(),t:(c.t||m.c.slice(0,40)),c:m.c,p:m.p,conv:c.id}];S.s('saved',st.saved);toast('Sauvegardé')}
else if(a==='dl')showDl(+b.dataset.i);
else if(a==='imgsave'){const T=await needTools();toast('Enregistrement…');await T.saveRemoteImage(m.img,'nexus-image.jpg')}
else if(a==='imgnew'){if(m.prompt&&!st.busy)await regenImage(m.prompt)}
else{m.bad=!m.bad;if(m.bad)m.good=false;L('feedback',{bad:m.bad,p:m.p,q:(c.m[b.dataset.i-1]||{}).c?.slice(0,200),a:m.c.slice(0,300)});save();render()}};
g('dlmenu').addEventListener('click',async e=>{const b=e.target.closest('button');if(e.target.id==='dlmenu'||(b&&!b.dataset.fmt)){g('dlmenu').style.display='none';return}if(b&&b.dataset.fmt){g('dlmenu').style.display='none';await exportMsg(b.dataset.fmt)}});
$('#hl').onclick=e=>{const d=e.target.closest('[data-del]');if(d){st.convs=st.convs.filter(c=>c.id!=d.dataset.del);if(st.cur==d.dataset.del)st.cur=null;save();rhist();return}const o=e.target.closest('[data-o]');if(o){pf=null;chip();st.cur=+o.dataset.o;save();render();view('chat')}};
$('#stock').onclick=async e=>{const del=e.target.closest('[data-svdel]');if(del){st.saved=(st.saved||[]).filter(s=>s.id!=del.dataset.svdel);S.s('saved',st.saved);rhist();toast('Supprimé');return}const cp=e.target.closest('[data-svcp]');if(cp){const s=(st.saved||[]).find(x=>x.id==cp.dataset.svcp);if(s)toast(await copy(s.c)?'Copié':'Copie impossible')}};
addEventListener('online',upd);addEventListener('offline',upd);
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(e=>L('sw_error',{msg:e.message})));
render();upd();view('chat');addEventListener('pageshow',()=>view('chat'));setTimeout(upd,1500);setInterval(()=>{pstat();upd()},60000);
JN.instrumenter({version:V,standalone:(()=>{try{return matchMedia('(display-mode: standalone)').matches}catch{return null}})()});
L('start',{v:V});
