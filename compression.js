// Réduit une pièce jointe EN LOCAL avant de l'envoyer à une IA : moins de jetons, donc moins de crédits.
// Règle d'or : le résultat reste du texte propre et lisible (phrases entières, jamais de charabia), avec un en-tête qui dit à l'IA que c'est condensé.
const STOP = new Set("le la les un une des du de d l et ou mais donc or ni car que qui quoi dont où en dans sur sous par pour avec sans chez vers entre est sont était être a ont avait avoir au aux ce cet cette ces se sa son ses leur leurs il elle ils elles on nous vous je tu me te ne pas plus très aussi comme si the of and to in is are was for with that this it on as at by be from or an".split(" "));
const mots = (s) => (String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]{3,}/g) || []).filter((w) => !STOP.has(w));

export function texteLisible(t) {
  const s = String(t || "").trim(); if (s.length < 12) return false;
  const lettres = (s.match(/[A-Za-zÀ-ÿ]/g) || []).length, espaces = (s.match(/\s/g) || []).length;
  if ((lettres + espaces) / s.length < 0.72) return false;
  const vrais = (s.match(/[A-Za-zÀ-ÿ]{3,}/g) || []);
  if (vrais.length < 4 || vrais.join("").length / Math.max(1, lettres) < 0.6) return false;
  const voy = vrais.filter((w) => /[aeiouyàâéèêëîïôùûü]/i.test(w)).length / vrais.length;
  return voy > 0.8;
}

