// ═══════════════════════════════════════════════════════════════════
//  Les services de transcription payants (23.80).
//
//  Une phrase courte (3–6 s) part chez UN fournisseur, avec la liste des
//  articles de LA boutique : c'est ce qui fait reconnaître « Mützig »,
//  « Tangui », « Tasty Tom » — là où ces services sont les plus faibles.
//  Interchangeables : le serveur choisit par une variable, et passe au
//  suivant si le premier échoue. Le même fichier sert au comparateur
//  (outils/voix-banc/), pour choisir le fournisseur sur de vraies phrases.
//
//  Prix relevés en novembre 2026 (comparatifs, à revérifier) : Groq ≈
//  0,0007 $/min, AssemblyAI ≈ 0,0025 $/min, OpenAI mini ≈ 0,003 $/min.
// ═══════════════════════════════════════════════════════════════════

export const FOURNISSEURS = {
  groq:       { url: 'https://api.groq.com/openai/v1/audio/transcriptions', modele: 'whisper-large-v3-turbo', format: 'verbose_json' },
  openai:     { url: 'https://api.openai.com/v1/audio/transcriptions',      modele: 'gpt-4o-mini-transcribe', format: 'json' },
  assemblyai: { url: 'https://api.assemblyai.com/v2' },
};

// Les mots de la boutique, propres et bornés : un nom par article, sans
// doublon, sans caractère de contrôle, 150 au plus.
export function motsPropres(mots) {
  const vus = new Set(), out = [];
  for (const m of Array.isArray(mots) ? mots : []) {
    const s = String(m == null ? '' : m).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
    const k = s.toLowerCase();
    if (s && !vus.has(k)) { vus.add(k); out.push(s); }
    if (out.length >= 150) break;
  }
  return out;
}

// L'invite donnée au modèle : le contexte, puis les noms qu'il doit connaître.
export function invite(mots) {
  const l = motsPropres(mots);
  return ('Boutique au Cameroun, prix en francs CFA. Articles : ' + l.join(', ') + '.').slice(0, 800);
}

async function compatibleOpenAI(f, cle, son, nomFichier, mots, signal) {
  const fd = new FormData();
  fd.append('file', son, nomFichier || 'phrase.webm');
  fd.append('model', f.modele);
  fd.append('language', 'fr');
  fd.append('prompt', invite(mots));
  fd.append('response_format', f.format);
  fd.append('temperature', '0');
  const r = await fetch(f.url, { method: 'POST', headers: { Authorization: 'Bearer ' + cle }, body: fd, signal });
  if (!r.ok) throw new Error('http-' + r.status);
  const j = await r.json();
  return { texte: String(j.text || '').trim(), secondes: Number(j.duration) || 0 };
}

async function assembly(cle, son, mots, signal, delai) {
  const base = FOURNISSEURS.assemblyai.url;
  const up = await fetch(base + '/upload', { method: 'POST', headers: { authorization: cle }, body: son, signal });
  if (!up.ok) throw new Error('http-' + up.status);
  const { upload_url } = await up.json();
  const cree = await fetch(base + '/transcript', {
    method: 'POST', headers: { authorization: cle, 'content-type': 'application/json' }, signal,
    body: JSON.stringify({ audio_url: upload_url, language_code: 'fr', word_boost: motsPropres(mots).slice(0, 100), boost_param: 'high' }),
  });
  if (!cree.ok) throw new Error('http-' + cree.status);
  const { id } = await cree.json();
  const fin = Date.now() + delai;
  while (Date.now() < fin) {
    await new Promise(r => setTimeout(r, 400));
    const g = await fetch(base + '/transcript/' + encodeURIComponent(id), { headers: { authorization: cle }, signal });
    if (!g.ok) throw new Error('http-' + g.status);
    const j = await g.json();
    if (j.status === 'completed') return { texte: String(j.text || '').trim(), secondes: Number(j.audio_duration) || 0 };
    if (j.status === 'error') throw new Error('assemblyai-erreur');
  }
  throw new Error('delai');
}

// Transcrit `son` (Blob) chez `nom`. Jamais plus de `delai` ms : au-delà, le
// téléphone repasse au tactile — une vente n'attend pas un serveur.
export async function transcrire(nom, cle, son, nomFichier, mots, { delai = 9000 } = {}) {
  const f = FOURNISSEURS[nom];
  if (!f) throw new Error('fournisseur-inconnu');
  if (!cle) throw new Error('cle-absente');
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), delai);
  try {
    return nom === 'assemblyai'
      ? await assembly(cle, son, mots, ctl.signal, delai)
      : await compatibleOpenAI(f, cle, son, nomFichier, mots, ctl.signal);
  } finally { clearTimeout(t); }
}

