# Met une photo OFF au format du catalogue : JPEG carré 600×600, produit
# ENTIER et centré (on agrandit le canevas en blanc, on ne coupe jamais),
# qualité ~82, moins de 120 Ko.
# Seules les marges quasi blanches autour du produit sont retirées avant de
# centrer : elles ne sont pas le produit, et sans ça une bouteille fine
# finissait minuscule au milieu de son carré.
import io, sys
from PIL import Image, ImageChops, ImageOps

COTE, MARGE, MAXO = 600, 24, 120 * 1024

def preparer(src_bytes, dest):
    im = Image.open(io.BytesIO(src_bytes))
    im = ImageOps.exif_transpose(im)
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        fond = Image.new('RGB', im.size, (255, 255, 255))
        fond.paste(im, mask=im.split()[3])
        im = fond
    else:
        im = im.convert('RGB')
    # Rognage des seules bordures blanches (écart < 18 au blanc pur).
    diff = ImageChops.difference(im, Image.new('RGB', im.size, (255, 255, 255))).convert('L')
    boite = diff.point(lambda v: 255 if v > 18 else 0).getbbox()
    if boite:
        im = im.crop(boite)
    w, h = im.size
    k = (COTE - 2 * MARGE) / max(w, h)
    im = im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
    can = Image.new('RGB', (COTE, COTE), (255, 255, 255))
    can.paste(im, ((COTE - im.size[0]) // 2, (COTE - im.size[1]) // 2))
    for q in (82, 78, 74, 70, 65, 60):
        b = io.BytesIO()
        can.save(b, 'JPEG', quality=q, optimize=True, progressive=True)
        if b.tell() < MAXO:
            break
    open(dest, 'wb').write(b.getvalue())
    return q, b.tell()

if __name__ == '__main__':
    print(preparer(open(sys.argv[1], 'rb').read(), sys.argv[2]))
