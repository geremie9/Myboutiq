/* ══ 23.07 — CE QUI FAIT VIVRE LES GUIDES ═══════════════════════════
   La page se lit SANS ce script : il n'ajoute que du mouvement et des
   repères. Il ne touche jamais au texte que Google lit.
   - une barre en haut qui avance avec la lecture ;
   - un sommaire (les titres de la page) qui suit, et dit où on en est ;
   - les blocs qui apparaissent au défilement, les chiffres qui montent ;
   - sur la capture : le cadre sélectionné et un curseur, comme sur Figma.
   Il ne travaille que ce qui est à l'écran, et pas du tout si le
   téléphone demande moins de mouvement.
   ═════════════════════════════════════════════════════════════════════ */
(function(){try{
  var R=document.documentElement,moins=false;
  try{moins=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);}catch(e){}
  var IO=window.IntersectionObserver,d=document;
  var el=function(t,c,h){var x=d.createElement(t);if(c)x.className=c;if(h!=null)x.innerHTML=h;return x;};

  // ── La barre de lecture ──
  var prog=el('div');prog.id='g-prog';d.body.appendChild(prog);
  var enCours=false;
  var majProg=function(){enCours=false;
    var h=d.documentElement.scrollHeight-innerHeight,y=window.pageYOffset||d.documentElement.scrollTop||0;
    prog.style.transform='scaleX('+(h>0?Math.min(1,y/h):0)+')';};
  window.addEventListener('scroll',function(){if(!enCours){enCours=true;requestAnimationFrame(majProg);}},{passive:true});
  majProg();

  // ── Le cadre et le curseur sur la capture d'ouverture ──
  var hero=d.querySelector('header.top .hero');
  if(hero){
    var c=el('div','g-cadre','⬚ Ma caisse <s>390 × 844</s>');c.setAttribute('aria-hidden','true');hero.appendChild(c);
    var cur=el('div','g-cur','<svg viewBox="0 0 16 20" width="16" height="20"><path d="M1 1l13 10-6 1-3 6z" fill="#FF5FA2" stroke="#fff" stroke-width="1.4"/></svg><span>toi</span>');
    cur.setAttribute('aria-hidden','true');hero.appendChild(cur);
  }

  // ── Le sommaire : les titres des blocs, qui suivent la lecture ──
  var h2=d.querySelectorAll('.wrap .bl > h2'),liens=[];
  if(h2.length>=3){
    var nav=el('nav','g-som'),box=el('div');nav.setAttribute('aria-label','Sommaire');nav.appendChild(box);
    for(var i=0;i<h2.length;i++){
      var bl=h2[i].parentNode;if(!bl.id)bl.id='g-'+(i+1);
      var a=el('a');a.href='#'+bl.id;a.textContent=h2[i].textContent;box.appendChild(a);liens.push([bl,a]);
    }
    var wrap=d.querySelector('body > .wrap');
    if(wrap)wrap.insertBefore(nav,wrap.firstChild);
    var majSom=function(){
      var ici=null;
      for(var j=0;j<liens.length;j++)if(liens[j][0].getBoundingClientRect().top<140)ici=j;
      for(var k=0;k<liens.length;k++){
        var on=(k===ici);
        if(on!==liens[k][1].classList.contains('ici')){liens[k][1].classList.toggle('ici',on);
          if(on&&box.scrollTo){try{box.scrollTo({left:liens[k][1].offsetLeft-18,behavior:moins?'auto':'smooth'});}catch(e){}}}
      }
    };
    var att=false;window.addEventListener('scroll',function(){if(!att){att=true;requestAnimationFrame(function(){att=false;majSom();});}},{passive:true});
    majSom();
  }

  if(moins||!IO)return;
  // ── L'apparition au défilement, et les chiffres qui montent ──
  R.classList.add('g-anim');
  var monte=function(b){
    var t=b.textContent,m=t.match(/^(\D*)(\d+)(.*)$/);if(!m)return;
    var fin=+m[2];if(!(fin>1))return;var t0=null;
    var pas=function(ts){if(t0===null)t0=ts;var k=Math.min(1,(ts-t0)/900);k=1-Math.pow(1-k,3);
      b.textContent=m[1]+Math.round(fin*k)+m[3];if(k<1)requestAnimationFrame(pas);};
    requestAnimationFrame(pas);
  };
  var vus=d.querySelectorAll('.wrap .bl, .wrap figure, .wrap .bilan, .wrap .cta, .faq dt, .stats .st');
  var o=new IO(function(es){es.forEach(function(e){if(!e.isIntersecting)return;o.unobserve(e.target);
    e.target.classList.add('vu');
    if(e.target.classList.contains('st')){var b=e.target.querySelector('b');if(b)monte(b);}
  });},{rootMargin:'0px 0px -6% 0px'});
  for(var v=0;v<vus.length;v++){vus[v].classList.add('g-rv');o.observe(vus[v]);}
}catch(e){}})();