// ═══════════════════════════════════════════════════════════════════
//  COMPRENDRE UNE COMMANDE (23.91)
//
//  Le patron, le 20/11 : « pour une voix maîtrisée et plus fiable, on fera
//  la combinaison de quel outil ? » — puis « Go 1+2 ». La couche 3 : quand
//  le téléphone n'a pas compris un morceau de phrase (« mets-moi trois
//  grosses Mützig et pour 200 de riz »), un petit modèle de langue le
//  transforme en lignes de panier.
//  ⚠️ Il ne peut RIEN inventer : il reçoit le catalogue de LA boutique (des
//  numéros et des noms), et tout ce qu'il rend est revérifié ici — un
//  numéro absent du catalogue, une quantité folle, une sorte qui n'est pas
//  à cet article : jeté. Un nom d'article piégé ne peut donc rien faire
//  d'autre que ne pas être reconnu.
//  Sur la clé Groq du pilote (la même que la transcription) : rien de plus
//  à poser. Le modèle se change par un réglage serveur (VOIX_MODELE_COMPRENDRE).
// ═══════════════════════════════════════════════════════════════════
export const MODELES_COMPRENDRE = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
const propre = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f<>{}\[\]"`|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

// Le catalogue envoyé par le téléphone, nettoyé et borné.
export function catalogue(cat) {
  const out = [];
  for (const a of Array.isArray(cat) ? cat : []) {
    if (!a || a.id == null || !a.nm) continue;
    const id = propre(a.id, 24); if (!/^[A-Za-z0-9_.-]+$/.test(id)) continue;
    const s = (Array.isArray(a.s) ? a.s : []).slice(0, 20).map(x => ({ id: propre(x && x.id, 24), nm: propre(x && x.nm, 30) }))
      .filter(x => x.id && /^[A-Za-z0-9_.-]+$/.test(x.id) && x.nm);
    out.push({ id, nm: propre(a.nm, 40), s, m: !!a.m });
    if (out.length >= 200) break;
  }
  return out;
}
export function catalogueTexte(cat) {
  return cat.map(a => a.id + ' | ' + a.nm + (a.m ? ' (au poids/mesure)' : '') + (a.s.length ? (' — sortes : ' + a.s.map(x => x.id + ' ' + x.nm).join(', ')) : '')).join('\n');
}
// Ce que le modèle rend, revérifié contre le catalogue.
export function lignesValides(brut, cat) {
  const par = new Map(cat.map(a => [a.id, a]));
  const lignes = [];
  for (const l of (brut && Array.isArray(brut.lignes) ? brut.lignes : []).slice(0, 20)) {
    if (!l) continue;
    const a = par.get(String(l.id)); if (!a) continue;
    let sorte = null;
    if (l.sorte != null && a.s.length) { const x = a.s.find(s => s.id === String(l.sorte)); if (x) sorte = x.id; }
    const q = Number(l.qte), m = Number(l.montant);
    lignes.push({ id: a.id, sorte, qte: (q > 0 && q <= 500) ? Math.round(q * 1000) / 1000 : null, montant: (m > 0 && m <= 1e6) ? Math.round(m) : null });
  }
  const inconnus = (brut && Array.isArray(brut.inconnus) ? brut.inconnus : []).slice(0, 5).map(x => propre(x, 40)).filter(Boolean);
  return { lignes, inconnus };
}
const CONSIGNE = 'Tu aides la caisse d\'une boutique au Cameroun. On te donne le catalogue (numéro | nom) et ce que le client a dit. '
  + 'Réponds UNIQUEMENT en JSON : {"lignes":[{"id":"<numéro>","sorte":"<numéro de sorte ou null>","qte":<nombre ou null>,"montant":<francs ou null>}],"inconnus":["<ce qui n\'est pas au catalogue>"]}. '
  + 'Règles : n\'utilise QUE les numéros du catalogue ; une quantité non dite vaut 1 ; « pour 200 » ou « 200 francs de » = montant 200 ; '
  + 'les nombres peuvent être dits en lettres (deux, trois, une dizaine = 10) ; si un article a des sortes et que la sorte n\'est pas dite, sorte = null ; '
  + 'ce qui n\'est pas au catalogue va dans inconnus ; n\'invente rien. Le client peut parler français, pidgin ou camfranglais.';

export async function comprendre(cle, texte, cat, { delai = 6000, modeles = MODELES_COMPRENDRE } = {}) {
  if (!cle) throw new Error('cle-absente');
  const C = catalogue(cat);
  if (!C.length) return { lignes: [], inconnus: [], modele: null };
  const corps = (modele) => JSON.stringify({
    model: modele, temperature: 0, max_tokens: 400, response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: CONSIGNE }, { role: 'user', content: 'Catalogue :\n' + catalogueTexte(C) + '\n\nLe client a dit : « ' + propre(texte, 300) + ' »' }],
  });
  let dernier = 'aucun-modele';
  for (const modele of modeles) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), delai);
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', signal: ctl.signal,
        headers: { Authorization: 'Bearer ' + cle, 'Content-Type': 'application/json' }, body: corps(modele) });
      // Un modèle retiré par le fournisseur : on passe au suivant.
      if (r.status === 404 || r.status === 400) { dernier = 'http-' + r.status; continue; }
      if (!r.ok) throw new Error('http-' + r.status);
      const j = await r.json();
      let brut = {};
      try { brut = JSON.parse(String(j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content || '{}')); } catch { brut = {}; }
      return { ...lignesValides(brut, C), modele };
    } finally { clearTimeout(t); }
  }
  throw new Error(dernier);
}
