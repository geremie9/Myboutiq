# Cherche sur Open Food Facts les candidats de chaque requête de produits.tsv.
# Une requête « Cameroun » puis une requête « monde » ; au plus 1 requête par
# seconde (en fait 6,5 s : la recherche OFF est limitée à 10/min), User-Agent générique (aucun nom, aucune adresse : consigne du patron).
# Sortie : candidats.json (relançable : ce qui est déjà en cache n'est pas redemandé).
import json, os, sys, time, urllib.parse, urllib.request

ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ICI, 'candidats.json')
UA = 'MyBoutiQ-catalogue/1.0'
CHAMPS = 'code,product_name,product_name_fr,brands,quantity,image_front_url,countries_tags'
AFRIQUE = {'en:cameroon', 'en:nigeria', 'en:ivory-coast', 'en:senegal', 'en:gabon', 'en:chad',
           'en:central-african-republic', 'en:republic-of-the-congo', 'en:democratic-republic-of-the-congo',
           'en:ghana', 'en:benin', 'en:togo', 'en:burkina-faso', 'en:mali', 'en:niger', 'en:guinea',
           'en:equatorial-guinea'}

def appel(q, pays=None, n=24):
    p = {'search_terms': q, 'search_simple': 1, 'action': 'process', 'json': 1,
         'page_size': n, 'fields': CHAMPS}
    if pays:
        p.update({'tagtype_0': 'countries', 'tag_contains_0': 'contains', 'tag_0': pays})
    url = 'https://world.openfoodfacts.org/cgi/search.pl?' + urllib.parse.urlencode(p)
    for essai in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r).get('products', [])
        except Exception as e:
            print('  ! erreur', e, file=sys.stderr)
            time.sleep(30 * (essai + 1))
    return None

cache = json.load(open(SORTIE)) if os.path.exists(SORTIE) else {}
reqs = []
for l in open(os.path.join(ICI, 'produits.tsv'), encoding='utf-8'):
    if l.startswith('#') or not l.strip():
        continue
    q = l.rstrip('\n').split('|')[3].strip()
    if q and q not in reqs:
        reqs.append(q)

for i, q in enumerate(reqs):
    if q in cache and cache[q].get('cm') is not None and cache[q].get('monde') is not None:
        continue
    print(f'[{i+1}/{len(reqs)}] {q}', file=sys.stderr)
    # ⚠️ On ne redemande que la moitié qui manque, et un 503 n'efface jamais
    # une réponse déjà reçue : au 1er passage du 16/11 (2e session), « orangina »
    # avait perdu ses candidats Cameroun parce que la nouvelle requête a échoué.
    avant = cache.get(q) or {}
    cm = avant.get('cm')
    if cm is None:
        cm = appel(q, 'en:cameroon'); time.sleep(6.5)
    # Assez de candidats au Cameroun : la recherche monde ne servirait à rien
    # (et chaque requête en trop coûte un 503 sur deux, mesuré le 16/11).
    monde = avant.get('monde')
    if monde is None:
        if cm is not None and len(cm) >= 3:
            monde = []
        else:
            monde = appel(q, None, 30); time.sleep(6.5)
    cache[q] = {'cm': cm, 'monde': monde}
    json.dump(cache, open(SORTIE, 'w'), ensure_ascii=False)
print('fini', len(cache), file=sys.stderr)
