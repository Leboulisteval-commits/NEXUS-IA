// Réglages fixes de NEXUS AI (public). La clé Pollinations « pk_ » est une clé PUBLIQUE faite pour être placée dans le code d'un site.
// Les clés Groq / OpenRouter / Tavily NE SONT PAS ici : elles sont des secrets du Worker Cloudflare.
export const VERSION = "1.1";
export const WORKER_URL = "https://worker-nexus-relais.leboulisteval.workers.dev/";
export const SITE_URL = "https://leboulisteval-commits.github.io/NEXUS-IA/";
export const POLLINATIONS_KEY = "pk_mQ1y3epEHAWS7EjI";
// Plafonds par appareil et par jour sur les crédits partagés de Nexus : au-delà, Nexus passe en silence à une autre IA.
export const LIMITES_JOUR = { cloudflare: 60, pollinations: 40, groq: 60, openrouter: 20, web: 15 };
// Fournisseurs proposés pour ajouter une IA personnelle (API de type OpenAI).
// « cat » : fournisseur dont Nexus connaît déjà les modèles → l'IA personnelle remplace alors les crédits partagés de Nexus.
export const MODELES_PERSO = [
  { nom: "Groq", cat: "groq", url: "https://api.groq.com/openai/v1", model: "*", aide: "console.groq.com/keys" },
  { nom: "OpenRouter", cat: "openrouter", url: "https://openrouter.ai/api/v1", model: "*", aide: "openrouter.ai/keys" },
  { nom: "Cloudflare", cat: "cloudflare", url: "https://api.cloudflare.com/client/v4/accounts/TON_ACCOUNT_ID/ai/v1", model: "*", aide: "dash.cloudflare.com → Workers AI → Utiliser l'API REST (remplace TON_ACCOUNT_ID dans l'adresse)" },
  { nom: "Pollinations", cat: "pollinations", url: "https://gen.pollinations.ai/v1", model: "*", aide: "enter.pollinations.ai" },
  { nom: "Mistral", url: "https://api.mistral.ai/v1", model: "mistral-small-latest", aide: "console.mistral.ai/api-keys" },
  { nom: "DeepSeek", url: "https://api.deepseek.com/v1", model: "deepseek-chat", aide: "platform.deepseek.com/api_keys" },
  { nom: "OpenAI", url: "https://api.openai.com/v1", model: "gpt-4o-mini", aide: "platform.openai.com/api-keys" },
  { nom: "Autre", url: "", model: "", aide: "" },
];
