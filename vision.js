// Vision : essaie des voies gratuites, jamais d'invention. Renvoie { ok, texte } ou { ok:false }.
const contenu = (q, url) => [{ type: "text", text: q }, { type: "image_url", image_url: { url } }];
async function post(fetchFn, url, body, headers = {}, ms = 30000) {
  const ac = new AbortController(), to = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetchFn(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), signal: ac.signal });
    if (!r.ok) { const e = new Error("HTTP " + r.status); e.status = r.status; throw e; }
    const j = await r.json();
    return String(j?.choices?.[0]?.message?.content ?? "").trim();
  } finally { clearTimeout(to); }
}
export async function voir({ dataUrl, question, cle = "", puterChat = null, fetchFn = (...a) => fetch(...a), log = () => {} }) {
  const q = (question && question.trim()) || "Décris précisément cette image en français.";
  const voies = [["gratuit-anonyme", () => post(fetchFn, "https://text.pollinations.ai/openai", { model: "openai", messages: [{ role: "user", content: contenu(q, dataUrl) }] })]];
  if (cle) voies.push(["gratuit-cle", () => post(fetchFn, "https://gen.pollinations.ai/v1/chat/completions", { model: "openai", messages: [{ role: "user", content: contenu(q, dataUrl) }] }, { Authorization: "Bearer " + cle })]);
  if (puterChat) voies.push(["compte", async () => { const r = await puterChat(q, dataUrl); return String(typeof r === "string" ? r : (r?.message?.content?.[0]?.text ?? r?.message?.content ?? "")).trim(); }]);
  for (const [nom, f] of voies) {
    try { const t = await f(); if (t && t.length > 1) { log("vision_ok", { voie: nom, len: t.length }); return { ok: true, texte: t, voie: nom }; } log("vision_vide", { voie: nom }); }
    catch (e) { log("vision_echec", { voie: nom, statut: e && e.status, msg: String(e && (e.message || e.error?.message) || e).slice(0, 160) }); }
  }
  return { ok: false };
}
