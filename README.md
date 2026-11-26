# NEXUS AI v2.0

Assistant IA en français. App web 100 % statique (HTML / JS, ES Modules), hébergeable sur GitHub Pages.

## Fichiers à mettre à la racine du dépôt
`index.html`, `app.js`, `config.js`, `journal.js`, `compression.js`, `legal.js`, `guide.js`, `nexus-corps.mjs`, `nexus-tools.js`, `manifest.json`, `sw.js`, `logo.png`, `avatar.png`, `icon-180.png`.
(`worker.js` va dans Cloudflare, pas dans GitHub. `README.md` et `.gitignore` sont facultatifs.)
À supprimer s'ils existent encore : `comptes.js`, `vision.js`, `nexus-brain.js`.

## Mise en ligne
1. Mets les fichiers dans ton dépôt, puis Settings → Pages → branche `main`, dossier `/ (root)`.
2. Cloudflare → ton Worker → Edit code → colle `worker.js` → Deploy (secrets `ACCOUNT_ID` et `API_TOKEN` inchangés).
   Recommandé : ajoute la variable `ALLOWED_ORIGINS` = l'adresse de ton site GitHub Pages (ex. `https://toncompte.github.io`).
3. Ouvre `legal.js` et renseigne ton nom / e-mail (ils s'affichent dans les mentions légales).
4. Pour mettre à jour plus tard : change le numéro de cache dans `sw.js`.

## Comment Nexus choisit l'IA
IA personnelle de l'utilisateur → Puter gratuit → Cloudflare (petit modèle pour le simple, gros pour le difficile) → Puter au solde → Pollinations (secours). Une question = un seul appel externe. Plafonds quotidiens par appareil sur les crédits partagés. Contexte envoyé : fiche de faits + petit résumé + 3 derniers échanges ; pièces jointes condensées en local.
