# Voix du DIALOGUE (SCRIPT-dialogue.md) : une piste par réplique.
# H = le boutiquier (pm_alex, phonèmes français), F = MyBoutiQ (ff_siwis),
# « H et F » = les deux voix ensemble. Le texte affiché reste celui du script ;
# le texte DIT corrige la prononciation (« MyBoutiQ » se lisait « mi buti ky »).
import re, json, subprocess, os, wave, numpy as np
P=os.path.dirname(os.path.abspath(__file__))
VOIX={'H':('pm_alex','1.0'),'F':('ff_siwis','1.0')}
DIT=[('MyBoutiQ','Maï boutique'),('myboutiq point online','maï boutique point onne laïne'),('WhatsApp','Wattsapp'),('Orange Money','Orange Mani'),('« Encaisser »','Encaissé'),('« ','« ')]
s=open(os.path.join(P,'SCRIPT-dialogue.md'),encoding='utf-8').read()
out=[]; os.makedirs(os.path.join(P,'assets/voix2'),exist_ok=True)
def tts(txt,v,sp,f):
    if os.path.exists(f): return
    r=subprocess.run(['npx','hyperframes','tts',txt,'-v',v,'-l','fr-fr','-s',sp,'-o',f,'--json'],capture_output=True,text=True,cwd=P)
    if not os.path.exists(f): print(r.stdout[-300:],r.stderr[-300:]); raise SystemExit(1)
def lire(f):
    with wave.open(f) as w: return w.getframerate(),np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
for bloc in re.split(r'\n## ',s)[1:]:
    num=int(bloc.split(' ',1)[0]); i=0
    for ligne in bloc.split('\n')[1:]:
        m=re.match(r'^(H et F|H|F) : (.+)$',ligne.strip())
        if not m: continue
        qui,txt=m.group(1),m.group(2); i+=1
        dit=txt
        for a,c in DIT: dit=dit.replace(a,c)
        f=f'assets/voix2/f{num:02d}-{i:02d}.wav'; fp=os.path.join(P,f)
        if qui=='H et F':
            fa,fb=fp.replace('.wav','-h.wav'),fp.replace('.wav','-f.wav')
            tts(dit,*VOIX['H'],fa); tts(dit,*VOIX['F'],fb)
            sr,a=lire(fa); _,b=lire(fb); n=max(len(a),len(b)); x=np.zeros(n,np.float32); x[:len(a)]+=a*0.7; x[:len(b)]+=b*0.7
            with wave.open(fp,'w') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(x,-1,1)*32767).astype(np.int16).tobytes())
        else: tts(dit,*VOIX[qui],fp)
        sr,x=lire(fp)
        out.append({'frame':num,'i':i,'qui':'HF' if qui=='H et F' else qui,'texte':txt,'dit':dit,'src':f,'duree':round(len(x)/sr,3)})
        print(num,i,qui,round(len(x)/sr,2),txt[:50],flush=True)
json.dump(out,open(os.path.join(P,'voix.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('total',round(sum(x['duree'] for x in out),1),'s',len(out),'répliques')
