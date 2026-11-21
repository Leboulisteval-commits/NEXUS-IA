/**
 * NEXUS BRAIN - Module d'Intelligence Locale
 * 100% navigateur (On-Device AI). Zéro crédit, zéro API key.
 * 
 * Utilise :
 * - Transformers.js (Hugging Face) pour la compréhension sémantique (Routeur)
 * - WebLLM (MLC AI) pour la génération de texte local (Fallback / Chat)
 */

// --- 1. CONFIGURATION DES MODÈLES ---
const CONFIG = {
  // Modèle ultra-léger pour comprendre le sens des phrases (~25 Mo)
  embeddingModel: "Xenova/all-MiniLM-L6-v2",
  
  // Modèle de génération de texte local (WebLLM). 
  // Qwen 0.5B est très léger (~350 Mo) et bon en français pour sa taille.
  llmModel: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
  
  // Phrases de référence pour le routeur (pour comparer le sens)
  intents: {
    code: "programmation développement script code erreur bug python javascript html css api algorithme",
    creative: "histoire poème créatif écris-moi invention scénario imagination paroles fiction",
    translation: "traduire traduction anglais espagnol allemand italien chinois japonais langue",
    long_context: "résumer résumé synthèse analyse de texte long document rapport",
    general: "bonjour discussion générale question réponse conseil information explication",
    math: "calcul mathématiques addition soustraction multiplication division équation formule",
  }
};

// État interne du cerveau
let isRouterReady = false;
let isLLMReady = false;
let extractor = null;
let engine = null;

// --- 2. LE ROUTEUR SÉMANTIQUE (Comprendre le sens) ---

/**
 * Initialise le petit modèle de compréhension (Transformers.js)
 */
export async function initRouter(onProgress = null) {
  if (isRouterReady) return true;
  try {
    if (onProgress) onProgress("Chargement du routeur sémantique...");
    
    // Import dynamique de Transformers.js depuis un CDN
    const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
    
    // Désactiver l'envoi de requêtes locales pour éviter les erreurs CORS
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

/**
 * Calcule la similarité cosinus entre deux vecteurs (mesure de sens)
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Analyse la phrase de l'utilisateur et renvoie l'intention dominante
 * @param {string} text - Le message de l'utilisateur
 * @returns {string} L'intention (code, creative, general, etc.)
 */
export async function analyzeIntent(text) {
  if (!isRouterReady || !extractor) {
    console.warn("Le routeur n'est pas initialisé.");
    return "general"; // Fallback par défaut
  }

  try {
    // 1. On transforme le message en vecteur (Embedding)
    const userEmbedding = await extractor(text, { pooling: 'mean', normalize: true });
    const userVector = Array.from(userEmbedding.data);

    // 2. On compare avec nos phrases de référence
    let bestIntent = "general";
    let bestScore = -1;

    for (const [intentName, refPhrase] of Object.entries(CONFIG.intents)) {
      const refEmbedding = await extractor(refPhrase, { pooling: 'mean', normalize: true });
      const refVector = Array.from(refEmbedding.data);
      
      const score = cosineSimilarity(userVector, refVector);
      
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intentName;
      }
    }

    console.log(`[Nexus Brain] Intention détectée : ${bestIntent} (Score: ${bestScore.toFixed(3)})`);
    return bestIntent;
  } catch (error) {
    console.error("Erreur lors de l'analyse de l'intention:", error);
    return "general";
  }
}

// --- 3. LE LLM LOCAL (Génération de texte hors-ligne) ---

/**
 * Initialise le modèle de génération (WebLLM). 
 * Attention: Cela télécharge ~350 Mo la première fois !
 */
export async function initLLM(onProgress = null) {
  if (isLLMReady) return true;
  
  // Vérification du support WebGPU
  if (!navigator.gpu) {
    console.warn("WebGPU n'est pas supporté sur ce navigateur. Le LLM local est désactivé.");
    return false;
  }

  try {
    if (onProgress) onProgress("Préparation du cerveau local (peut prendre du temps la 1ère fois)...");
    
    // Import dynamique de WebLLM
    const webllm = await import('https://esm.run/@mlc-ai/web-llm');
    
    engine = await webllm.CreateMLCEngine(CONFIG.llmModel, {
      initProgressCallback: (report) => {
        if (onProgress) onProgress(report.text);
      }
    });

    isLLMReady = true;
    if (onProgress) onProgress("Cerveau local prêt !");
    return true;
  } catch (error) {
    console.error("Erreur d'initialisation du LLM local:", error);
    return false;
  }
}

/**
 * Génère une réponse localement (sans internet une fois téléchargé)
 * @param {string} prompt - La question de l'utilisateur
 * @param {Array} history - L'historique de la conversation (optionnel)
 * @returns {Promise<string>} La réponse générée
 */
export async function generateLocalResponse(prompt, history = []) {
  if (!isLLMReady || !engine) {
    throw new Error("Le cerveau local n'est pas prêt. Lancez initLLM() d'abord.");
  }

  try {
    const messages = [
      { role: "system", content: "Tu es NEXUS, un assistant utile qui répond de manière concise et en français." },
      ...history,
      { role: "user", content: prompt }
    ];

    const reply = await engine.chat.completions.create({
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    return reply.choices[0].message.content;
  } catch (error) {
    console.error("Erreur de génération locale:", error);
    throw error;
  }
}

// --- 4. FONCTIONS UTILITAIRES ---

/**
 * Vérifie si le cerveau est prêt
 */
export function isReady() {
  return { router: isRouterReady, llm: isLLMReady };
}

/**
 * Demande au navigateur de conserver les fichiers en cache (ne pas les supprimer)
 */
export async function ensurePersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    console.log(`Stockage persistant accordé : ${isPersisted}`);
    return isPersisted;
  }
  return false;
}
