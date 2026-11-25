/**
 * NEXUS BRAIN - Module d'Intelligence Locale
 */
const CONFIG = {
  embeddingModel: "Xenova/all-MiniLM-L6-v2",
  llmModel: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
  intents: {
    code: "programmation développement script code erreur bug python javascript html css api algorithme",
    creative: "histoire poème créatif écris-moi invention scénario imagination paroles fiction",
    translation: "traduire traduction anglais espagnol allemand italien chinois japonais langue",
    long_context: "résumer résumé synthèse analyse de texte long document rapport",
    general: "bonjour discussion générale question réponse conseil information explication",
    math: "calcul mathématiques addition soustraction multiplication division équation formule"
  }
};

let isRouterReady = false;
let isLLMReady = false;
let extractor = null;
let engine = null;

export async function initRouter(onProgress = null) {
  if (isRouterReady) return true;
  try {
    if (onProgress) onProgress("Chargement du routeur sémantique...");
    const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
    env.allowLocalModels = false;
    extractor = await pipeline('feature-extraction', CONFIG.embeddingModel);
    isRouterReady = true;
    if (onProgress) onProgress("Routeur prêt !");
    return true;
  } catch (error) {
    console.error("Erreur d'initialisation du routeur:", error);
    return false;
  }
}

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function analyzeIntentDetailed(text) {
  if (!isRouterReady || !extractor) return null;
  try {
    const userEmbedding = await extractor(text, { pooling: 'mean', normalize: true });
    const userVector = Array.from(userEmbedding.data);
    let scores = [];
    for (const [intentName, refPhrase] of Object.entries(CONFIG.intents)) {
      const refEmbedding = await extractor(refPhrase, { pooling: 'mean', normalize: true });
      const refVector = Array.from(refEmbedding.data);
      scores.push({ intent: intentName, score: cosineSimilarity(userVector, refVector) });
    }
    scores.sort((a, b) => b.score - a.score);
    const best = scores[0];
    const second = scores[1] || { score: 0 };
    return { intent: best.intent, score: best.score, margin: best.score - second.score };
  } catch (error) {
    console.error("Erreur lors de l'analyse de l'intention:", error);
    return null;
  }
}

export async function initLLM(onProgress = null) {
  if (isLLMReady) return true;
  if (!navigator.gpu) return false;
  try {
    if (onProgress) onProgress("Préparation du cerveau local...");
    const webllm = await import('https://esm.run/@mlc-ai/web-llm');
    engine = await webllm.CreateMLCEngine(CONFIG.llmModel, {
      initProgressCallback: (report) => { if (onProgress) onProgress(report.text); }
    });
    isLLMReady = true;
    return true;
  } catch (error) {
    console.error("Erreur d'initialisation du LLM local:", error);
    return false;
  }
}

export async function generateLocalResponse(prompt, history = [], maxTokens = 500) {
  if (!isLLMReady || !engine) throw new Error("Le cerveau local n'est pas prêt.");
  try {
    const messages = [
      { role: "system", content: "Tu es NEXUS, un assistant concis. Réponds en français." },
      ...history,
      { role: "user", content: prompt }
    ];
    const reply = await engine.chat.completions.create({
      messages: messages,
      temperature: 0.7,
      max_tokens: Math.min(maxTokens, 500), // Sécurité 500 tokens max
    });
    return reply.choices[0].message.content;
  } catch (error) {
    console.error("Erreur de génération locale:", error);
    throw error;
  }
}

export function resetLLM() { isLLMReady = false; engine = null; }
export function interrupt() { if(engine) engine.interruptGenerate(); }
export async function ensurePersistentStorage() {
  if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
  return false;
}
