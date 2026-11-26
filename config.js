// Réglages fixes de NEXUS AI (public). La clé Pollinations « pk_ » est une clé PUBLIQUE faite pour être placée dans le code d'un site.
export const VERSION = "2.0";
export const WORKER_URL = "https://worker-nexus-relais.leboulisteval.workers.dev/";
export const POLLINATIONS_KEY = "pk_mQ1y3epEHAWS7EjI";
// Plafonds par appareil et par jour sur les crédits partagés de Nexus (Cloudflare, Pollinations) : au-delà, Nexus passe en silence à une autre IA.
export const LIMITES_JOUR = { cloudflare: 60, pollinations: 40 };
// Fournisseurs proposés pour ajouter une IA personnelle (toutes compatibles OpenAI).
export const MODELES_PERSO = [
  { nom: "Groq", url: "https://api.groq.com/openai/v1", model: "openai/gpt-oss-120b", aide: "console.groq.com/keys" },
  { nom: "OpenRouter", url: "https://openrouter.ai/api/v1", model: "meta-llama/llama-3.3-70b-instruct", aide: "openrouter.ai/keys" },
  { nom: "Mistral", url: "https://api.mistral.ai/v1", model: "mistral-small-latest", aide: "console.mistral.ai/api-keys" },
  { nom: "DeepSeek", url: "https://api.deepseek.com/v1", model: "deepseek-chat", aide: "platform.deepseek.com/api_keys" },
  { nom: "OpenAI", url: "https://api.openai.com/v1", model: "gpt-4o-mini", aide: "platform.openai.com/api-keys" },
  { nom: "Autre (compatible OpenAI)", url: "", model: "", aide: "" },
];
