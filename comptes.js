// Liste des fournisseurs lue dans nexus-corps.mjs (configurerFournisseurs) : groq, openrouter, puter, pollinations, cohere, cloudflare.
// Qwen n'a aucun champ : le corps ne fournit pas de transport Qwen.
export const FOURNISSEURS = [
  { id: "groq", nom: "Groq", champs: [{ k: "apiKey", l: "Clé API", secret: true }, { k: "model", l: "Modèle (optionnel)" }] },
  { id: "openrouter", nom: "OpenRouter", champs: [{ k: "apiKey", l: "Clé API", secret: true }, { k: "model", l: "Modèle (optionnel)" }] },
  { id: "cohere", nom: "Cohere", champs: [{ k: "apiKey", l: "Clé API", secret: true }, { k: "model", l: "Modèle (optionnel)" }] },
  { id: "cloudflare", nom: "Cloudflare (via ton Worker)", champs: [{ k: "workerUrl", l: "URL de ton Worker" }, { k: "model", l: "Modèle (optionnel)" }] },
  { id: "pollinations", nom: "Pollinations", champs: [{ k: "apiKey", l: "Clé gratuite (optionnelle)", secret: true }, { k: "actif", l: "Utiliser même sans clé (anonyme)", type: "checkbox" }] },
  { id: "puter", nom: "Puter", connexion: true, champs: [] },
];

const net = (nom, r) => { const e = new Error(nom + " " + r.status); e.status = r.status; e.kind = r.status === 401 ? "auth" : r.status === 429 ? "quota" : "network"; return e; };

// Transforme ce que l'utilisateur a saisi (localStorage) en config pour nx.configurerFournisseurs(). Pas de clé = pas de fournisseur.
export function construireConfig(saisi = {}, { puterChat = null, fetchFn = (...a) => fetch(...a) } = {}) {
  const cfg = {}, v = (id, k) => String(saisi?.[id]?.[k] ?? "").trim();
  for (const id of ["groq", "openrouter", "cohere"]) {
    if (v(id, "apiKey")) cfg[id] = { apiKey: v(id, "apiKey"), ...(v(id, "model") && { model: v(id, "model") }) };
  }
  const url = v("cloudflare", "workerUrl");
  if (url) {
    // Le navigateur ne peut pas appeler l'API Cloudflare directement : on passe par ton Worker, branché comme "binding" (sans toucher au corps).
    const binding = { run: async (model, { messages }) => {
      const r = await fetchFn(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages, model }) });
      if (!r.ok) throw net("Cloudflare", r);
      return r.json();
    } };
    cfg.cloudflare = { binding, ...(v("cloudflare", "model") && { model: v("cloudflare", "model") }) };
  }
  if (v("pollinations", "apiKey") || saisi?.pollinations?.actif) cfg.pollinations = { apiKey: v("pollinations", "apiKey") };
  if (puterChat) cfg.puter = { puterChat };
  return cfg;
}
