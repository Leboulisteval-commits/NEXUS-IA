/**
 * NEXUS TOOLS - lire, analyser et créer des fichiers et des images ; recherche web ; mémoire.
 * Les bibliothèques externes ne sont chargées que si on en a besoin, en versions FIXES.
 * Si l'une d'elles ne se charge pas, seule la fonction concernée affiche une erreur.
 */

// ---------- bibliothèques externes (versions figées) ----------
const LIBS = {
  pdfjs:  { url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js', global: 'pdfjsLib' },
  mammoth:{ url: 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js', global: 'mammoth' },
  xlsx:   { url: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', global: 'XLSX' },
  tess:   { url: 'https://cdn.jsdelivr.net/npm/tesseract.js@4.1.1/dist/tesseract.min.js', global: 'Tesseract' },
  jspdf:  { url: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', global: 'jspdf' },
  jszip:  { url: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', global: 'JSZip' }
};
const pending = {};

export function loadLib(name) {
  const L = LIBS[name];
  if (!L) return Promise.reject(new Error('Bibliothèque inconnue : ' + name));
  if (globalThis[L.global]) return Promise.resolve(globalThis[L.global]);
  if (pending[name]) return pending[name];
  pending[name] = new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = L.url;
    s.async = true;
    s.onload = () => (globalThis[L.global] ? ok(globalThis[L.global]) : ko(new Error('Bibliothèque ' + name + ' chargée mais inutilisable')));
    s.onerror = () => { pending[name] = null; ko(new Error('Impossible de charger ' + name + ' (connexion ?)')); };
    document.head.appendChild(s);
  });
  return pending[name];
}

const norm = t => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/['’]/g, ' ').replace(/\s+/g, ' ').trim();

// ---------- LIRE : PDF, Word, Excel ----------
export async function readDoc(f, onProgress = () => {}) {
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  const buf = await f.arrayBuffer();
  if (ext === 'pdf' || f.type === 'application/pdf') {
    onProgress('Chargement du lecteur PDF…');
    const pdfjs = await loadLib('pdfjs');
    pdfjs.GlobalWorkerOptions.workerSrc = LIBS.pdfjs.worker;
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
    const n = Math.min(doc.numPages, 40);
    let out = '';
    for (let i = 1; i <= n; i++) {
      onProgress('Lecture de la page ' + i + '/' + n + '…');
      const pg = await doc.getPage(i);
      const tc = await pg.getTextContent();
      out += tc.items.map(x => x.str).join(' ') + '\n\n';
      if (out.length > 60000) break;
    }
    let trunc = doc.numPages > n || out.length > 60000;
    if (out.replace(/\s/g, '').length < 40) {
      // PDF scanné : le texte est une image, on le lit par OCR (3 premières pages)
      onProgress('PDF scanné : lecture du texte (OCR)…');
      const tess = await loadLib('tess');
      const pages = Math.min(doc.numPages, 3);
      let t = '';
      for (let i = 1; i <= pages; i++) {
        const pg = await doc.getPage(i);
        const vp = pg.getViewport({ scale: 2 });
        const cv = document.createElement('canvas');
        cv.width = vp.width; cv.height = vp.height;
        await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
        const r = await tess.recognize(cv, 'fra+eng');
        t += (r.data.text || '') + '\n\n';
      }
      out = t;
      trunc = doc.numPages > 3;
    }
    return { text: out.trim(), trunc, src: 'pdf', pages: doc.numPages };
  }
  if (ext === 'docx') {
    onProgress('Lecture du document Word…');
    const mm = await loadLib('mammoth');
    const r = await mm.extractRawText({ arrayBuffer: buf });
    return { text: (r.value || '').trim(), trunc: false, src: 'docx' };
  }
  if (['xlsx', 'xls', 'ods'].includes(ext)) {
    onProgress('Lecture du tableur…');
    const X = await loadLib('xlsx');
    const wb = X.read(buf, { type: 'array' });
    let out = '';
    for (const name of wb.SheetNames.slice(0, 3)) {
      const rows = X.utils.sheet_to_csv(wb.Sheets[name]).split('\n');
      out += '## Feuille : ' + name + '\n' + rows.slice(0, 200).join('\n') + (rows.length > 200 ? '\n… (' + (rows.length - 200) + ' lignes de plus)' : '') + '\n\n';
    }
    return { text: out.trim(), trunc: wb.SheetNames.length > 3, src: 'xlsx' };
  }
  throw new Error('Format non pris en charge');
}

/** Lecture du texte d'une image, directement sur le téléphone (0 crédit). */
export async function ocrImage(src, onProgress = () => {}) {
  const tess = await loadLib('tess');
  const r = await tess.recognize(src, 'fra+eng', {
    logger: m => { if (m && m.status) onProgress(m.status + (m.progress ? ' ' + Math.round(m.progress * 100) + '%' : '')); }
  });
  return (r.data.text || '').trim();
}

// ---------- ANALYSER : proposition locale (0 crédit) ----------
const CODE_EXT = { js: 'JavaScript', mjs: 'JavaScript', ts: 'TypeScript', jsx: 'JavaScript (React)', tsx: 'TypeScript (React)', py: 'Python', java: 'Java', c: 'C', h: 'C', cpp: 'C++', cs: 'C#', go: 'Go', rs: 'Rust', php: 'PHP', rb: 'Ruby', sh: 'Shell', sql: 'SQL', html: 'HTML', htm: 'HTML', css: 'CSS' };
const DATA_EXT = ['csv', 'tsv', 'json', 'jsonl', 'xlsx', 'xls', 'ods', 'yml', 'yaml', 'xml'];
const EN = /\b(the|and|of|to|is|are|with|for|that|this|from|you|your|have|will|not)\b/gi;
const FR = /\b(le|la|les|des|et|est|une|un|pour|que|dans|avec|pas|sur|vous|nous|qui|sont)\b/gi;

export function analyzeDoc(pf) {
  if (pf.kind === 'image') {
    return { type: 'image', label: 'une image', best: 0, actions: [
      { id: 'describe', label: "Décrire l'image", prompt: "Décris précisément cette image, puis indique ce qu'elle montre d'important.", intent: 'general' },
      { id: 'ocr', label: "Lire le texte de l'image (sur le téléphone, gratuit)", local: true },
      { id: 'explain', label: "Expliquer ce que montre l'image", prompt: "Explique ce que montre cette image et son contexte probable.", intent: 'general' }
    ] };
  }
  const ext = (pf.name.split('.').pop() || '').toLowerCase();
  const t = pf.text || '';
  const lang = CODE_EXT[ext];
  const nEn = (t.match(EN) || []).length, nFr = (t.match(FR) || []).length;
  const csvLike = (t.split('\n').slice(0, 5).filter(l => (l.match(/[,;\t]/g) || []).length >= 2).length >= 3);
  let type, label, actions;
  if (lang || (/\b(function|const|let|var|def|class|import|return)\b/.test(t) && /[{};]/.test(t))) {
    type = 'code'; label = 'du code' + (lang ? ' ' + lang : '');
    actions = [
      { id: 'explain', label: 'Expliquer ce code', prompt: 'Explique ce code simplement, puis signale les erreurs ou problèmes possibles.', intent: 'code' },
      { id: 'fix', label: 'Trouver les bugs et corriger', prompt: 'Trouve les bugs ou problèmes de ce code et propose une version corrigée.', intent: 'code' },
      { id: 'doc', label: 'Ajouter des commentaires', prompt: 'Réécris ce code avec des commentaires clairs en français.', intent: 'code' }
    ];
  } else if (DATA_EXT.includes(ext) || pf.src === 'xlsx' || csvLike) {
    type = 'data'; label = 'un tableau de données';
    actions = [
      { id: 'analyse', label: 'Analyser les données', prompt: 'Analyse ces données : décris leur structure, les points marquants et les anomalies éventuelles.', intent: 'long' },
      { id: 'summary', label: 'Résumer', prompt: 'Résume le contenu de ces données en quelques points clés.', intent: 'long' }
    ];
  } else if (nEn > 12 && nEn > nFr * 1.5) {
    type = 'foreign'; label = 'un texte en anglais';
    actions = [
      { id: 'translate', label: 'Traduire en français', prompt: 'Traduis ce texte en français.', intent: 'translation' },
      { id: 'summary', label: 'Résumer en français', prompt: 'Résume ce texte en français en points clés.', intent: 'long' }
    ];
  } else if (t.length > 6000) {
    type = 'long'; label = 'un long texte';
    actions = [
      { id: 'summary', label: 'Résumer', prompt: 'Résume ce document en points clés.', intent: 'long' },
      { id: 'keys', label: 'Extraire les informations importantes', prompt: 'Extrais les informations, dates, noms et chiffres importants de ce document.', intent: 'long' },
      { id: 'proof', label: "Corriger l'orthographe", prompt: "Corrige l'orthographe et la grammaire de ce texte et indique les corrections.", intent: 'general' }
    ];
  } else {
    type = 'text'; label = 'un texte';
    actions = [
      { id: 'summary', label: 'Résumer', prompt: 'Résume ce texte en points clés.', intent: 'long' },
      { id: 'proof', label: "Corriger l'orthographe", prompt: "Corrige l'orthographe et la grammaire de ce texte et indique les corrections.", intent: 'general' },
      { id: 'reformulate', label: 'Reformuler plus clairement', prompt: 'Reformule ce texte de façon plus claire et plus concise.', intent: 'general' }
    ];
  }
  return { type, label: label + ' (' + t.length + ' caractères)', actions, best: 0 };
}

// ---------- CRÉER des fichiers à partir d'une réponse ----------
export function extractTables(md) {
  const lines = String(md).split('\n'), blocks = [];
  let cur = [];
  const flush = () => { if (cur.length >= 2) blocks.push(cur); cur = []; };
  for (const l of lines) { if (/^\s*\|.*\|\s*$/.test(l)) cur.push(l); else flush(); }
  flush();
  return blocks.map(b => b.filter(r => !/^\s*\|(\s*:?-{2,}:?\s*\|)+\s*$/.test(r)).map(r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())));
}
export function extractCode(md) {
  const m = String(md).match(/```(\w*)\n([\s\S]*?)```/);
  return m ? { lang: (m[1] || '').toLowerCase(), code: m[2].replace(/\n$/, '') } : null;
}
export function extractJson(md) {
  const s = String(md).trim();
  try { return JSON.stringify(JSON.parse(s), null, 2); } catch (e) { /* suite */ }
  const c = extractCode(md);
  if (c && (c.lang === 'json' || c.code.trim().startsWith('{') || c.code.trim().startsWith('['))) {
    try { return JSON.stringify(JSON.parse(c.code), null, 2); } catch (e) { /* rien */ }
  }
  return null;
}
const plain = md => String(md).replace(/```\w*\n?([\s\S]*?)```/g, '$1').replace(/^#{1,6}\s*/gm, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2').replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1 ($2)');
const LANG_EXT = { javascript: 'js', js: 'js', typescript: 'ts', ts: 'ts', python: 'py', py: 'py', html: 'html', css: 'css', sql: 'sql', json: 'json', bash: 'sh', sh: 'sh', java: 'java', c: 'c', cpp: 'cpp', csharp: 'cs', cs: 'cs', go: 'go', rust: 'rs', php: 'php', ruby: 'rb', yaml: 'yml', xml: 'xml', markdown: 'md' };

export function exportFormats(content) {
  const f = [{ fmt: 'txt', label: 'Texte (.txt)' }, { fmt: 'md', label: 'Markdown (.md)' }, { fmt: 'pdf', label: 'PDF (.pdf)' }, { fmt: 'docx', label: 'Word (.docx)' }];
  if (extractTables(content).length) { f.push({ fmt: 'csv', label: 'Tableau CSV (.csv)' }); f.push({ fmt: 'xlsx', label: 'Excel (.xlsx)' }); }
  if (extractJson(content)) f.push({ fmt: 'json', label: 'JSON (.json)' });
  const c = extractCode(content);
  if (c) f.push({ fmt: 'code', label: 'Fichier de code (.' + (LANG_EXT[c.lang] || 'txt') + ')' });
  return f;
}

const slug = t => (norm(t).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'nexus');
const stamp = () => new Date().toISOString().slice(0, 10);
const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ascii = s => String(s).replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...').replace(/[–—]/g, '-').replace(/\u00a0/g, ' ').replace(/[^\x09\x0a\x20-\x7e\u00a1-\u00ff]/g, '');

async function makePdf(content) {
  const lib = await loadLib('jspdf');
  const doc = new lib.jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 48;
  let y = M;
  const put = (text, size, bold) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    for (const ln of doc.splitTextToSize(ascii(text), W - 2 * M)) {
      if (y > H - M) { doc.addPage(); y = M; }
      doc.text(ln, M, y);
      y += size * 1.35;
    }
  };
  for (const raw of String(content).replace(/```\w*\n?/g, '').split('\n')) {
    if (/^\s*\|(\s*:?-{2,}:?\s*\|)+\s*$/.test(raw)) continue;
    const h = raw.match(/^(#{1,6})\s*(.*)$/);
    if (h) { y += 4; put(plain(h[2]), h[1].length === 1 ? 17 : 14, true); y += 2; }
    else if (raw.trim() === '') y += 8;
    else put(plain(raw.replace(/^\s*\|/, '').replace(/\|\s*$/, '').replace(/\|/g, '  |  ')), 11, false);
  }
  return doc.output('blob');
}

async function makeDocx(content) {
  const JSZip = await loadLib('jszip');
  const runs = t => String(t).split(/\*\*/).map((p, i) => p ? '<w:r>' + (i % 2 ? '<w:rPr><w:b/></w:rPr>' : '') + '<w:t xml:space="preserve">' + xml(p) + '</w:t></w:r>' : '').join('');
  const para = (t, o = {}) => '<w:p>' + (o.size || o.bold ? '<w:pPr><w:spacing w:before="120" w:after="60"/></w:pPr>' : '') + (o.size ? '<w:r><w:rPr><w:b/><w:sz w:val="' + o.size + '"/></w:rPr><w:t xml:space="preserve">' + xml(t) + '</w:t></w:r>' : runs(t)) + '</w:p>';
  const bd = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(s => '<w:' + s + ' w:val="single" w:sz="4" w:space="0" w:color="999999"/>').join('');
  const table = rows => '<w:tbl><w:tblPr><w:tblBorders>' + bd + '</w:tblBorders></w:tblPr>' + rows.map((r, i) => '<w:tr>' + r.map(c => '<w:tc><w:p>' + (i === 0 ? '<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">' + xml(plain(c)) + '</w:t></w:r>' : runs(plain(c))) + '</w:p></w:tc>').join('') + '</w:tr>').join('') + '</w:tbl><w:p/>';
  const lines = String(content).replace(/```\w*\n?/g, '').split('\n');
  let body = '';
  for (let i = 0; i < lines.length;) {
    if (/^\s*\|.*\|\s*$/.test(lines[i])) {
      let j = i;
      while (j < lines.length && /^\s*\|.*\|\s*$/.test(lines[j])) j++;
      const rows = lines.slice(i, j).filter(r => !/^\s*\|(\s*:?-{2,}:?\s*\|)+\s*$/.test(r)).map(r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
      body += table(rows);
      i = j; continue;
    }
    const h = lines[i].match(/^(#{1,6})\s*(.*)$/);
    if (h) body += para(plain(h[2]), { size: h[1].length === 1 ? 36 : 28 });
    else if (lines[i].trim() === '') body += '<w:p/>';
    else body += para(lines[i].replace(/^\s*[-*]\s+/, '• ').replace(/`/g, ''));
    i++;
  }
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>');
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

export async function makeFile(fmt, content, title = 'nexus') {
  const base = slug(title) + '-' + stamp();
  const T = extractTables(content);
  if (fmt === 'txt') return { blob: new Blob([plain(content)], { type: 'text/plain;charset=utf-8' }), name: base + '.txt' };
  if (fmt === 'md') return { blob: new Blob([String(content)], { type: 'text/markdown;charset=utf-8' }), name: base + '.md' };
  if (fmt === 'json') {
    const j = extractJson(content);
    if (!j) throw new Error('Aucun JSON valide dans cette réponse');
    return { blob: new Blob([j], { type: 'application/json' }), name: base + '.json' };
  }
  if (fmt === 'code') {
    const c = extractCode(content);
    if (!c) throw new Error('Aucun bloc de code dans cette réponse');
    return { blob: new Blob([c.code], { type: 'text/plain;charset=utf-8' }), name: 'code-' + stamp() + '.' + (LANG_EXT[c.lang] || 'txt') };
  }
  if (fmt === 'csv') {
    if (!T.length) throw new Error('Aucun tableau dans cette réponse');
    const q = c => '"' + String(plain(c)).replace(/"/g, '""') + '"';
    const csv = T.map(t => t.map(r => r.map(q).join(';')).join('\r\n')).join('\r\n\r\n');
    return { blob: new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), name: base + '.csv' };
  }
  if (fmt === 'xlsx') {
    const X = await loadLib('xlsx');
    const wb = X.utils.book_new();
    const sheets = T.length ? T : [String(content).split('\n').map(l => [plain(l)])];
    sheets.forEach((t, i) => X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(t.map(r => r.map(c => plain(c)))), 'Tableau ' + (i + 1)));
    const out = X.write(wb, { bookType: 'xlsx', type: 'array' });
    return { blob: new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), name: base + '.xlsx' };
  }
  if (fmt === 'pdf') return { blob: await makePdf(content), name: base + '.pdf' };
  if (fmt === 'docx') return { blob: await makeDocx(content), name: base + '.docx' };
  throw new Error('Format inconnu : ' + fmt);
}

/** Enregistre un fichier : feuille de partage de l'iPhone (Enregistrer dans Fichiers) ou téléchargement. */
export async function saveBlob(blob, name) {
  try {
    const file = new File([blob], name, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return 'share'; }
  } catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 4000);
  return 'download';
}

// ---------- CRÉER des images (Pollinations, adresse gratuite sans clé) ----------
const IMG_REQ = /^(?:(?:peux|pourrais)[- ]tu\s+|(?:tu peux|pouvez[- ]vous|peux[- ]tu)\s+)?(?:me\s+)?(?:g[ée]n[èe]re[rz]?|cr[ée]e[rz]?|dessine[rz]?|fais|faire|fabrique[rz]?|imagine[rz]?|produis|produire|r[ée]alise[rz]?)(?:[- ]moi)?\s+(?:une?|des)\s+(?:image|photo|illustration|dessin|logo|affiche|portrait|paysage|visuel)s?\s*(?:de la |de l['’]|de |du |des |d['’]|sur |avec |montrant |repr[ée]sentant )?(.*)$/i;
export function parseImageRequest(text) {
  const m = String(text).trim().match(IMG_REQ);
  const p = m && m[1] ? m[1].replace(/[.!?\s]+$/, '').trim() : '';
  return p.length >= 3 ? p : null;
}
export function imageUrl(prompt, seed = 1) {
  return 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt) + '?width=1024&height=1024&model=flux&nologo=true&seed=' + seed;
}
export function loadImage(url, timeout = 70000) {
  return new Promise((ok, ko) => {
    const im = new Image();
    const t = setTimeout(() => ko(new Error('délai dépassé')), timeout);
    im.onload = () => { clearTimeout(t); ok(url); };
    im.onerror = () => { clearTimeout(t); ko(new Error('service indisponible')); };
    im.src = url;
  });
}
export async function saveRemoteImage(url, name = 'nexus-image.jpg') {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await saveBlob(await r.blob(), name);
  } catch (e) { window.open(url, '_blank'); return 'open'; }
}

// ---------- RECHERCHE WEB gratuite : Wikipédia + DuckDuckGo, recoupées ----------
const STOP = new Set('qui quel quelle quels quelles quoi que est ete sont etait etaient le la les un une des de du d l a au aux en et ou dans sur pour par avec sans ce cet cette ces se sa son ses ca cela c il elle ils elles on y ne pas plus comment combien quand pourquoi dis moi donne peux tu me te nous vous mon ma mes ton ta tes s t j m n qu'.split(' '));
export function searchQuery(text) {
  const w = norm(text).replace(/[?!.,;:"«»()]/g, ' ').split(' ').filter(x => x && !STOP.has(x));
  return w.join(' ').trim() || String(text);
}
export function isFactual(text) {
  const n = norm(text);
  if (n.length < 6 || n.length > 220) return false;
  if (/^(qui|quand|ou|combien|quel|quelle|quels|quelles|qu est ce|c est quoi|en quelle annee|comment s appelle)\b/.test(n)) return true;
  return /\b(gagnant|gagnante|vainqueur|president|premier ministre|capitale|population|date de|ne le|nait|mort|decede|inventeur|auteur|realisateur|champion|record|superficie|fonde|cree en)\b/.test(n);
}
async function wikiSearch(q, timeout) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch('https://fr.wikipedia.org/w/api.php?action=query&generator=search&gsrlimit=2&gsrsearch=' + encodeURIComponent(q) + '&prop=extracts&exintro=1&explaintext=1&exsentences=4&format=json&origin=*', { signal: ctl.signal });
    if (!r.ok) return null;
    const d = await r.json();
    const pages = Object.values((d.query && d.query.pages) || {}).sort((a, b) => (a.index || 9) - (b.index || 9));
    const words = norm(q).split(' ').filter(w => w.length >= 4);
    for (const p of pages) {
      const hay = norm((p.title || '') + ' ' + (p.extract || ''));
      if (p.extract && (!words.length || words.some(w => hay.includes(w)))) return { title: p.title, text: p.extract.slice(0, 700), url: 'https://fr.wikipedia.org/?curid=' + p.pageid };
    }
    return null;
  } finally { clearTimeout(t); }
}
/** Recherche web réelle via le Worker (Tavily/Brave si configurés + réponse instantanée DuckDuckGo), puis Wikipédia en direct. */
async function workerWeb(workerUrl, q, timeout) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout + 2500);
  try {
    const r = await fetch(workerUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'web', q }), signal: ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
export async function searchWeb(question, { timeout = 6000, workerUrl = '', workerWebOk = false } = {}) {
  const q = searchQuery(question);
  const erreurs = {};
  const [wiki, w] = await Promise.all([
    wikiSearch(q, timeout).catch((e) => { erreurs.wikipedia = String(e && e.message || e); return null; }),
    (workerUrl && workerWebOk ? workerWeb(workerUrl, q, timeout) : Promise.resolve(null)).catch((e) => { erreurs.web = String(e && e.message || e); return null; })
  ]);
  const ddg = w && w.instantane ? { text: w.instantane.texte, source: w.instantane.source || '', url: w.instantane.url || '' } : null;
  const web = w && Array.isArray(w.resultats) ? w.resultats.filter((x) => x && x.url && x.extrait) : [];
  const parts = [];
  if (wiki) parts.push('[Wikipédia — ' + wiki.title + '] ' + wiki.text);
  if (ddg) parts.push('[DuckDuckGo' + (ddg.source ? ' — ' + ddg.source : '') + '] ' + ddg.text);
  web.forEach((x, i) => parts.push('[Web ' + (i + 1) + ' — ' + x.titre + ' (' + x.url + ')] ' + x.extrait));
  const sources = [];
  if (wiki) sources.push({ t: 'Wikipédia — ' + wiki.title, u: wiki.url });
  web.forEach((x) => sources.push({ t: x.titre || x.url, u: x.url }));
  if (ddg && ddg.url) sources.push({ t: ddg.source || 'DuckDuckGo', u: ddg.url });
  return {
    wiki, ddg, web, sources, erreurs, found: parts.length,
    summary: '📖 Wikipédia ' + (wiki ? '✓' : '✗') + ' · 🌐 Web ' + (web.length ? '✓ (' + web.length + ')' : '✗') + ' · 🦆 DuckDuckGo ' + (ddg ? '✓' : '✗'),
    context: parts.length ? "Sources trouvées sur Internet pour t'aider (elles peuvent être incomplètes ou hors sujet) :\n" + parts.join('\n') + "\n\nConsigne : compare ces sources. Si elles se contredisent, ou si elles ne répondent pas à la question, dis-le clairement ; sinon appuie ta réponse dessus et cite la source (nom du site). N'invente rien qui ne soit pas dans les sources ou dans ce que tu sais avec certitude." : ''
  };
}

/** Lit une page web (adresse collée par l'utilisateur) via le Worker. -> { url, titre, texte } ou { erreur } */
export async function readPage(workerUrl, adresse, timeout = 12000) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(workerUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'page', url: adresse }), signal: ctl.signal });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.erreur) return { erreur: j.erreur || j.error || 'page illisible' };
    return j;
  } catch (e) { return { erreur: e && e.name === 'AbortError' ? 'délai dépassé' : 'page injoignable' }; }
  finally { clearTimeout(t); }
}
export const urlDans = (t) => { const m = String(t).match(/https?:\/\/[^\s<>"')\]]+/i); return m ? m[0].replace(/[.,;:!?]+$/, '') : null; };
/** La question demande-t-elle une information fraîche ou une recherche explicite ? */
export function needsWeb(text) {
  const n = norm(text);
  if (n.length < 6 || n.length > 260) return false;
  if (/\b(cherche|recherche|trouve|va chercher|regarde)\b.*\b(web|internet|google|en ligne|sur le net)\b/.test(n) || /\bsur (le )?(web|internet|net)\b/.test(n)) return true;
  return /\b(actualite|actualites|news|dernieres nouvelles|aujourd hui|en ce moment|actuellement|cette semaine|ce mois|cette annee|derniere version|dernier(e)? (sorti|film|album|resultat)|prix (de|du|des)|cours (de|du)|resultat(s)? (du|de la|des)|score (du|de|des)|classement|sorti en 202\d)\b/.test(n);
}

// ---------- MÉMOIRE PERSONNELLE (règles simples, sur le téléphone) ----------
const PRO = 'développeur|développeuse|infirmier|infirmière|médecin|professeur|enseignant|enseignante|étudiant|étudiante|ingénieur|avocat|avocate|comptable|électricien|plombier|cuisinier|cuisinière|chauffeur|commerçant|artisan|retraité|retraitée|photographe|designer|architecte|pharmacien|pharmacienne|mécanicien|mécanicienne|agriculteur|agricultrice|journaliste|musicien|musicienne';
export function extractMemory(text) {
  const t = String(text).trim();
  let m = t.match(/^(?:retiens|souviens[- ]toi|n['’]oublie pas|note|m[ée]morise)(?: bien)?(?: que| :)?\s+(.{3,200})$/i);
  if (m) return { items: ['Note de l\'utilisateur : ' + m[1].replace(/[.!\s]+$/, '')], explicit: true };
  const items = [];
  const pats = [
    [/\bje m['’]appelle\s+([A-Za-zÀ-ÿ'’-]{2,30})/i, r => "L'utilisateur s'appelle " + r[1]],
    [/\bmon pr[ée]nom est\s+([A-Za-zÀ-ÿ'’-]{2,30})/i, r => "L'utilisateur s'appelle " + r[1]],
    [/\bj['’]habite\s+(?:à|a|au|en|aux|dans)\s+([^,.!?]{2,40})/i, r => "L'utilisateur habite " + r[0].replace(/^.*?habite\s+/i, '')],
    [/\bje vis\s+(?:à|a|au|en|aux|dans)\s+([^,.!?]{2,40})/i, r => "L'utilisateur vit " + r[0].replace(/^.*?vis\s+/i, '')],
    [/\bje travaille\s+(comme|chez|dans|à|a)\s+([^,.!?]{2,50})/i, r => "L'utilisateur travaille " + r[1] + ' ' + r[2]],
    [new RegExp('\\bje suis\\s+(?:un |une )?(' + PRO + ')\\b', 'i'), r => "L'utilisateur est " + r[1]],
    [/\bj['’]ai\s+(\d{1,2})\s+ans\b/i, r => "L'utilisateur a " + r[1] + ' ans']
  ];
  for (const [re, f] of pats) { const r = t.match(re); if (r) items.push(f(r).trim()); }
  return { items, explicit: false };
}
