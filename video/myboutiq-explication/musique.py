# Fond musical de la vidéo longue — synthèse pure (aucun échantillon, rien à
# déclarer côté droits). Doux, chaleureux, pour rester SOUS une voix pendant
# 4 minutes : nappes d'accords, kalimba en arpège léger, shaker discret.
# 96 BPM, progression I–V–vi–IV en do. Usage : python3 musique.py <durée s> <sortie.wav>
import sys, numpy as np, wave
DUR=float(sys.argv[1]); OUT=sys.argv[2]; SR=44100; N=int(DUR*SR)
rng=np.random.default_rng(20261016)
L=np.zeros(N); R=np.zeros(N)
bpm=96; beat=60/bpm; bar=4*beat
def mtof(m): return 440*2**((m-69)/12)
def add(buf,t0,sig,g=1.0):
    s0=int(t0*SR)
    if s0>=N: return
    e=min(N,s0+len(sig)); buf[s0:e]+=sig[:e-s0]*g
def pad(freqs,length):
    t=np.arange(int(length*SR))/SR
    s=sum(np.sin(2*np.pi*f*t)+0.35*np.sin(2*np.pi*f*2.003*t) for f in freqs)/len(freqs)
    env=np.minimum(1,t/0.9)*np.minimum(1,(length-t)/0.9)
    return s*env
def kal(f,length=1.2):
    t=np.arange(int(length*SR))/SR
    return (np.sin(2*np.pi*f*t)+0.3*np.sin(2*np.pi*f*3.01*t)*np.exp(-t*9))*np.exp(-t*4.5)
def shaker(length=0.09):
    n=int(length*SR); x=rng.uniform(-1,1,n); x=np.diff(np.concatenate([[0],x]))
    return x*np.exp(-np.arange(n)/SR*55)
prog=[[60,64,67],[55,59,62,67],[57,60,64],[53,57,60,65]]   # C G Am F
arp=[0,2,1,2,0,1,2,1]
t=0.0; k=0
while t<DUR:
    ch=prog[k%4]
    p=pad([mtof(m-12) for m in ch],bar+0.9)
    add(L,t,p,0.10); add(R,t,p,0.10)
    add(L,t,pad([mtof(ch[0]-24)],bar+0.5),0.09); add(R,t,pad([mtof(ch[0]-24)],bar+0.5),0.09)
    for i in range(8):
        n=ch[arp[i]%len(ch)]+12
        g=0.06 if i%2==0 else 0.04
        add(L if i%2 else R,t+i*beat/2,kal(mtof(n)),g); add(R if i%2 else L,t+i*beat/2,kal(mtof(n)),g*0.5)
    for i in range(8):
        add(L,t+i*beat/2+beat/4,shaker(),0.018 if i%2 else 0.03); add(R,t+i*beat/2+beat/4,shaker(),0.012)
    t+=bar; k+=1
# entrée et sortie en fondu
f=np.ones(N); a=int(2.5*SR); f[:a]=np.linspace(0,1,a); f[-int(4*SR):]=np.linspace(1,0,int(4*SR))
L*=f; R*=f
m=max(np.abs(L).max(),np.abs(R).max()); L=L/m*0.6; R=R/m*0.6
st=(np.stack([L,R],1)*32767).astype(np.int16)
with wave.open(OUT,'w') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print('ok',DUR)
