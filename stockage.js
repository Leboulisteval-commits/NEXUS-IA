// Images conservées sur l'appareil (IndexedDB) : les conversations ne gardent que l'identifiant, l'image revient à chaque ouverture.
const DB = "nexus-images", ST = "i", MAX = 120, MAX_OCTETS = 150e6;
let db = null, ready = null;
const ouvrir = () => (ready ??= new Promise((res) => {
  try {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ST, { keyPath: "id" });
    r.onsuccess = () => { db = r.result; res(db); };
    r.onerror = () => res(null); r.onblocked = () => res(null);
  } catch { res(null); }
}));
const req = (r) => new Promise((ok) => { r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); });
export const nouvelId = () => "img" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

async function versBlob(src) {
  if (src instanceof Blob) return src;
  const r = await fetch(src);                // data: ou https: (CORS requis pour https:)
  if (!r.ok) throw new Error("HTTP " + r.status);
  return await r.blob();
}
/** Enregistre une image (data:, blob:, https:). -> id, ou null si impossible (l'adresse https reste alors la seule trace). */
export async function garder(src, id = nouvelId()) {
  try {
    const d = await ouvrir(); if (!d) return null;
    const blob = await versBlob(src);
    if (!blob || !blob.size || !/^image\//.test(blob.type || "image/jpeg")) return null;
    const ok = await new Promise((res) => { try { const tx = d.transaction(ST, "readwrite"); tx.objectStore(ST).put({ id, blob, t: Date.now(), n: blob.size }); tx.oncomplete = () => res(true); tx.onerror = () => res(false); tx.onabort = () => res(false); } catch { res(false); } });
    if (!ok) return null;
    elaguer();
    return id;
  } catch { return null; }
}
/** -> adresse blob: utilisable dans <img>, ou null. */
export async function lire(id) {
  try {
    const d = await ouvrir(); if (!d || !id) return null;
    const row = await req(d.transaction(ST, "readonly").objectStore(ST).get(id));
    return row && row.blob ? URL.createObjectURL(row.blob) : null;
  } catch { return null; }
}
export async function supprimer(ids) {
  try {
    const d = await ouvrir(); if (!d) return;
    const s = d.transaction(ST, "readwrite").objectStore(ST);
    for (const id of ids || []) if (id) s.delete(id);
  } catch {}
}
export async function toutEffacer() { try { const d = await ouvrir(); if (d) d.transaction(ST, "readwrite").objectStore(ST).clear(); } catch {} }
// Garde les plus récentes : au plus MAX images et MAX_OCTETS octets.
async function elaguer() {
  try {
    const d = await ouvrir(); if (!d) return;
    const rows = (await req(d.transaction(ST, "readonly").objectStore(ST).getAll())) || [];
    let total = rows.reduce((a, r) => a + (r.n || 0), 0), n = rows.length;
    if (n <= MAX && total <= MAX_OCTETS) return;
    const s = d.transaction(ST, "readwrite").objectStore(ST);
    for (const r of rows.sort((a, b) => a.t - b.t)) { if (n <= MAX && total <= MAX_OCTETS) break; s.delete(r.id); n--; total -= r.n || 0; }
  } catch {}
}
