/**
 * NEXUS BRAIN - intelligence locale (sur l'appareil)
 * Zéro crédit, zéro clé API.
 *
 * - Routeur sémantique : Transformers.js (version figée) pour comprendre le sens d'une demande.
 * - Cerveau local : WebLLM (version figée) pour générer du texte directement sur le téléphone.
 *
 * Versions figées volontairement : ce code s'exécute dans la même page que vos clés API,
 * on ne charge donc jamais "la dernière version" d'un site tiers.
 */

// --- 1. CONFIGURATION ---
const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';
const WEBLLM_URL = 'https://esm.run/@mlc-ai/web-llm@0.2.79';

const CONFIG = {
  embeddingModel: 'Xenova/all-MiniLM-L6-v2',          // ~25 Mo
  llmModel: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',      // ~300 Mo, léger, correct en français pour sa taille
  // Plusieurs phrases d'exemple par catégorie : le routeur compare la demande à leur moyenne.
  intents: {
    code: ["écris une fonction en javascript", "j'ai une erreur dans mon code python", "comment corriger ce bug", "un script html et css", "une requête sql pour ma base de données", "un algorithme de tri", "mon site ne s'affiche plus", "problème de programmation avec une api"],
    creative: ["raconte-moi une histoire", "écris un poème", "invente un personnage de fiction", "imagine un scénario original", "écris les paroles d'une chanson", "raconte une blague drôle"],
    translation: ["traduis cette phrase en anglais", "comment dit-on bonjour en espagnol", "traduction en allemand", "traduire ce texte en français", "que veut dire ce mot en italien"],
    long_context: ["résume ce long texte", "fais une synthèse de ce document", "analyse ce rapport", "peux-tu résumer cet article", "quels sont les points clés de ce texte"],
    general: ["bonjour comment ça va", "explique-moi simplement ce concept", "donne-moi un conseil", "une question de culture générale", "une idée de recette de cuisine", "dis-moi quelque chose d'intéressant"],
    math: ["combien font douze fois sept", "résous cette équation", "calcule un pourcentage", "une addition et une multiplication", "un problème de mathématiques"]
  }
};

let isRouterReady = false;
let isLLMReady = false;
let extractor = null;
let engine = null;
let refVectors = null;     // vecteurs de référence calculés UNE seule fois
let routerLoading = null;  // évite deux chargements en parallèle
let llmLoading = null;

// --- 2. ROUTEUR SÉMANTIQUE ---
export async function initRouter(onProgress = null) {
  if (isRouterReady) return true;
  if (routerLoading) return routerLoading;
  routerLoading = (async () => {
    try {
      if (onProgress) onProgress('Chargement du routeur sémantique...');
      const { pipeline, env } = await import(TRANSFORMERS_URL);
      env.allowLocalModels = false;
      extractor = await pipeline('feature-extraction', CONFIG.embeddingModel);
      // Les phrases de référence sont transformées en vecteurs une seule fois, ici.
      const refs = {};
      for (const [name, phrases] of Object.entries(CONFIG.intents)) {
        let sum = null;
        for (const phrase of phrases) {
          const out = await extractor(phrase, { pooling: 'mean', normalize: true });
          const v = Array.from(out.data);
          sum = sum ? sum.map((x, i) => x + v[i]) : v;
        }
        const norm = Math.sqrt(sum.reduce((a, x) => a + x * x, 0)) || 1;
        refs[name] = sum.map(x => x / norm);
      }
      refVectors = refs;
      isRouterReady = true;
      if (onProgress) onProgress('Routeur prêt !');
      return true;
    } catch (error) {
      console.error("Erreur d'initialisation du routeur:", error);
      return false;
    } finally {
      routerLoading = null;
    }
  })();
  return routerLoading;
}

function cosineSimilarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

/**
 * Renvoie l'intention dominante ET son score, pour que l'application puisse
 * se méfier d'un résultat peu sûr.
 * @returns {Promise<{intent:string, score:number, second:number}|null>}
 */