export function normaliser(brut) {
  let t = String(brut || "").replace(/\r\n?/g, "\n").replace(/[\u200b-\u200d\ufeff\u00ad]/g, "").replace(/\t/g, " ");
  t = t.replace(/(\w)-\n(\w)/g, "$1$2");                                   // mots coupés en fin de ligne
  let lignes = t.split("\n").map((l) => l.replace(/\s+$/g, "").replace(/ {2,}/g, " "));
  lignes = lignes.filter((l) => !/^\s*[-=_*•·.~]{3,}\s*$/.test(l) && !/^\s*(page\s*)?\d+\s*(\/|sur|of)\s*\d+\s*$/i.test(l) && !/^\s*[-–—]?\s*\d{1,4}\s*[-–—]?\s*$/.test(l));
  const freq = new Map(); for (const l of lignes) { const k = l.trim(); if (k.length > 3 && k.length < 90) freq.set(k, (freq.get(k) || 0) + 1); }
  lignes = lignes.filter((l) => (freq.get(l.trim()) || 0) < 4 || l.trim().length > 90);  // en-têtes / pieds de page répétés
  const out = [];                                                          // recolle les lignes coupées au milieu d'une phrase (PDF)
  for (const l of lignes) {
    const prev = out[out.length - 1];
    if (prev && prev.trim() && l.trim() && !/[.!?:;»)\]]$/.test(prev.trim()) && /^[a-zà-ÿ(«"']/.test(l.trim()) && prev.length > 40) out[out.length - 1] = prev + " " + l.trim(); else out.push(l);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function resumerTableau(t, budget) {
  const L = t.split("\n").filter((l) => l.trim()); if (L.length < 3) return null;
  const d = [";", "\t", ",", "|"].find((c) => L.slice(0, 5).every((l) => l.split(c).length === L[0].split(c).length && L[0].split(c).length > 1)); if (!d) return null;
  const cols = L[0].split(d).map((c) => c.trim()), lignes = L.slice(1), out = [`Tableau de ${lignes.length} lignes et ${cols.length} colonnes : ${cols.join(", ")}`];
  const stats = cols.map((c, i) => { const v = lignes.map((l) => l.split(d)[i]).filter((x) => x != null && x.trim() !== "").map((x) => Number(String(x).replace(",", "."))); return v.length && v.every((x) => !isNaN(x)) ? `${c} : min ${Math.min(...v)}, max ${Math.max(...v)}, moyenne ${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)}` : null; }).filter(Boolean);
  if (stats.length) out.push("Valeurs numériques — " + stats.join(" ; "));
  out.push("Premières lignes :", L[0], ...L.slice(1, 9)); if (lignes.length > 8) out.push(`[… ${lignes.length - 8} lignes de plus omises …]`);
  return out.join("\n").slice(0, budget);
}

function resumerCode(t, budget) {
  const L = t.split("\n"); if (t.length <= budget) return t;
  const sig = L.map((l, i) => [l, i]).filter(([l]) => /^\s*(export\s+)?(async\s+)?(function|class|def|interface|type|const\s+\w+\s*=\s*(async\s*)?\(|public|private|func|fn)\b/.test(l));
  const tete = L.slice(0, 40).join("\n");
  const sigTxt = sig.filter(([, i]) => i >= 40).map(([l]) => l.trim()).join("\n");
  return (tete + "\n[… code intermédiaire omis ; signatures des blocs suivants :]\n" + sigTxt).slice(0, budget);
}

function extraire(t, budget, question) {
  const paras = t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const phrases = []; // {txt, p, i, titre}
  paras.forEach((p, pi) => {
    if (p.length < 90 && !/[.!?]$/.test(p)) { phrases.push({ txt: p, p: pi, titre: true }); return; }
    (p.match(/[^.!?\n]+(?:[.!?]+(?=\s|$)|$)/g) || [p]).map((s) => s.trim()).filter((s) => s.length > 2).forEach((s) => phrases.push({ txt: s, p: pi }));
  });
  const df = new Map(); for (const s of phrases) for (const w of new Set(mots(s.txt))) df.set(w, (df.get(w) || 0) + 1);
  const tf = new Map(); for (const s of phrases) for (const w of mots(s.txt)) tf.set(w, (tf.get(w) || 0) + 1);
  const qm = new Set(mots(question || ""));
  phrases.forEach((s, i) => {
    const w = mots(s.txt); let sc = w.reduce((a, x) => a + (tf.get(x) || 0) / Math.sqrt(df.get(x) || 1), 0) / Math.sqrt(w.length + 3);
    if (s.titre) sc = 9; if (w.some((x) => qm.has(x))) sc *= 2.2;
    if (s.p === 0) sc *= 1.6; if (s.p === paras.length - 1) sc *= 1.3; if (/\d/.test(s.txt)) sc *= 1.15;
    s.sc = sc; s.i = i;
  });
  const reste = budget - 120; let taille = 0; const pris = new Set();
  for (const s of [...phrases].sort((a, b) => b.sc - a.sc)) { if (taille + s.txt.length + 1 > reste) continue; pris.add(s.i); taille += s.txt.length + 1; }
  let out = "", dernier = -1, pp = -1;
  phrases.forEach((s, i) => { if (!pris.has(i)) return; if (dernier >= 0 && i - dernier > 1) out += " […] "; if (s.p !== pp && pp >= 0) out += "\n"; out += (out && !/[\s\n]$/.test(out) ? " " : "") + s.txt; dernier = i; pp = s.p; });
  return out.replace(/ {2,}/g, " ").trim();
}

// -> { text, avant, apres, methode }
export function compresser({ name = "", text = "", question = "", budget = 2800 } = {}) {
  const avant = String(text || "").length; let t = normaliser(text), methode = "nettoyage";
  if (/\.(json)$/i.test(name) || /^[\[{]/.test(t)) { try { const j = JSON.parse(t); t = JSON.stringify(j); methode = "json"; if (t.length > budget) { t = t.slice(0, budget) + " […]"; methode = "json coupé"; } } catch {} }
  if (methode === "nettoyage") { const tab = (/\.(csv|tsv)$/i.test(name) || t.split("\n").length > 3) ? resumerTableau(t, budget) : null; if (tab) { t = tab; methode = "tableau"; } }
  if (methode === "nettoyage" && (/\.(js|mjs|ts|py|java|c|cpp|cs|go|rs|php|rb|html|css|sh|sql|kt|swift)$/i.test(name))) { t = resumerCode(t, budget); methode = "code"; }
  if (methode === "nettoyage" && t.length > budget) { t = extraire(t, budget, question); methode = "résumé extractif"; }
  const apres = t.length;
  if (apres < avant * 0.97) t = `[Texte condensé automatiquement (${apres} sur ${avant} caractères) ; […] marque un passage omis.]\n` + t;
  return { text: t, avant, apres: t.length, methode };
}

// ---------- Normalisation des réponses (v1.1) ----------
// Ne change JAMAIS le contenu : mêmes mots, mêmes chiffres, même code. Seulement la propreté invisible :
// fins de ligne uniformes, espaces parasites en fin de ligne, caractères de largeur nulle, lignes vides en trop,
// accents sous une seule forme Unicode (NFC). Les blocs de code ne sont pas touchés. Si la vérification échoue, le texte d'origine est rendu tel quel.
const INVISIBLES = /[​﻿⁠]/g;
const visible = (t) => String(t).replace(/[\s​﻿⁠]+/g, "").normalize("NFC");
function proseNette(t) {
  return t.replace(INVISIBLES, "").normalize("NFC").replace(/[ \t]+(?=\n|$)/g, "").replace(/\n{3,}/g, "\n\n");
}
export function normaliserReponse(brut) {
  const original = String(brut ?? "");
  if (!original.trim()) return original;
  try {
    const parts = original.replace(/\r\n?/g, "\n").split(/(```[\s\S]*?```)/g);
    const out = parts.map((p, i) => {
      if (i % 2) return p;                       // bloc de code fermé : intact
      const k = p.indexOf("```");                // bloc de code jamais refermé : tout ce qui suit reste intact
      return k < 0 ? proseNette(p) : proseNette(p.slice(0, k)) + p.slice(k);
    }).join("").replace(/^\s*\n/, "").replace(/\s+$/, "");
    return visible(out) === visible(original) ? out : original;
  } catch { return original; }
}
