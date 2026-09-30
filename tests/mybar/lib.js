/* Ce que tous les bancs partagent : le navigateur, l'adresse, où poser les captures.
   En CI, `playwright` est installé ici même ; dans le conteneur de travail il vit
   ailleurs (PLAYWRIGHT_PATH), et le Chromium est celui déjà présent sur la machine. */
const fs=require('fs'),os=require('os'),path=require('path');
function charger(){
  const essais=['playwright',process.env.PLAYWRIGHT_PATH,'/tmp/claude-0/node_modules/playwright'].filter(Boolean);
  for(const e of essais){try{return require(e);}catch(_){}}
  throw new Error("playwright introuvable. Lance « npm install » dans tests/mybar, ou fixe PLAYWRIGHT_PATH.");
}
function chrome(){
  if(process.env.CHROMIUM_PATH)return process.env.CHROMIUM_PATH;
  try{
    const racine='/opt/pw-browsers';
    const d=fs.readdirSync(racine).filter(x=>/^chromium-\d+$/.test(x)).sort().pop();
    if(d){const p=path.join(racine,d,'chrome-linux','chrome');if(fs.existsSync(p))return p;}
  }catch(_){}
  return undefined;   // Playwright prend alors le sien
}
const URL=process.env.MYBAR_URL||'http://localhost:8788/bar/index.html';
const BASE=new (require('url').URL)(URL).origin;
const SHOT=path.join(os.tmpdir(),'mybar-');
module.exports={chromium:charger().chromium,CHROME:chrome(),URL,BASE,SHOT};