export async function analyzeIntentDetailed(text) {
  if (!isRouterReady || !extractor || !refVectors) return null;
  try {
    const out = await extractor(text, { pooling: 'mean', normalize: true });
    const v = Array.from(out.data);
    let best = 'general', bestScore = -1, second = -1;
    for (const [name, ref] of Object.entries(refVectors)) {
      const s = cosineSimilarity(v, ref);
      if (s > bestScore) { second = bestScore; bestScore = s; best = name; }
      else if (s > second) { second = s; }
    }
    return { intent: best, score: bestScore, second };
  } catch (error) {
    console.error("Erreur lors de l'analyse de l'intention:", error);
    return null;
  }
}

/** Compatibilité avec l'ancienne version : renvoie seulement le nom de l'intention. */
export async function analyzeIntent(text) {
  const r = await analyzeIntentDetailed(text);
  return r ? r.intent : 'general';
}

// --- 3. CERVEAU LOCAL (WebLLM) ---
export async function initLLM(onProgress = null) {
  if (isLLMReady) return true;
  if (llmLoading) return llmLoading;
  if (!navigator.gpu) {
    console.warn("WebGPU n'est pas supporté sur ce navigateur : cerveau local désactivé.");
    return false;
  }
  llmLoading = (async () => {
    try {
      if (onProgress) onProgress('Préparation du cerveau local (peut prendre du temps la 1ère fois)...');
      const webllm = await import(WEBLLM_URL);
      engine = await webllm.CreateMLCEngine(CONFIG.llmModel, {
        initProgressCallback: (report) => { if (onProgress) onProgress(report.text); }
      });
      isLLMReady = true;
      if (onProgress) onProgress('Cerveau local prêt !');
      return true;
    } catch (error) {
      console.error("Erreur d'initialisation du LLM local:", error);
      return false;
    } finally {
      llmLoading = null;
    }
  })();
  return llmLoading;
}

/**
 * Génère une réponse localement.
 * @param {string} prompt - la question
 * @param {Array} history - messages précédents [{role, content}]
 * @param {number} maxTokens - longueur maximale de la réponse
 */
export async function generateLocalResponse(prompt, history = [], maxTokens = 500) {
  if (!isLLMReady || !engine) throw new Error("Le cerveau local n'est pas prêt.");
  const messages = [
    { role: 'system', content: 'Tu es NEXUS, un assistant utile qui répond de manière concise et en français.' },
    ...history,
    { role: 'user', content: prompt }
  ];
  try {
    const reply = await engine.chat.completions.create({ messages, temperature: 0.7, max_tokens: maxTokens });
    return reply.choices[0].message.content;
  } catch (error) {
    // Le téléphone peut couper le GPU (application en arrière-plan, manque de mémoire).
    if (/disposed|lost|popErrorScope|GPU|device/i.test(String(error && error.message))) {
      isLLMReady = false;
      engine = null;
      throw new Error('CERVEAU_ARRETE: ' + error.message);
    }
    throw error;
  }
}

/** Oublie le moteur actuel pour permettre un rechargement propre. */
export function resetLLM() {
  try { if (engine && engine.unload) engine.unload(); } catch (e) { /* rien */ }
  isLLMReady = false;
  engine = null;
  llmLoading = null;
}

/** Arrête la génération en cours (bouton ■ de l'application). */
export function interrupt() {
  try { if (engine && engine.interruptGenerate) engine.interruptGenerate(); } catch (e) { /* rien */ }
}

// --- 4. UTILITAIRES ---
export function isReady() {
  return { router: isRouterReady, llm: isLLMReady };
}

/** Demande au navigateur de ne pas supprimer les modèles téléchargés. */
export async function ensurePersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    try { return await navigator.storage.persist(); } catch (e) { return false; }
  }
  return false;
}
