// Journal détaillé : IndexedDB (jusqu'à ~8000 lignes, les plus anciennes sont supprimées). Les clés/secrets sont masqués.
const DB = "nexus-journal", ST = "e", MAX = 8000;
let db = null, ready = null, writes = 0, mem = [];
const SECRET = /key|token|secret|authorization|password|workerurl/i;
const masque = (s) => String(s).replace(/(gsk_|sk-or-v1-|sk-or-|sk-|AIza|pk_)[A-Za-z0-9_\-]{6,}/g, "$1***").replace(/([?&](?:key|api_key|token)=)[^&\s"']+/gi, "$1***").replace(/(Bearer\s+)[A-Za-z0-9._\-]{8,}/gi, "$1***");
function nettoie(v, d = 0) {
  if (v == null) return v;
  if (typeof v === "string") return masque(v.length > 6000 ? v.slice(0, 6000) + "…[coupé]" : v);
  if (typeof v !== "object") return v;
  if (d > 4) return "[…]";
  if (Array.isArray(v)) return v.slice(0, 60).map((x) => nettoie(x, d + 1));
  const o = {};
  for (const k of Object.keys(v).slice(0, 60)) o[k] = SECRET.test(k) ? "***" : (typeof v[k] === "function" ? "[fn]" : nettoie(v[k], d + 1));
  return o;
}
function ouvrir() {
  ready ??= new Promise((res) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(ST, { keyPath: "id", autoIncrement: true });
      r.onsuccess = () => { db = r.result; res(db); };
      r.onerror = () => res(null); r.onblocked = () => res(null);
    } catch { res(null); }
  });
  return ready;
}
export async function log(type, data = {}) {
  const e = { t: new Date().toISOString(), type, ...nettoie(data && typeof data === "object" ? data : { v: data }) };
  mem.push(e); if (mem.length > 400) mem.shift();
  const d = await ouvrir(); if (!d) return;
  try {
    d.transaction(ST, "readwrite").objectStore(ST).add(e);
    if (++writes % 300 === 0) elaguer(d);
  } catch {}
}
function elaguer(d) {
  try {
    const s = d.transaction(ST, "readwrite").objectStore(ST), c = s.count();
    c.onsuccess = () => { let n = c.result - MAX; if (n <= 0) return; s.openCursor().onsuccess = (ev) => { const cur = ev.target.result; if (cur && n-- > 0) { cur.delete(); cur.continue(); } }; };
  } catch {}
}
const lire = (fn) => ouvrir().then((d) => d ? new Promise((res) => { try { const r = fn(d.transaction(ST, "readonly").objectStore(ST)); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch { res(null); } }) : null);
export async function all() { const r = await lire((s) => s.getAll()); return r || mem.slice(); }
export async function count() { const r = await lire((s) => s.count()); return r ?? mem.length; }
export async function clear() { mem = []; const d = await ouvrir(); if (d) try { d.transaction(ST, "readwrite").objectStore(ST).clear(); } catch {} }

// Capte tout ce qui se passe : réseau, clics, erreurs, état de l'appareil et de l'app.
export function instrumenter(info = {}) {
  const w = globalThis;
  log("demarrage", { ...info, ua: w.navigator && navigator.userAgent, langue: w.navigator && navigator.language, ecran: w.screen && [screen.width, screen.height, w.devicePixelRatio], en_ligne: w.navigator && navigator.onLine, memoire_go: w.navigator && navigator.deviceMemory });
  if (w.fetch && !w.fetch.__nx) {
    const f0 = w.fetch.bind(w);
    w.fetch = async (u, o = {}) => {
      const t0 = Date.now(), url = masque(typeof u === "string" ? u : (u && u.url) || ""), m = (o && o.method) || "GET";
      let taille = 0; try { taille = o && o.body ? String(o.body).length : 0; } catch {}
      try { const r = await f0(u, o); log("reseau", { m, url: url.slice(0, 220), statut: r.status, ok: r.ok, ms: Date.now() - t0, envoye: taille }); return r; }
      catch (e) { log("reseau_erreur", { m, url: url.slice(0, 220), ms: Date.now() - t0, msg: String(e && e.message || e) }); throw e; }
    };
    w.fetch.__nx = 1;
  }
  const doc = w.document; if (!doc) return;
  doc.addEventListener("click", (e) => { const b = e.target && e.target.closest && e.target.closest("button,[data-a],[data-v],[data-q],[data-lb],a"); if (b) log("clic", { id: b.id || null, a: b.dataset && b.dataset.a || null, v: b.dataset && b.dataset.v || null, q: b.dataset && b.dataset.q || null, tag: b.tagName }); }, true);
  doc.addEventListener("visibilitychange", () => log("visibilite", { etat: doc.visibilityState }));
  w.addEventListener && w.addEventListener("online", () => log("reseau_etat", { en_ligne: true }));
  w.addEventListener && w.addEventListener("offline", () => log("reseau_etat", { en_ligne: false }));
  w.addEventListener && w.addEventListener("pagehide", () => log("page_masquee", {}));
  try { navigator.serviceWorker && navigator.serviceWorker.addEventListener("controllerchange", () => log("sw", { evenement: "controllerchange" })); } catch {}
}
