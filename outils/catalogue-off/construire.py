# Construit photos/, catalogue-off.json et RAPPORT.md à partir de
# produits.tsv (la liste), candidats.json (ce qu'OFF a répondu) et choix.tsv
# (les choix faits à la main). Ne parle qu'à images.openfoodfacts.org.
import json, os, sys, time, urllib.request, urllib.error
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from photo import preparer

ICI = os.path.dirname(os.path.abspath(__file__))
UA = 'MyBoutiQ-catalogue/1.0'
LIC = 'CC BY-SA 3.0'

def tsv(nom):
    for l in open(os.path.join(ICI, nom), encoding='utf-8'):
        if l.strip() and not l.startswith('#'):
            yield [x.strip() for x in l.rstrip('\n').split('|')]

produits = list(tsv('produits.tsv'))
choix = {c[0]: c for c in tsv('choix.tsv')}
cand = json.load(open(os.path.join(ICI, 'candidats.json')))
fiche = {}
for v in cand.values():
    for s in ('cm', 'monde'):
        for p in v.get(s) or []:
            if p.get('image_front_url'):
                fiche.setdefault(p['code'], p)
inconnus = [n for n in choix if n not in {p[0] for p in produits}]
assert not inconnus, inconnus

def url_off(code):
    return f'https://world.openfoodfacts.org/product/{code}'

