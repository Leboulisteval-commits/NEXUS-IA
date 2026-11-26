// Textes légaux de NEXUS AI. Renseigne ton nom et ton e-mail ci-dessous : ils s'affichent automatiquement dans les pages.
export const LEGAL = { editeur: "", contact: "", ville: "" };
const ED = () => LEGAL.editeur ? `<b>${LEGAL.editeur}</b>${LEGAL.ville ? ", " + LEGAL.ville : ""}` : "le propriétaire de cette application (voir la page du dépôt GitHub de l'application)";
const CT = () => LEGAL.contact ? `<a href="mailto:${LEGAL.contact}">${LEGAL.contact}</a>` : "via la page du dépôt GitHub de l'application (onglet « Issues »)";
const MAJ = "25 novembre 2026";

export const PAGES = {
  mentions: ["Mentions légales", () => `
<p><b>Éditeur et directeur de la publication :</b> ${ED()}.</p>
<p><b>Contact :</b> ${CT()}.</p>
<p><b>Hébergement :</b> GitHub, Inc., 88 Colin P. Kelly Jr Street, San Francisco, CA 94107, États-Unis (GitHub Pages).</p>
<p><b>Nature du service :</b> NEXUS AI est un assistant conversationnel qui transmet tes demandes à des services d'intelligence artificielle tiers puis te renvoie leur réponse. Il est fourni gratuitement, « en l'état », sans garantie de disponibilité.</p>
<p><b>Propriété intellectuelle :</b> le code, le nom et l'avatar de NEXUS AI appartiennent à leur éditeur. Les bibliothèques et services tiers restent soumis à leurs propres licences (voir « Licences et crédits »).</p>
<p>Dernière mise à jour : ${MAJ}.</p>`],

  confidentialite: ["Politique de confidentialité", () => `
<p>NEXUS AI est conçu pour collecter le moins de données possible. <b>L'éditeur n'a aucun serveur qui stocke tes conversations.</b></p>
<h3>Ce qui reste sur ton appareil</h3>
<p>Tes conversations, la mémoire de Nexus (ex. ton prénom), tes réglages, tes éventuelles IA personnelles (avec leur clé) et le journal technique sont enregistrés <b>uniquement dans ton navigateur</b> (stockage local, IndexedDB, cache). Rien de tout cela n'est envoyé à l'éditeur. Il n'y a ni cookie publicitaire, ni traceur, ni statistiques : le stockage local est strictement nécessaire au fonctionnement, donc sans bannière de consentement.</p>
<h3>Ce qui part vers des services tiers</h3>
<p>Pour répondre, Nexus envoie ta demande (et, si tu en joins, une version <b>condensée</b> de ta pièce jointe ou de ton image) à un ou plusieurs services d'IA, choisis selon la demande :</p>
<ul><li><b>Cloudflare Workers AI</b>, via un relais appartenant à l'éditeur (le relais transmet la demande et ne conserve pas son contenu ; Cloudflare peut toutefois traiter des données techniques selon sa propre politique) ;</li>
<li><b>Puter</b>, avec <b>ton propre compte</b> Puter (tes échanges relèvent alors de la politique de Puter) ;</li>
<li><b>Pollinations</b>, en dernier recours ;</li>
<li><b>tes IA personnelles</b>, si tu en ajoutes (le fournisseur choisi par toi reçoit alors ta demande) ;</li>
<li><b>Wikipédia</b> et <b>DuckDuckGo</b> : les mots de ta question peuvent leur être envoyés pour une recherche.</li></ul>
<p>Ces services peuvent être situés hors de l'Union européenne (notamment aux États-Unis). <b>N'envoie jamais de données sensibles</b> (santé, mots de passe, numéros de carte, pièces d'identité, informations sur des tiers sans leur accord).</p>
<h3>Base légale et durée</h3>
<p>Le traitement repose sur l'exécution du service que tu demandes et sur ton consentement (accepté au premier lancement). Les données locales durent jusqu'à ce que tu les supprimes (Paramètres → Mes données) ou que tu effaces les données du site.</p>
<h3>Tes droits (RGPD)</h3>
<p>Tu peux accéder à tes données, les exporter, les corriger ou les effacer à tout moment depuis <b>Paramètres → Mes données</b>. Pour toute question ou réclamation : ${CT()}. Tu peux aussi saisir la CNIL (cnil.fr).</p>
<h3>Mineurs</h3>
<p>Le service est réservé aux personnes de <b>15 ans et plus</b>. Les mineurs doivent avoir l'accord de leurs parents.</p>
<p>Dernière mise à jour : ${MAJ}.</p>`],

  cgu: ["Conditions d'utilisation", () => `
<p>En utilisant NEXUS AI, tu acceptes ces conditions.</p>
<h3>Tu parles à une intelligence artificielle</h3>
<p>Les réponses sont générées automatiquement. <b>Elles peuvent être fausses, incomplètes ou dépassées.</b> Vérifie toujours les informations importantes. NEXUS AI ne remplace pas un professionnel : ses réponses ne constituent <b>ni un avis médical, ni un avis juridique, ni un conseil financier</b>.</p>
<h3>Usage</h3>
<p>Tu t'engages à ne pas utiliser le service pour des contenus illégaux, haineux, harcelants, ou portant atteinte aux droits d'autrui, ni pour tenter de contourner ses protections ou d'épuiser ses ressources partagées. Tu restes responsable des contenus que tu envoies et de l'usage que tu fais des réponses.</p>
<h3>Disponibilité et limites</h3>
<p>Le service s'appuie sur des offres gratuites de tiers : il peut être limité, interrompu ou modifié à tout moment, sans préavis. L'éditeur ne peut être tenu responsable des dommages résultant de l'usage du service, dans les limites permises par la loi.</p>
<h3>Droit applicable</h3>
<p>Droit français. En cas de litige, les tribunaux français sont compétents, sous réserve de tes droits de consommateur.</p>
<p>Dernière mise à jour : ${MAJ}.</p>`],

  licences: ["Licences et crédits", () => `
<p>NEXUS AI utilise, entre autres :</p>
<ul><li><b>Puter.js</b> (puter.com) : comptes et accès à des IA ;</li>
<li><b>Cloudflare Workers AI</b> : modèles d'IA hébergés par Cloudflare ;</li>
<li><b>Pollinations</b> (pollinations.ai) : IA de secours et génération d'images ;</li>
<li><b>Wikipédia</b> (CC BY-SA) et <b>Wiktionnaire</b> : extraits cités avec leur source ;</li>
<li><b>DuckDuckGo</b> : réponses instantanées ;</li>
<li><b>Tesseract.js</b> (Apache-2.0) : lecture du texte des images ;</li>
<li><b>PDF.js</b> (Apache-2.0), <b>Mammoth</b> (BSD-2), <b>SheetJS</b> (Apache-2.0), <b>JSZip</b> (MIT/GPLv3), <b>jsPDF</b> (MIT) : lecture et création de fichiers ;</li>
<li>Les modèles d'IA appartiennent à leurs auteurs respectifs (Meta, Google, OpenAI, Mistral, Qwen, Z.ai, DeepSeek, etc.) et sont soumis à leurs licences.</li></ul>
<p>Les marques citées appartiennent à leurs propriétaires.</p>`],
};

export const ORDRE = ["confidentialite", "cgu", "mentions", "licences"];
export const ACCUEIL = `<p><b>Avant de commencer :</b></p>
<ul><li>Nexus est une <b>IA</b> : ses réponses peuvent contenir des erreurs.</li>
<li>Tes messages sont envoyés à des services d'IA tiers pour obtenir une réponse. Tes conversations restent <b>sur ton appareil</b>.</li>
<li>N'envoie pas de données sensibles. Service réservé aux <b>15 ans et plus</b>.</li></ul>`;
