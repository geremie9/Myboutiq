# Pose chaque phrase de la voix à son instant (timings.json) dans UNE piste,
# puis fabrique la musique à la bonne durée et la baisse sous la voix.
import json, wave, numpy as np, os, subprocess
P=os.path.dirname(os.path.abspath(__file__))
T=json.load(open(os.path.join(P,'timings.json')))
SR=24000; N=int((T['total']+0.5)*SR); v=np.zeros(N,dtype=np.float32)
for s in T['scenes']:
    for b in s['beats']:
        with wave.open(os.path.join(P,b['src'])) as w:
            assert w.getframerate()==SR, w.getframerate()
            x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
        i=int(b['abs']*SR); v[i:i+len(x)]+=x[:N-i]
pk=np.abs(v).max(); v=v/pk*0.89
with wave.open(os.path.join(P,'assets/audio/voix.wav'),'w') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((v*32767).astype(np.int16).tobytes())
# musique, puis « duck » : la musique s'efface sous la voix (gain 0.32), revient dans les silences
m=os.path.join(P,'assets/audio/musique.wav')
subprocess.run(['python3',os.path.join(P,'musique.py'),str(T['total']+0.5),m],check=True)
with wave.open(m) as w: MSR=w.getframerate(); mm=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32).reshape(-1,2)/32768
act=np.zeros(len(mm),dtype=np.float32)
for s in T['scenes']:
    for b in s['beats']:
        a=int((b['abs']-0.15)*MSR); e=int((b['abs']+b['duree']+0.1)*MSR); act[max(0,a):e]=1
k=int(0.35*MSR); ker=np.ones(k)/k
g=1-0.68*np.convolve(act,ker,mode='same')
mm*=g[:,None]
with wave.open(m,'w') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(MSR); w.writeframes((np.clip(mm,-1,1)*32767).astype(np.int16).tobytes())
print('voix',round(N/SR,1),'s ; musique baissée sous la voix')
