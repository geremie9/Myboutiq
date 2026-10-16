# Voix off : une piste par phrase (minutage exact des sous-titres).
# Le texte affiché reste celui du storyboard ; le texte DIT corrige la
# prononciation de la voix française (« MyBoutiQ » se lisait « mi buti ky »).
import re, json, subprocess, os, wave
P=os.path.dirname(os.path.abspath(__file__))
s=open(os.path.join(P,'STORYBOARD.md'),encoding='utf-8').read()
blocs=re.split(r'\n## Frame ',s)[1:]
DIT=[('MyBoutiQ','Maï boutique'),('myboutiq point online','maï boutique point onne laïne'),('WhatsApp','Wattsapp'),('Orange Money','Orange Mani'),('« ','« '),]
out=[]
for b in blocs:
    num=int(b.split(' ',1)[0]); vo=re.search(r'- voiceover: "(.*)"',b).group(1)
    phrases=[x.strip() for x in re.findall(r'[^.?!]+[.?!]+(?:\s*»)?\s*',vo) if x.strip()]
    for i,ph in enumerate(phrases):
        dit=ph
        for a,c in DIT: dit=dit.replace(a,c)
        f=f'assets/voix/f{num:02d}-{i+1:02d}.wav'
        fp=os.path.join(P,f)
        if not os.path.exists(fp):
            r=subprocess.run(['npx','hyperframes','tts',dit,'-v','ff_siwis','-s','0.87','-o',fp,'--json'],capture_output=True,text=True,cwd=P)
            if not os.path.exists(fp): print(r.stdout[-300:],r.stderr[-300:]); raise SystemExit(1)
        with wave.open(fp) as w: d=w.getnframes()/w.getframerate()
        out.append({'frame':num,'i':i+1,'texte':ph,'dit':dit,'src':f,'duree':round(d,3)})
        print(num,i+1,round(d,2),ph[:60],flush=True)
json.dump(out,open(os.path.join(P,'voix.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('total',round(sum(x['duree'] for x in out),1),'s',len(out),'phrases')