def telecharger(u):
    # images.openfoodfacts.org coupe parfois la connexion (« Connection reset
    # by peer », mesuré le 16/11/2026) : trois essais espacés avant d'abandonner.
    for essai in range(3):
        try:
            req = urllib.request.Request(u, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError:
            raise
        except Exception as e:
            print('  ! image', e, file=sys.stderr)
            if essai == 2:
                raise
            time.sleep(10 * (essai + 1))

# 1. Photos (une par slug)
os.makedirs(os.path.join(ICI, 'photos'), exist_ok=True)
photo_src = {}
for c in choix.values():
    code, slug = c[1], c[2]
    if slug in photo_src:
        assert photo_src[slug]['code'] == code, slug
        continue
    petite = fiche[code]['image_front_url']
    grande = petite.replace('.400.jpg', '.full.jpg')
    photo_src[slug] = {'source': 'Open Food Facts', 'licence': LIC, 'url': grande, 'code': code,
                       'fiche': url_off(code)}
    dest = os.path.join(ICI, 'photos', slug + '.jpg')
    if os.path.exists(dest):
        continue
    try:
        b = telecharger(grande)
    except urllib.error.HTTPError:
        b = telecharger(petite); photo_src[slug]['url'] = petite
    q, n = preparer(b, dest)
    print(f'{slug}: q{q} {n//1024} Ko', file=sys.stderr)
    time.sleep(1)

# 2. Catalogue compact
fams = {}
for p in produits:
    c = choix.get(p[0])
    if not c:
        continue
    _, code, slug, fam, var, cat, emo, cont, mots, _d = c
    f = fams.setdefault(fam, {'cat': int(cat), 'emo': emo, 'vars': {}})
    v = f['vars'].setdefault(var, {'emo': emo, 'slug': slug, 'cont': cont, 'mots': []})
    for m in mots.split(','):
        if m and m not in v['mots']:
            v['mots'].append(m)

def lot(cont, fam):
    # Comme catalogue-600 : la bière 65 cl se compte au casier de 12.
    return [12, 'casier', ''] if fam == 'Bière' and cont == '65cl' else [0, '', '']

entrees = []
for fam, f in fams.items():
    vs = list(f['vars'].items())
    if len(vs) == 1:
        var, v = vs[0]
        nom = fam if not var else f'{fam} {var}'
        entrees.append([nom, f['cat'], v['emo'], v['slug'], v['cont'], ','.join(v['mots']), None,
                        *lot(v['cont'], fam), photo_src[v['slug']]])
    else:
        varl = [[var, v['emo'], v['slug'], v['cont'], ','.join(v['mots']), *lot(v['cont'], fam),
                 photo_src[v['slug']]] for var, v in vs]
        entrees.append([fam, f['cat'], f['emo'], varl[0][2], '', '', varl, 0, '', '', varl[0][8]])
entrees.sort(key=lambda e: e[0].lower())
cat = {
    '_lisez_moi': ("Photos Open Food Facts (licence CC BY-SA 3.0) pour les produits de boutique de quartier du "
                   "Cameroun, Sud et Nord. Même format compact que catalogue-600.json : [famille, categorie, emoji, "
                   "image, contenance, motscles, [variantes], nb_par_lot, unite_lot, unite_mesure, licence] ; "
                   "variante : [nom, emoji, image, contenance, motscles, nb_par_lot, unite_lot, unite_mesure, licence]. "
                   "Le dernier élément (licence) est NOUVEAU : {source, licence, url, code, fiche}, à afficher "
                   "en crédit (« Photo : Open Food Facts, CC BY-SA 3.0 »). Les images sont dans photos/<image>.jpg, "
                   "600×600, PAS encore sur le stockage : base est vide tant que le patron n'a pas décidé de l'import."),
    'base': '', 'ext': '.jpg', 'maj': time.strftime('%Y-%m-%d'),
    'entrees': entrees,
}
json.dump(cat, open(os.path.join(ICI, 'catalogue-off.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)

# 3. Rapport
def etat(p):
    q = p[3]
    if not q:
        return 'sans'
    v = cand.get(q)
    if v is None:
        return 'pas_cherche'
    if v.get('cm') is None or v.get('monde') is None:
        return 'incomplet'
    return 'rien'

trouves = [p for p in produits if p[0] in choix]
douteux = [p for p in trouves if choix[p[0]][9]]
non = [p for p in produits if p[0] not in choix]
groupes = {'rien': [], 'incomplet': [], 'pas_cherche': [], 'sans': []}
for p in non:
    groupes[etat(p)].append(p)
L = []
L.append('# Photos du catalogue — Open Food Facts\n')
L.append(f"Généré par `construire.py` le {time.strftime('%d/%m/%Y')}. Source unique : Open Food Facts "
         f"(licence CC BY-SA 3.0, à créditer). Rien n'est importé dans l'app : c'est au patron de décider.\n")
L.append('## Bilan\n')
L.append(f'- Produits de la liste : **{len(produits)}**')
L.append(f'- Avec une photo OFF : **{len(trouves)}** ({len(photo_src)} photos différentes, plusieurs produits partagent la même)')
L.append(f'  - dont douteuses : **{len(douteux)}** (liste plus bas)')
L.append(f'- Sans photo : **{len(non)}**')
L.append(f"  - cherchés sur OFF, rien de bon : {len(groupes['rien'])}")
L.append(f"  - recherche incomplète (OFF a répondu 503 à chaque essai, plusieurs passes) : {len(groupes['incomplet'])}")
L.append(f"  - pas encore cherchés : {len(groupes['pas_cherche'])}")
L.append(f"  - pas cherchés exprès (vrac, frais, service, objet sans code-barres) : {len(groupes['sans'])}\n")
L.append("## Comment la recherche s'est faite\n")
L.append("La recherche d'OFF (`/cgi/search.pl`) est limitée à environ 10 requêtes par minute et a répondu "
         "« 503 Service Temporarily Unavailable » plus d'une fois sur deux le 16/11/2026, même à une requête "
         "toutes les 6,5 s. Une 1re session s'est arrêtée au produit « Détergent Madar » au bout de 2 h ; "
         "une 2e session a repris avec `chercher.py` le même jour (environ 4 h de recherche, toujours à une requête "
         "toutes les 6,5 s, 30 à 90 s d'attente après chaque 503) et a refait les requêtes qui avaient échoué. "
         "`chercher.py` ne redemande plus que la moitié manquante d'une requête, et un 503 n'efface plus une réponse "
         "déjà reçue (« orangina » avait perdu ses candidats Cameroun de cette façon).\n")
L.append("Chaque photo a été choisie à l'œil sur une planche contact : produit entier (bouteille, boîte ou paquet "
         "complet, rien de coupé), le bon produit ou, à défaut, un emballage très proche signalé « douteux ». "
         "Quand aucune photo n'était entière (Rambo, Raid, Harp, Semovita Golden Penny, gombo séché), le produit est "
         "laissé sans photo plutôt qu'avec une photo coupée.\n")
L.append('## Photos retenues\n')
L.append('produit → produit OFF retenu (code)\n')
for p in trouves:
    c = choix[p[0]]; f = fiche[c[1]]
    nm = (f.get('product_name_fr') or f.get('product_name') or '?').strip()
    br = (f.get('brands') or '').strip(); qt = (f.get('quantity') or '').strip()
    det = ', '.join(x for x in (br, qt) if x)
    L.append(f"- {p[0]} → {nm}{' (' + det + ')' if det else ''} ({c[1]}) — `photos/{c[2]}.jpg`"
             + (' ⚠️' if c[9] else ''))
L.append('\n## Correspondances douteuses\n')
L.append("La photo est vraie, mais pas exactement le produit de la liste. À regarder avant d'importer.\n")
for p in douteux:
    L.append(f"- **{p[0]}** ({choix[p[0]][1]}) : {choix[p[0]][9]}")
L.append('\n## Sans photo — à photographier en boutique\n')
tit = {'rien': 'Cherchés sur OFF, aucune photo convenable',
       'incomplet': 'Recherche incomplète (503 répétés)',
       'pas_cherche': 'Pas encore cherchés',
       'sans': 'Pas cherchés exprès : vrac, frais, service ou objet sans code-barres'}
for k in ('rien', 'incomplet', 'pas_cherche', 'sans'):
    L.append(f"\n### {tit[k]} ({len(groupes[k])})\n")
    for p in groupes[k]:
        L.append(f"- {p[0]} — {p[1]} — {p[2]}")
L.append('\n## Fichiers\n')
L.append('- `produits.tsv` : la liste (nom | catégorie | région | requête OFF).')
L.append('- `candidats.json` : les réponses brutes d\'OFF, par requête (sert de cache à `chercher.py`).')
L.append('- `choix.tsv` : le choix fait à la main pour chaque produit, avec la note « douteux ».')
L.append('- `chercher.py`, `photo.py`, `construire.py` : les scripts (Python 3 + Pillow).')
L.append('- `photos/` : JPEG 600×600, produit entier, fond blanc, < 120 Ko.')
L.append('- `catalogue-off.json` : prêt à importer, format de `catalogue-600.json` + crédit de licence.')
L.append('\n## Pour la session qui importera dans l\'app\n')
L.append("- Rien de ce dossier n'est encore dans l'app : `catalogue-off.json` et `photos/` sont prêts, la base "
         "(`base`) est vide tant que les photos ne sont pas sur le stockage.")
L.append("- La licence CC BY-SA 3.0 oblige à créditer Open Food Facts (une ligne « Photos de produits : Open Food Facts, "
         "licence CC BY-SA 3.0 » suffit) : le crédit a été retiré de l'app avec le revert de 94ec244, à remettre "
         "avec l'import.")
L.append("- Demande du patron le 16/11/2026, à faire dans l'app (pas dans cette session) : « l'objectif de la journée, "
         "il faut l'effacer ». Ça touche la barre « Objectif » en haut de la caisse (`#obj-bar`, `updateObjBar`), "
         "la ligne 🎯 « Objectif journalier » de Réglages (`ouvrirObj`, feuille `ov-obj`), et la notification "
         "« 🎯 Objectif atteint ! » (`DB.objectif`). Garder `DB.objectif` dans les données pour ne rien casser à la "
         "synchro.")
open(os.path.join(ICI, 'RAPPORT.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print(len(trouves), len(douteux), len(non), {k: len(v) for k, v in groupes.items()}, file=sys.stderr)
