const REG = {l:"🪊 Pince-sans-rire", r:"🐟 Absurde", u:"🎻 Lyrique", d:"🗑️ Trash"};
const ORDER = {l:"DOSE !", r:"TRACE !", u:"LA RIME !", d:"VISE !"};
const SUB = {l:"pause, puis chute", r:"redessine de mémoire", u:"trouve la rime", d:"billard"};
const PUBLICS = [
  {id:"ehpad", name:"Thé dansant à l'EHPAD", desc:"Vous allez bien vous entendre, ce public est appareillé", w:{l:1.6,r:1,u:1.3,d:1}},
  {id:"bar", name:"Bar à 2h du mat'", desc:"Le pied de micro est à droite, à gauche c'est le narguilé", w:{l:.7,r:.5,u:.5,d:1.7}},
  {id:"rh", name:"Séminaire RH", desc:"#opentolaugh", w:{l:.5,r:1.6,u:.9,d:.35}},
];
const RHYMES = {
  er:["Verre","Guerre","Cuillère","Dromadaire","Notaire","Sorcière"],
  ette:["Baguette","Chaussette","Raquette","Crevette","Fourchette","Trompette"],
  o:["Chapeau","Gâteau","Bateau","Château","Couteau","Vélo"],
  on:["Camion","Citron","Ballon","Cochon","Bouchon","Melon"],
  i:["Tapis","Souris","Radis","Kiwi","Colibri","Salsifis"],
  a:["Chocolat","Panda","Pizza","Koala","Tombola","Cinéma"],
  e:["Café","Nez","Purée","Bébé","Épée","Fusée"],
  ique:["Musique","Panique","Brique","Élastique","Afrique","Bique"],
  iste:["Piste","Artiste","Touriste","Liste","Kyste"],
  ing:["Parking","Pudding","Smoking","Jogging","Brushing"],
  u:["Tortue","Laitue","Statue","Massue","Verrue"],
  ante:["Tante","Menthe","Attente","Pente","Plante"],
};
// [mot, registre qui lui va, famille de rime]
const WORDS = [["Belle-mère","l","er"],["Grand-père","u","er"],["Trottinette","r","ette"],["Raclette","u","ette"],["Impôts","l","o"],
 ["Pigeon","r","on"],["Marathon","l","on"],["Lundi","l","i"],["Mamie","u","i"],["Wi-Fi","r","i"],["Ikea","r","a"],["Opéra","u","a"],
 ["Chat","d","a"],["Poney","r","e"],["Moustique","d","ique"],["Dentiste","d","iste"],["Camping","d","ing"],["Barbecue","d","u"],
 ["Brocante","u","ante"],["Tinder","d","er"]];
const JOKES = 8;

let S = {}, PUNCH = "";
/* ---------- Articles ---------- */
const FEM=new Set(["Guerre","Cuillère","Sorcière","Baguette","Chaussette","Raquette","Crevette","Fourchette","Trompette","Souris","Pizza","Tombola",
  "Purée","Épée","Fusée","Musique","Panique","Brique","Bique","Piste","Liste","Tortue","Laitue","Statue","Massue","Verrue","Tante","Menthe","Attente","Pente","Plante"]);
const ART={"Belle-mère":"la","Grand-père":"le","Trottinette":"la","Raclette":"la","Impôts":"les","Pigeon":"le","Marathon":"le","Lundi":"le","Mamie":"",
  "Wi-Fi":"le","Ikea":"","Opéra":"l'","Chat":"le","Poney":"le","Moustique":"le","Dentiste":"le","Camping":"le","Barbecue":"le","Brocante":"la","Tinder":""};
const low=w=>w.toLowerCase(), cap=t=>t.charAt(0).toUpperCase()+t.slice(1), vowel=w=>/^[aeiouyéèêàâîôûh]/i.test(w);
const indef=w=>w==="Afrique"?"l'Afrique":(FEM.has(w)?"une ":"un ")+low(w);
const deIndef=w=>w==="Afrique"?"de l'Afrique":"d'"+indef(w);
const def=w=>{ const a=ART[w]??""; return a===""?w:a==="l'"?"l'"+low(w):a+" "+low(w); };
const deDef=w=>{ const a=ART[w]??""; return a==="le"?"du "+low(w):a==="les"?"des "+low(w):a==="la"?"de la "+low(w):a==="l'"?"de l'"+low(w):(vowel(w)?"d'":"de ")+w; };
const SHAPE_ART={"spirale":"une spirale","étoile":"une étoile","cœur":"un cœur","éclair":"un éclair","infini":"l'infini","vague":"une vague","triangle":"un triangle","tasse":"une tasse"};
const SHAPE_FEM=new Set(["spirale","étoile","vague","tasse"]);
const que=x=>vowel(x)?"qu'"+x:"que "+x;
// « mon citron éternel » / « ma tortue éternelle »
const poss=(w,fem,adj)=>{ if(w==="Afrique"){ fem=true; } const n=w==="Afrique"?w:low(w);
  return (fem?(vowel(w)?"mon ":"ma "):"mon ")+n+" "+(fem?(adj.endsWith("el")?adj+"le":adj+"e"):adj); };
const QUALS=["bien","super","top","pas terrible","dispensable","correct","sympa","moyen"]; const root = document.getElementById("root");
const $ = id => document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};

/* ---------- Audio ---------- */
let AC=null;
let MUTED=false; try{ MUTED=localStorage.getItem("sus-muted")==="1"; }catch(e){}
function ac(){ if(MUTED) return null; if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(AC&&AC.state==="suspended") AC.resume(); return AC; }
function noise(dur){ const a=ac(); const b=a.createBuffer(1,a.sampleRate*dur,a.sampleRate); const d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; const s=a.createBufferSource(); s.buffer=b; return s; }
function env(g,t,at,peak,rel){ g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(peak,t+at); g.gain.exponentialRampToValueAtTime(.001,t+at+rel); }
function tone(freq,dur,type="sine",vol=.15,delay=0){ const a=ac(); if(!a) return; const t=a.currentTime+delay; const o=a.createOscillator(),g=a.createGain(); o.type=type; o.frequency.value=freq; env(g,t,.005,vol,dur); o.connect(g).connect(a.destination); o.start(t); o.stop(t+dur+.05); }
const SFX={
  laugh(n=6){ const a=ac(); if(!a) return; for(let i=0;i<n;i++){ const t=a.currentTime+i*.13+Math.random()*.03;
    const o=a.createOscillator(),g=a.createGain(),f=a.createBiquadFilter(); o.type="sawtooth"; o.frequency.setValueAtTime(260+Math.random()*120,t); o.frequency.exponentialRampToValueAtTime(180,t+.1);
    f.type="bandpass"; f.frequency.value=900; f.Q.value=2; env(g,t,.01,.25,.11); o.connect(f).connect(g).connect(a.destination); o.start(t); o.stop(t+.15);} },
  applause(){ const a=ac(); if(!a) return; for(let i=0;i<45;i++){ const t=a.currentTime+Math.random()*1.4; const s=noise(.05),g=a.createGain(),f=a.createBiquadFilter();
    f.type="highpass"; f.frequency.value=1500; env(g,t,.002,.3,.04); s.connect(f).connect(g).connect(a.destination); s.start(t);} SFX.laugh(4); },
  crickets(){ for(let k=0;k<3;k++) for(let i=0;i<4;i++) tone(4300,.03,"sine",.07,k*.45+i*.05); },
  awkward(){ const a=ac(); if(!a) return; const t=a.currentTime; const o=a.createOscillator(),g=a.createGain(); o.type="triangle"; o.frequency.setValueAtTime(330,t); o.frequency.linearRampToValueAtTime(300,t+.5);
    env(g,t,.02,.18,.5); o.connect(g).connect(a.destination); o.start(t); o.stop(t+.6); },
  boo(){ const a=ac(); if(!a) return; for(let i=0;i<4;i++){ const t=a.currentTime+i*.04; const o=a.createOscillator(),g=a.createGain(),f=a.createBiquadFilter();
    o.type="sawtooth"; o.frequency.setValueAtTime(150+i*17,t); o.frequency.linearRampToValueAtTime(95+i*10,t+1); f.type="lowpass"; f.frequency.value=700;
    env(g,t,.1,.16,.9); o.connect(f).connect(g).connect(a.destination); o.start(t); o.stop(t+1.1);} },
  swish(){ const a=ac(); if(!a) return; const s=noise(.15),g=a.createGain(),f=a.createBiquadFilter(); f.type="bandpass"; f.frequency.value=2000; env(g,a.currentTime,.01,.2,.12); s.connect(f).connect(g).connect(a.destination); s.start(); },
  tick(){ tone(880,.05,"square",.06); },
  badum(){ tone(140,.12,"sine",.5); tone(110,.18,"sine",.5,.14); },
  tss(){ const a=ac(); if(!a) return; const s=noise(.5),g=a.createGain(),f=a.createBiquadFilter(); f.type="highpass"; f.frequency.value=6000; env(g,a.currentTime,.003,.35,.45); s.connect(f).connect(g).connect(a.destination); s.start(); tone(90,.1,"sine",.4); },
  boom(){ const a=ac(); if(!a) return; const s=noise(.6),g=a.createGain(),f=a.createBiquadFilter(); f.type="lowpass"; f.frequency.value=500; env(g,a.currentTime,.005,.5,.55); s.connect(f).connect(g).connect(a.destination); s.start(); },
};

/* ---------- Écrans ---------- */
function menu(){
  S={phase:"menu"}; root.classList.remove("end"); root.classList.add("scroll"); root.scrollTop=0;
  root.innerHTML=`<h1>Stand-upper Simulator</h1>
  <div class="menu">
    <span class="lbl" style="text-align:center">Choisis ta salle</span>
    ${PUBLICS.map((p,i)=>`<button class="pub" id="pub-${p.id}" data-i="${i}"><strong>${p.name}</strong><small>${p.desc}</small>${hardOf(p).length?`<em class="hard">${hardOf(p).length>1?"Angles difficiles":"Angle difficile"} : ${hardOf(p).map(k=>REG[k]).join(", ")}</em>`:""}</button>`).join("")}
    <span class="lbl" style="text-align:center;margin-top:8px">Comment jouer</span>
    <div class="swipe demo">${dirLabel("u",1)}${dirLabel("l",1)}<div class="card mini" id="democard"><span class="word" id="dword">Un mot</span><span class="tag" id="dtag"></span></div>${dirLabel("r",1)}${dirLabel("d",1)}</div>
    <p>Un mot tombe. <b>Swipe</b> pour choisir l'angle de ta vanne, puis réussis le mini-jeu de cet angle.</p>
  </div>`;
  root.querySelectorAll(".pub").forEach(b=>b.onclick=()=>{ ac(); start(PUBLICS[+b.dataset.i]); });
  demoI=0; bindDemo();
}
function start(pub){
  S={phase:"swipe",pub,deck:shuffle(WORDS).slice(0,JOKES),i:0,score:0,combo:0,mood:50};
  const [lo,hi]={ehpad:[10,15],bar:[8,14],rh:[12,17]}[pub.id]; const occ=lo+Math.floor(Math.random()*(hi-lo+1));
  S.seat=shuffle([...Array(20)].map((_,i)=>i<occ)); S.stand=[]; S.boos=0; S.ovs=0; S.results=[]; S.punches=[];
  S.faces=idleFaces(); render();
}
/* ---------- Salle : 5 rangées de 4 chaises + micro ---------- */
// visage + accessoire éventuel affiché à côté de la tête
const FACES={
  applause:{f:["🤩","😄","😆","😁"],p:["👏","🙌","👏","👏"]},
  laugh:{f:["😂","🤣","😆","😄"],p:["","","👍",""]},
  awkward:{f:["😬","🫤","😅","🙂"],p:[""]},
  crickets:{f:["😐","😶","🥱","😑"],p:["","","📱",""]},
  boo:{f:["😠","🤬","😤","😒"],p:["🍅","👎","🍅",""]},
};
const fx=(f,p)=>f+(p?`<b class="prop">${p}</b>`:"");
function idleFace(){ const m=S.mood??50; return pick(m>=70?["🙂","😀","🙂","😊"]:m>=35?["😐","🙂","😐","🤔"]:["😒","😑","🙄","😐"]); }
const faceFor=kind=>kind?fx(pick(FACES[kind].f),pick(FACES[kind].p)):idleFace();
function idleFaces(){ return S.seat.map(o=>o?idleFace():""); }
function hallHTML(){
  let h=`<div class="hall" id="hall">`;
  if(S.stand.length) h+=`<div class="row stand" style="--s:16px">${S.stand.map((f,i)=>`<div class="seat st"><span id="s${i}">${f}</span></div>`).join("")}</div>`;
  for(let r=0;r<5;r++){ h+=`<div class="row" style="--s:${18+r*5}px">`; for(let c=0;c<4;c++) h+=`<div class="seat"><span id="f${r*4+c}">${S.faces[r*4+c]}</span></div>`; h+=`</div>`; }
  return h+`<svg class="mic" viewBox="0 0 60 200" aria-hidden="true">
    <rect x="27" y="70" width="6" height="118" fill="#9aa3b5"/><rect x="26" y="66" width="8" height="8" rx="2" fill="#6b7280"/>
    <ellipse cx="30" cy="192" rx="24" ry="6" fill="#4b5563"/><rect x="24" y="38" width="12" height="32" rx="4" fill="#1f2937"/>
    <circle cx="30" cy="26" r="17" fill="#cbd5e1"/><circle cx="30" cy="26" r="17" fill="none" stroke="#6b7280" stroke-width="2"/>
    <path d="M15 20h30M13 27h34M15 34h30M24 10v32M30 9v34M36 10v32" stroke="#94a3b8" stroke-width="1.2"/></svg></div>`;
}
function redrawHall(){ const h=$("hall"); if(h) h.outerHTML=hallHTML(); }
function setFaces(kind){
  S.faces=S.seat.map(o=>o?faceFor(kind):""); S.stand=S.stand.map(()=>faceFor(kind));
  const hop=(el,f)=>setTimeout(()=>{ el.innerHTML=f; if(kind){ el.classList.remove("hop"); void el.offsetWidth; el.classList.add("hop"); } }, kind?Math.random()*350:0);
  S.faces.forEach((f,i)=>{ const el=$("f"+i); if(el) hop(el,f); }); S.stand.forEach((f,i)=>{ const el=$("s"+i); if(el) hop(el,f); });
}
// Le public part : d'abord ceux debout, puis des sièges au hasard
function leave(k){
  const out=[]; while(k>0&&S.stand.length){ S.stand.pop(); k--; out.push(null); }
  const seated=shuffle(S.seat.map((o,i)=>o?i:-1).filter(i=>i>=0)).slice(0,k);
  seated.forEach(i=>{ const el=$("f"+i); if(el) el.textContent="🚶"; S.seat[i]=false; });
  setTimeout(()=>{ S.faces=S.faces.map((f,i)=>S.seat[i]?f:""); redrawHall(); },800);
  return out.length+seated.length;
}
// Du monde arrive : on remplit les chaises, puis on se tient debout au fond
function join(){
  const empty=shuffle(S.seat.map((o,i)=>o?-1:i).filter(i=>i>=0));
  empty.forEach(i=>{ S.seat[i]=true; S.faces[i]="🏃"; });
  const extra=2+Math.floor(Math.random()*3); for(let i=0;i<extra&&S.stand.length<12;i++) S.stand.push("🏃");
  redrawHall();
  setTimeout(()=>{ S.faces=S.faces.map(f=>f==="🏃"?faceFor("applause"):f); S.stand=S.stand.map(f=>f==="🏃"?faceFor("applause"):f); redrawHall(); },700);
}
function prefChips(w){
  return Object.keys(REG).map(k=>{ const c=w[k]>=1.5?"love":w[k]<=.5?"hate":""; return `<span class="chip ${c}">${c==="love"?"♥ ":c==="hate"?"✕ ":""}${REG[k]}</span>`; }).join("");
}
const hardOf=p=>Object.keys(p.w).filter(k=>p.w[k]<=.5);
function dirLabel(k,plain){ const w=plain?1:S.pub.w[k], c=w<=.5?"hate":""; const arrow={u:"↑",d:"↓",l:"←",r:"→"}[k];
  const txt=plain?REG[k]:`${REG[k]}${c==="hate"?" ✕ difficile":""}`;
  return k==="l"||k==="r" ? `<div class="dl ${k} ${c}"><b>${arrow}</b><span>${txt}</span></div>` : `<div class="dl ${k} ${c}">${arrow} ${txt}</div>`; }
function render(){
  root.classList.remove("scroll","end");
  const [word]=S.deck[S.i];
  root.innerHTML=`
  <div class="hud"><span class="lbl">Ambiance</span><div class="meter"><i id="mood" style="width:${S.mood}%"></i></div></div>
  <div class="hud"><span class="lbl">${S.pub.name}</span><span class="lbl">Vanne ${S.i+1}/${JOKES}${S.combo>1?` · combo ×${S.combo}`:""}</span></div>
  <div class="set" aria-label="Progression du set">${[...Array(JOKES)].map((_,i)=>`<i id="sg${i}" class="${S.results[i]||(i===S.i?"now":"")}"></i>`).join("")}</div>
  ${hallHTML()}
  <div class="stage" id="stage"><div class="swipe">
    ${dirLabel("u")}${dirLabel("l")}
    <div class="card" id="card"><span class="eyebrow">Ta vanne sur…</span><span class="word">${word}</span><span class="tag" id="tag"></span></div>
    ${dirLabel("r")}${dirLabel("d")}
  </div></div>
  <div class="hint" id="hint">Swipe la carte pour choisir ton angle</div>`;
  bindCard();
}
function bindCard(){ bindSwipe($("card"),$("tag"),()=>S.phase==="swipe",choose); }
// swipe générique : onSwipe(direction) au-delà de 70 px, sinon la carte revient
function bindSwipe(card,tag,can,onSwipe){
  let x0=0,y0=0,drag=false;
  const dirOf=(dx,dy)=>Math.abs(dx)>Math.abs(dy)?(dx<0?"l":"r"):(dy<0?"u":"d");
  card.onpointerdown=e=>{ if(!can()) return; ac(); drag=true; x0=e.clientX; y0=e.clientY; card.setPointerCapture(e.pointerId); card.style.transition="none"; };
  card.onpointermove=e=>{ if(!drag) return; const dx=e.clientX-x0,dy=e.clientY-y0; card.style.transform=`translate(${dx}px,${dy}px) rotate(${dx/18}deg)`;
    const far=Math.hypot(dx,dy)>50; tag.textContent=far?REG[dirOf(dx,dy)]:""; tag.style.opacity=far?1:0; };
  card.onpointerup=card.onpointercancel=e=>{ if(!drag) return; drag=false; const dx=e.clientX-x0,dy=e.clientY-y0;
    if(Math.hypot(dx,dy)>70) onSwipe(dirOf(dx,dy)); else { card.style.transition="transform .2s"; card.style.transform=""; tag.style.opacity=0; } };
}
// carte d'exemple de l'accueil : se swipe sans lancer de mini-jeu
const DEMO_WORDS=["Un autre mot","Un autre autre mot","Mot 2","Mot 3","Mot 4 : word reborn","Mot 5 : rise of the motus","Mot 6 : j'en ai pas marre","Mot",
  "Mot #j'ai perdu le compte","¡ Una palabra !","Allez","Un mot","Votre doigt est musclé"];
let demoI=0, demoGo=null;
function bindDemo(){
  const card=$("democard"), tag=$("dtag"), w=$("dword"); let busy=false;
  demoGo=dir=>{ if(S.phase!=="menu"||busy) return; busy=true; SFX.swish();
    const v={l:[-1,0],r:[1,0],u:[0,-1],d:[0,1]}[dir];
    card.style.transition="transform .25s, opacity .25s"; card.style.transform=`translate(${v[0]*220}px,${v[1]*220}px) rotate(${v[0]*20}deg)`; card.style.opacity=0;
    setTimeout(()=>{ w.textContent=demoI<DEMO_WORDS.length?DEMO_WORDS[demoI]:"…"; demoI++; tag.style.opacity=0;
      card.style.transition="none"; card.style.transform="scale(.85)";
      requestAnimationFrame(()=>{ card.style.transition="transform .2s, opacity .2s"; card.style.transform=""; card.style.opacity=1; busy=false; }); },260); };
  bindSwipe(card,tag,()=>S.phase==="menu"&&!busy,demoGo);
}
function choose(dir){
  if(S.phase!=="swipe") return; S.phase="intro"; SFX.swish(); setFaces(null); root.classList.add("playing");
  const [word,fit,rh]=S.deck[S.i];
  S.dir=dir; const w=S.pub.w[dir]; const lvl=w<=.5?2:1; S.lvl=lvl; S.fit=fit===dir;
  const speed=1+S.combo*.05+S.i*.02;
  const stage=$("stage");
  stage.innerHTML=`<div class="splash"><div>${ORDER[dir]}<small>${["facile","normal","difficile"][lvl]} · ${SUB[dir]}</small></div></div><div class="game" id="game"></div>`;
  $("hint").textContent=REG[dir];
  setTimeout(()=>{ S.phase="game"; const g=$("game"); S.cleanup=GAMES[dir](g,{lvl,speed,word,rh},finish); },700);
}

/* ---------- Mini-jeux : chacun appelle done(note 0..1, détail) ---------- */
const GAMES={
  // Pince-sans-rire : 1, 2 ou 3 jauges « ba-dum-tss » d'affilée
  l(el,{lvl,speed,word},done){
    const n=lvl+1, notes=[], errs=[]; let k=0, stop=()=>{};
    const q=d=>d<=1?1-.35*d:Math.max(0,.65-.45*(d-1));
    const hint=$("hint");
    const gauge=()=>{
      const tc=.64+Math.random()*.24, tw=.16, ac0=.1+Math.random()*.34, aw=.11;
      el.innerHTML=`<div class="drum" id="drum">🥁</div>${n>1?`<div class="gtitle">Jauge ${k+1}/${n}</div>`:""}
        <div class="legend"><span>← …Tss ! (chute)</span><span>Ba-dum (pause) →</span></div>
        <div class="bar"><div class="fill" id="gf"></div><div class="zone a" style="left:${(ac0-aw/2)*100}%;width:${aw*100}%"></div>
        <div class="zone p" style="left:${(tc-tw/2)*100}%;width:${tw*100}%"></div><div class="cursor" id="gc"></div></div>`;
      hint.textContent="Tape « Ba-dum » quand le curseur est dans la zone verte";
      let phase="power",pos=0,power=0,last=performance.now(),raf,over=false; const v=1.05*speed;
      const endG=acc=>{ if(over) return; over=true; cancelAnimationFrame(raf); off();
        const pd=Math.abs(power-tc)/(tw/2), ad=Math.abs(acc-ac0)/(aw/2); notes.push((q(pd)+q(ad))/2); errs.push((power-tc)/(tw/2)); k++;
        if(k<n) setTimeout(gauge,350); else { const avg=notes.reduce((a,b)=>a+b,0)/n, e=errs.reduce((a,b)=>a+b,0)/n;
          const pause=e>1?"<br><br>":e<-1?"":avg>=.6?"… ":" "; const q=pick(QUALS);
          PUNCH=pause==="… "?pick([`${word}… ${q}`,`${word}. Bon. … ${q}`,`J'ai essayé ${def(word)}… ${q}`,`${word}… ${q}, sans plus`]):`${word}${pause}${q}`; done(avg, n>1?`${n} jauges, précision ${Math.round(avg*100)} %`:power>=.99?"Pause interminable…":""); } };
      const hit=()=>{ const d=$("drum"); d.classList.remove("hit"); void d.offsetWidth; d.classList.add("hit"); };
      const tap=()=>{ if(over) return; hit(); if(phase==="power"){ power=pos; phase="back"; SFX.badum(); $("drum").textContent="🥁…"; $("gf").style.width=(power*100)+"%"; hint.textContent="…et tape « Tss ! » sur la zone dorée"; } else { SFX.tss(); $("drum").textContent="🥁💥"; endG(pos); } };
      const loop=now=>{ const dt=(now-last)/1000; last=now;
        if(phase==="power"){ pos+=v*dt; if(pos>=1){ pos=1; power=1; phase="back"; $("gf").style.width="100%"; hint.textContent="Trop long ! Rattrape la chute"; } }
        else { pos-=v*1.35*dt; if(pos<=-.04){ endG(-.04); return; } }
        $("gc").style.left=(clamp(pos,0,1)*100)+"%"; raf=requestAnimationFrame(loop); };
      raf=requestAnimationFrame(loop);
      const pd=e=>{ e.preventDefault(); tap(); }, kd=e=>{ if(e.key===" "||e.key==="Enter"){ e.preventDefault(); tap(); } };
      const off=()=>{ document.removeEventListener("pointerdown",pd); document.removeEventListener("keydown",kd); };
      setTimeout(()=>{ if(!over){ document.addEventListener("pointerdown",pd); document.addEventListener("keydown",kd); } },60);
      stop=()=>{ over=true; cancelAnimationFrame(raf); off(); };
    };
    gauge();
    return ()=>stop();
  },

  // Lyrique : mémoriser 1, 2 ou 3 sigles, puis les redessiner dans l'ordre
  r(el,{lvl,speed,word},done){
    const SH={
      "spirale":t=>{const r=.06+.36*t,a=t*Math.PI*4;return[.5+r*Math.cos(a),.5+r*Math.sin(a)];},
      "étoile":poly([...Array(6)].map((_,k)=>{const a=(-90+144*k)*Math.PI/180;return[.5+.42*Math.cos(a),.52+.42*Math.sin(a)];})),
      "cœur":t=>{const a=t*Math.PI*2,x=16*Math.sin(a)**3,y=13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a);return[.5+x/40,.47-y/40];},
      "éclair":poly([[.62,.06],[.3,.52],[.58,.5],[.36,.94]]),
      "infini":t=>{const a=t*Math.PI*2,s=1+Math.sin(a)**2;return[.5+.42*Math.cos(a)/s,.5+.42*Math.sin(a)*Math.cos(a)/s];},
      "vague":t=>[.08+.84*t,.5+.25*Math.sin(t*Math.PI*3)],
      "triangle":poly([[.5,.08],[.92,.86],[.08,.86],[.5,.08]]),
      "tasse":poly([[.1,.2],[.16,.84],[.58,.84],[.62,.66],[.76,.72],[.9,.64],[.93,.48],[.86,.36],[.74,.34],[.64,.4],[.66,.2]]),
    };
    const n=lvl+1, names=shuffle(Object.keys(SH)).slice(0,n), tpls=names.map(nm=>[...Array(80)].map((_,i)=>SH[nm](i/79)));
    el.innerHTML=`<div class="gtitle" id="gt">✍️ Mémorise ${n>1?`ces ${n} symboles`:"ce symbole"}…</div><canvas id="cv"></canvas><div class="timer"><i id="tm"></i></div>`;
    $("hint").textContent=n>1?"Ils vont disparaître : redessine-les dans l'ordre, un trait chacun":"Il va disparaître : redessine-le de mémoire, d'un seul trait";
    const cv=$("cv"),ctx=cv.getContext("2d"),dpr=devicePixelRatio||1; fitCanvas(cv,1); const W=cv.clientWidth,H=cv.clientHeight; cv.width=W*dpr; cv.height=H*dpr; ctx.scale(dpr,dpr);
    const M=1+.4*(n-1), T=(3.6*n)/speed, tol=.1;
    const stroke=(pts,X,Y,S,col,lw)=>{ ctx.strokeStyle=col; ctx.lineWidth=lw; ctx.beginPath(); pts.forEach((p,i)=>{const x=X+p[0]*S,y=Y+p[1]*S; i?ctx.lineTo(x,y):ctx.moveTo(x,y);}); ctx.stroke(); };
    const side=Math.min(W,H)*.92, ox=(W-side)/2, oy=(H-side)/2;
    const strokes=[], notes=[]; let cur=null,over=false,memo=true,t0=performance.now(),raf;
    const norm=arr=>{ const xs=arr.map(p=>p[0]),ys=arr.map(p=>p[1]); const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
      const s=Math.max(x1-x0,y1-y0)||1,cx=(x0+x1)/2,cy=(y0+y1)/2; return arr.map(p=>[(p[0]-cx)/s+.5,(p[1]-cy)/s+.5]); };
    const dist=(p,arr)=>Math.min(...arr.map(q=>Math.hypot(p[0]-q[0],p[1]-q[1])));
    const grade=(tpl,dr)=>{ if(dr.length<5) return 0; const A=norm(tpl),B=norm(dr);
      const cov=A.filter(p=>dist(p,B)<tol).length/A.length, prec=B.filter(p=>dist(p,A)<tol).length/B.length; return clamp((cov*.6+prec*.4-.15)/.8,0,1); };
    const draw=now=>{ const el2=(now-t0)/1000; ctx.clearRect(0,0,W,H); ctx.lineCap=ctx.lineJoin="round";
      if(el2<M){ const cell=Math.min(W/n,H)*.9; tpls.forEach((tp,i)=>{ const X=(W/n)*i+(W/n-cell)/2, Y=(H-cell)/2; stroke(tp,X,Y,cell,"#ffc23d",n>1?7:10);
          if(n>1){ ctx.fillStyle="#fbeee4"; ctx.font="bold 16px system-ui"; ctx.textAlign="center"; ctx.fillText(i+1,X+cell/2,Y+cell+4); } });
        $("tm").style.width=clamp(100-el2/M*100,0,100)+"%"; }
      else { if(memo){ memo=false; SFX.tick(); label(); }
        if(n>1){ const cell=Math.min(W/n,H)*.9; for(let i=0;i<n;i++){ const X=(W/n)*i+(W/n-cell)/2, Y=(H-cell)/2; ctx.fillStyle=i<strokes.length?"rgba(251,238,228,.3)":i===strokes.length?"#ffc23d":"#fbeee4"; ctx.font="bold 16px system-ui"; ctx.textAlign="center"; ctx.fillText(i+1,X+cell/2,Y+cell+4); } }
        strokes.forEach(s=>stroke(s,ox,oy,side,"rgba(251,238,228,.25)",5)); if(cur) stroke(cur,ox,oy,side,"#fbeee4",6);
        const e2=el2-M; $("tm").style.width=clamp(100-e2/T*100,0,100)+"%"; if(e2>=T){ end(); return; } }
      raf=requestAnimationFrame(draw); };
    const label=()=>{ $("gt").textContent=n>1?`🎤 Symbole ${strokes.length+1}/${n}`:"🎤 À toi ! Redessine-le"; };
    raf=requestAnimationFrame(draw);
    const end=()=>{ if(over) return; over=true; cancelAnimationFrame(raf);
      while(notes.length<n) notes.push(grade(tpls[notes.length],strokes[notes.length]||[]));
      const avg=notes.reduce((a,b)=>a+b,0)/n; const objs=names.map((nm,i)=>notes[i]>=.35?SHAPE_ART[nm]:"un gribouillis"), obj=objs.length>1?objs.slice(0,-1).join(", ")+" et "+objs[objs.length-1]:objs[0], W=cap(def(word));
      const d=def(word), tpl=[`${W}, c'est comme ${obj}`,`${W} n'a rien à voir avec ${obj}`,`${W} est ${obj} avec un chapeau rigolo`,
        `On m'a dit ${que(d)} était ${obj}. Je ne l'ai jamais oublié`,`Sans ${obj}, ${d} ne serait rien`,
        ...(n===1?[`Personne ne parle du lien entre ${d} et ${obj}. Moi si`]:[`Personne ne parle du lien entre ${d}, ${obj}. Moi si`]),`${W} le matin, ${obj} le soir`];
      if(n===1){ const ok1=notes[0]>=.35, nm=ok1?names[0]:"gribouillis"; tpl.push(`Mon psy dit ${que(d)}, c'est ${poss(nm,ok1&&SHAPE_FEM.has(nm),"intérieur")}`); }
      PUNCH=pick(tpl)+(avg<.35?pick([", j'ai pas raison ?",", vous voyez ce que je veux dire ?","… Bon. Passons.",", c'était mieux dans ma tête"]):""); done(avg, `Ressemblance : ${Math.round(avg*100)} %`); };
    const toU=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left-ox)/side,(e.clientY-r.top-oy)/side];};
    cv.onpointerdown=e=>{ if(over||memo) return; cv.setPointerCapture(e.pointerId); cur=[toU(e)]; };
    cv.onpointermove=e=>{ if(cur) cur.push(toU(e)); };
    cv.onpointerup=cv.onpointercancel=()=>{ if(!cur) return; strokes.push(cur); notes.push(grade(tpls[strokes.length-1],cur)); cur=null;
      if(strokes.length>=n) end(); else { SFX.tick(); label(); } };
    return ()=>{ over=true; cancelAnimationFrame(raf); };
  },

  // Trash : billard. Facile = une boule proche ; normal = toucher une boule, la 8 vaut l'ovation ; dur = empocher une boule
  d(el,{lvl,speed,word},done){
    const titles=["🎱 Touche la boule","🎱 Vise la 8 !","🎱 Empoche une boule !"];
    const hints=["Tape pour tirer quand la visée est bonne. En plein centre = ovation",
      "Boule colorée = rires, la 8 = ovation, rien = bide","Fais tomber une boule dans un trou de coin"];
    el.innerHTML=`<div class="gtitle">${titles[lvl]}</div><canvas id="cv"></canvas><div class="timer"><i id="tm"></i></div>`;
    $("hint").textContent=hints[lvl];
    const cv=$("cv"),ctx=cv.getContext("2d"),dpr=devicePixelRatio||1; fitCanvas(cv,4/5); const W=cv.clientWidth,H=cv.clientHeight; cv.width=W*dpr; cv.height=H*dpr; ctx.scale(dpr,dpr);
    const u=W/320, R=16*u, r=10*u, B=6*u, P=42*u, L={x:W/2,y:H-24*u};
    const rx=(m=0)=>R+B+m+Math.random()*(W-2*(R+B+m));
    let balls=[];
    if(lvl===0) balls=[{n:3,c:"#d62828",x:rx(),y:H*(.15+Math.random()*.15)}];
    else if(lvl===1){ balls=[{n:8,c:"#111",x:rx(),y:H*.15+R},{n:3,c:"#d62828",x:0,y:0},{n:2,c:"#1d4ed8",x:0,y:0}];
      for(const b of balls.slice(1)){ let k=0; do{ b.x=rx(); b.y=H*(.3+Math.random()*.22); k++; } while(k<50&&balls.some(o=>o!==b&&o.x&&Math.hypot(o.x-b.x,o.y-b.y)<2*R+30*u)); } }
    else balls=[{n:5,c:"#f77f00",x:rx(W*.12),y:H*(.3+Math.random()*.2)}];
    const pockets=lvl===2?[[B,B],[W-B,B],[B,H-B],[W-B,H-B]]:[];
    balls.forEach(b=>{b.vx=0;b.vy=0;});
    let scratch=false,tShot=0,aim=null,cue=null,shot=false,over=false,hitB=null,hitOff=1,potted=false,tHit=0,t0=performance.now(),raf,last=t0; const T=5/speed;
    const ball=(x,y,rad,col,n)=>{ ctx.fillStyle=col; ctx.beginPath(); ctx.arc(x,y,rad,0,7); ctx.fill();
      if(n){ ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(x,y,rad*.48,0,7); ctx.fill(); ctx.fillStyle="#111"; ctx.font=`bold ${rad*.7}px system-ui`; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(n,x,y+1); }
      ctx.fillStyle="rgba(255,255,255,.35)"; ctx.beginPath(); ctx.arc(x-rad*.35,y-rad*.4,rad*.22,0,7); ctx.fill(); };
    const loop=now=>{ const dt=Math.min(.033,(now-last)/1000); last=now;
      if(!shot){ const a=Math.sin((now-t0)/1000*2.4*speed)*1.2; aim={dx:Math.sin(a),dy:-Math.cos(a)}; }
      ctx.fillStyle="#1f6b3a"; ctx.fillRect(0,0,W,H); ctx.strokeStyle="#5a2a14"; ctx.lineWidth=B*2; ctx.strokeRect(0,0,W,H);
      pockets.forEach(([x,y])=>{ ctx.fillStyle="#050505"; ctx.beginPath(); ctx.arc(x,y,P,0,7); ctx.fill(); });
      for(const b of balls){ if(b.gone) continue;
        if(b.vx||b.vy){ b.x+=b.vx*dt; b.y+=b.vy*dt; const f=Math.pow(.55,dt); b.vx*=f; b.vy*=f;
          if(pockets.some(([x,y])=>Math.hypot(b.x-x,b.y-y)<P)){ b.gone=true; potted=true; SFX.tick(); resolve(); continue; }
          if(b.x<R+B){b.x=R+B;b.vx*=-.9;} if(b.x>W-R-B){b.x=W-R-B;b.vx*=-.9;} if(b.y<R+B){b.y=R+B;b.vy*=-.9;} if(b.y>H-R-B){b.y=H-R-B;b.vy*=-.9;}
          if(pockets.some(([x,y])=>Math.hypot(b.x-x,b.y-y)<P)){ b.gone=true; potted=true; SFX.tick(); resolve(); }
          if(Math.hypot(b.vx,b.vy)<15*u){ b.vx=b.vy=0; } }
        if(!b.gone) ball(b.x,b.y,R,b.c,b.n); }
      if(aim&&!shot){ ctx.strokeStyle="rgba(255,255,255,.7)"; ctx.setLineDash([6,8]); ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(L.x,L.y); ctx.lineTo(L.x+aim.dx*140*u,L.y+aim.dy*140*u); ctx.stroke(); ctx.setLineDash([]); }
      if(!shot) ball(L.x,L.y,r,"#f5f5f0");
      if(cue){ const f=Math.pow(.55,dt); cue.vx*=f; cue.vy*=f;
        // sous-pas : la blanche n'avance jamais de plus d'un demi-rayon à la fois, pour ne pas traverser une boule
        const steps=Math.max(1,Math.ceil(Math.hypot(cue.vx,cue.vy)*dt/(r*.5)));
        for(let st=0;st<steps&&cue;st++){ cue.x+=cue.vx*dt/steps; cue.y+=cue.vy*dt/steps;
          if(cue.x<r+B){cue.x=r+B;cue.vx*=-.9;} if(cue.x>W-r-B){cue.x=W-r-B;cue.vx*=-.9;} if(cue.y<r+B){cue.y=r+B;cue.vy*=-.9;} if(cue.y>H-r-B){cue.y=H-r-B;cue.vy*=-.9;}
          if(pockets.some(([x,y])=>Math.hypot(cue.x-x,cue.y-y)<P)){ scratch=true; cue=null; SFX.awkward(); resolve(); break; }
          const h=balls.find(b=>!b.gone&&Math.hypot(b.x-cue.x,b.y-cue.y)<R+r);
          if(h){ const dd=Math.hypot(h.x-cue.x,h.y-cue.y)||1, nx=(h.x-cue.x)/dd, ny=(h.y-cue.y)/dd;
            const vrel=(cue.vx-h.vx)*nx+(cue.vy-h.vy)*ny;
            cue.x=h.x-nx*(R+r); cue.y=h.y-ny*(R+r);
            if(vrel>0){ const k=hitB?1:1.15; cue.vx-=vrel*nx; cue.vy-=vrel*ny; h.vx+=vrel*nx*k; h.vy+=vrel*ny*k; SFX.tick();
              if(!hitB){ const sp=Math.hypot(cue.vx+vrel*nx,cue.vy+vrel*ny)||1; hitOff=Math.abs(((cue.vx+vrel*nx)*ny-(cue.vy+vrel*ny)*nx)/sp);
                hitB=h; tHit=now; if(lvl<2) setTimeout(resolve,650); } } } }
        if(cue){ if(Math.hypot(cue.vx,cue.vy)<10*u){ cue.vx=cue.vy=0; }
          ball(cue.x,cue.y,r,"#f5f5f0");
          if(!hitB&&(Math.hypot(cue.vx,cue.vy)<60*u||now-tShot>2500)) resolve(); } }
      if(lvl===2&&hitB&&!potted&&(now-tHit>3500||(hitB.vx===0&&hitB.vy===0&&now-tHit>300))) resolve();
      if(!shot){ $("tm").style.width=clamp(100-(now-t0)/1000/T*100,0,100)+"%"; if((now-t0)/1000>=T){ over=true; PUNCH=pick([`${word} 😇`,`Ah, ${def(word)}… 😇`]); done(0,"Tu as hésité, ils t'ont oublié"); return; } }
      if(over) return; raf=requestAnimationFrame(loop); };
    raf=requestAnimationFrame(loop);
    let resolved=false;
    function resolve(){ if(resolved) return; resolved=true; setTimeout(()=>{ over=true; cancelAnimationFrame(raf);
      const P=e=>PUNCH=pick([`${word} ${e}`,`${word}, si vous voyez ce que je veux dire ${e}`,`Ah, ${def(word)}… ${e}`,`Parlons ${deDef(word)} ${e}`]);
      if(scratch) return P("😈😈😈"),done(0,"Faute : la blanche est tombée dans un trou");
      if(!hitB) return P("😇"),done(0,"Aucune boule touchée : bide");
      if(lvl===0) return P(hitOff<.35?"🤤":"😏"),done(hitOff<.35?1:.7, hitOff<.35?"En plein centre !":"Touchée, de biais");
      if(lvl===1) return P(hitB.n===8?"🤤":"😏"),hitB.n===8?(SFX.boom(),done(1,"La 8 ! La salle explose")):done(.7,`La ${hitB.n} : ça passe`);
      return P(potted?"🤤":"😉"),potted?(SFX.boom(),done(1,"Empochée ! La salle explose")):done(.4,"Touchée, mais pas empochée"); }, lvl===2?400:0); }
    const fire=()=>{ if(!aim||shot||over) return; shot=true; SFX.swish(); cue={x:L.x,y:L.y,vx:aim.dx*1100*u,vy:aim.dy*1100*u}; tShot=performance.now(); };
    const pd=e=>{ e.preventDefault(); fire(); }, kd=e=>{ if(e.key===" "||e.key==="Enter"){ e.preventDefault(); fire(); } };
    setTimeout(()=>{ document.addEventListener("pointerdown",pd); document.addEventListener("keydown",kd); },60);
    return ()=>{ over=true; cancelAnimationFrame(raf); document.removeEventListener("pointerdown",pd); document.removeEventListener("keydown",kd); };
  },

  // Absurde : 2, 4 ou 6 mots, un seul rime avec le setup
  u(el,{lvl,speed,word,rh},done){
    const n=[2,4,6][lvl], good=pick(RHYMES[rh]), bad=shuffle(Object.keys(RHYMES).filter(k=>k!==rh)).slice(0,n-1).map(k=>pick(RHYMES[k]));
    const opts=shuffle([good,...bad]); const T=(2.4+.4*lvl)/speed; let over=false,raf,t0=performance.now();
    el.innerHTML=`<div class="gtitle">🤪 Lequel rime ?</div><div class="setup">${word}… 🎵</div><div class="timer"><i id="tm"></i></div>
      <div class="opts">${opts.map((o,i)=>`<button class="opt" id="opt-${i}" data-i="${i}">${o}</button>`).join("")}</div>`;
    $("hint").textContent=`Un seul mot rime. Touche-le vite (touches 1-${n})`;
    const end=i=>{ if(over) return; over=true; cancelAnimationFrame(raf); const el2=(performance.now()-t0)/1000;
      el.querySelectorAll(".opt").forEach((b,j)=>{ if(opts[j]===good) b.classList.add("ok"); else if(j===i) b.classList.add("ko"); });
      const ok=i!=null&&opts[i]===good;
      const w2=i==null?"rien":opts[i];
      // deux vers : le setup finit le premier, la rime finit le second
      const d=def(word), lw=(ART[word]??"")===""?word:low(word), iw=indef(w2), mw=i==null?"rien":low(w2);
      PUNCH=ok?pick([
          `Ô divine splendeur ${deDef(word)},<br>Tu as l'éclat ${deIndef(w2)} !`,
          `${word}, ${lw}, ${lw}…<br>N'es-tu que l'ombre ${deIndef(w2)} ?`,
          `À la gloire ${deDef(word)},<br>J'invoque le courroux ${deIndef(w2)}`,
          `Mon amour, ô ${lw},<br>Je t'offre ${iw}`,
          `Le soir tombe sur ${d},<br>L'aube se lève sur ${iw}`,
          `J'ai traversé les mers pour ${d},<br>Je n'ai trouvé ${que(iw)}`,
          `Qu'on grave dans le marbre ${d},<br>Pour l'éternité, ${iw}`,
          `Ô muse, chante ${d},<br>Chante aussi ${iw} !`])
        :pick([`${word} tralala ${mw}`,`Non attendez… ${lw}… euh… ${mw} ?`,`J'ai vérifié : ${lw} rime avec ${mw}`,`C'est de la poésie : ${lw}… ${mw}`]);
      setTimeout(()=>done(ok?(el2/T<.4?1:.7):0, ok?"":i==null?"Trop lent, le silence s'installe":`« ${opts[i]} » ne rimait pas`),350); };
    el.querySelectorAll(".opt").forEach(b=>b.onpointerdown=e=>{ e.preventDefault(); end(+b.dataset.i); });
    const kd=e=>{ const k=+e.key; if(k>=1&&k<=n) end(k-1); }; document.addEventListener("keydown",kd);
    const loop=now=>{ const el2=(now-t0)/1000; $("tm").style.width=clamp(100-el2/T*100,0,100)+"%"; if(el2>=T){ end(null); return; } raf=requestAnimationFrame(loop); };
    raf=requestAnimationFrame(loop);
    return ()=>{ over=true; cancelAnimationFrame(raf); document.removeEventListener("keydown",kd); };
  },
};
// garde des proportions fixes (largeur/hauteur) quelle que soit la taille d'écran
function fitCanvas(cv,ratio){ const W0=cv.clientWidth,H0=cv.clientHeight; let w=W0,h=w/ratio; if(h>H0){ h=H0; w=h*ratio; }
  cv.style.flex="none"; cv.style.width=Math.floor(w)+"px"; cv.style.height=Math.floor(h)+"px"; cv.style.alignSelf="center"; }
function poly(pts){ const segs=[]; let tot=0; for(let i=1;i<pts.length;i++){ const l=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]); segs.push(l); tot+=l; }
  return t=>{ let d=t*tot; for(let i=0;i<segs.length;i++){ if(d<=segs[i]||i===segs.length-1){ const k=segs[i]?Math.min(1,d/segs[i]):0; return[pts[i][0]+(pts[i+1][0]-pts[i][0])*k,pts[i][1]+(pts[i+1][1]-pts[i][1])*k]; } d-=segs[i]; } }; }

/* ---------- Réaction du public ---------- */
function finish(note,detail=""){
  root.classList.remove("playing");
  const punch=PUNCH; PUNCH="";
  if(S.phase!=="game") return; S.phase="react"; if(S.cleanup) S.cleanup();
  const [,fit]=S.deck[S.i]; let r;
  if(note>=.85) r={k:"applause",e:"👏",t:"Ovation !",pts:300,mood:18,c:"var(--gold)"};
  else if(note>=.6) r={k:"laugh",e:"😂",t:"Rires",pts:150,mood:10,c:"var(--good)"};
  else if(note>=.35) r={k:"awkward",e:"😬",t:"Sourire gêné",pts:30,mood:-6,c:"var(--meh)"};
  else if(S.dir==="d"||S.dir==="u") r={k:"boo",e:"🍅",t:"Huées !",pts:0,mood:-12,c:"var(--bad)"};
  else r={k:"crickets",e:"🦗",t:"Silence…",pts:0,mood:-14,c:"var(--meh)"};
  if(r.pts>=150) S.combo++; else S.combo=0;
  const lm=[1,1.5,2][S.lvl];
  S.score+=Math.round(r.pts*lm*(1+Math.max(0,S.combo-1)*.5)); S.mood=clamp(S.mood+r.mood,0,100);
  SFX[r.k](); setFaces(r.k); S.results[S.i]=r.k; S.punches[S.i]={word:S.deck[S.i][0],dir:S.dir,punch,k:r.k}; const sg=$("sg"+S.i); if(sg) sg.className=r.k;
  let crowd="";
  if(r.k==="boo"&&++S.boos%2===0){ const here=S.seat.filter(Boolean).length+S.stand.length; const n=leave(Math.max(3,Math.round(here*(.4+Math.random()*.2)))); crowd=`${n} spectateur·ices quittent la salle`; }
  if(r.k==="applause"&&++S.ovs%2===0){ join(); crowd=`Salle comble : ${S.stand.length} personnes debout au fond`; }
  const tip="";
  $("stage").insertAdjacentHTML("beforeend",`<div class="react"><b class="rt" style="color:${r.c}">${r.t}</b>${detail?`<em>${detail}</em>`:""}${tip?`<em>${tip}</em>`:""}${crowd?`<em>${crowd}</em>`:""}${punch?`<div class="bubble">${punch}</div>`:""}</div>`);
  $("mood").style.width=S.mood+"%";
  const g=$("game"); if(g) g.style.opacity=".12";
  const last=empty()||S.i+1>=JOKES, nb=document.createElement("button");
  nb.className="big next"; nb.id="next"; nb.textContent=last?"Voir le bilan":"Blague suivante"; nb.disabled=true; nb.onclick=nextJoke;
  document.querySelector(".react").appendChild(nb); setTimeout(()=>{ nb.disabled=false; },450);
}
function empty(){ return S.seat.every(o=>!o)&&!S.stand.length; }
function nextJoke(){
  const nb=$("next"); if(S.phase!=="react"||!nb||nb.disabled) return; S.phase="next";
  S.i++; if(empty()||S.i>=JOKES) end(); else { S.phase="swipe"; render(); }
}
function updateMute(){ const b=$("mute"); if(!b) return; b.textContent=MUTED?"🔇":"🔊"; b.setAttribute("aria-label",MUTED?"Activer le son":"Couper le son"); b.setAttribute("aria-pressed",MUTED?"true":"false"); }
$("mute").onclick=()=>{ MUTED=!MUTED; try{ localStorage.setItem("sus-muted",MUTED?"1":"0"); }catch(e){} if(MUTED&&AC) AC.suspend(); updateMute(); };
updateMute();
const KEMO={applause:"👏",laugh:"😂",awkward:"😬",crickets:"🦗",boo:"🍅"};
const plain=h=>h.replace(/<br\s*\/?>/g," / ").replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim();
// texte du set à partager : titre, réactions et punchs
function setText(rank){
  const lines=S.punches.map((p,i)=>`${i+1}. ${KEMO[p.k]} ${p.punch?plain(p.punch):"…"}`);
  return `🎤 Mon set au ${S.pub.name} : ${rank}\n${S.results.map(k=>KEMO[k]).join("")}\n\n${lines.join("\n")}\n\nStand-upper Simulator : https://grdscrc.github.io/stand-upper-simulator.html`;
}
async function shareSet(rank){
  const text=setText(rank), msg=$("shared");
  const show=t=>{ msg.textContent=t; msg.hidden=false; };
  try{ if(navigator.share){ await navigator.share({title:"Mon set de stand-up",text}); return; } }catch(e){ if(e&&e.name==="AbortError") return; }
  try{ await navigator.clipboard.writeText(text); show("Set copié : colle-le où tu veux."); }
  catch(e){ show("Copie impossible ici. Sélectionne le texte du set ci-dessus."); const d=document.querySelector(".setlist"); if(d) d.open=true; }
}
function end(){
  root.classList.add("scroll"); root.scrollTop=0;
  S.phase="end"; const off=empty();
  const cnt=k=>S.results.filter(x=>x===k).length, ratio=(cnt("applause")*2+cnt("laugh"))/(2*JOKES);
  const [rank,sub]=off?["Salle vidée","Le public est parti avant la fin du set. Ça arrive aux meilleur·es."]
    :ratio>=.7?["Tête d'affiche","Le public repartira en citant tes vannes."]
    :ratio>=.5?["Prêt·e pour le plateau","Un set solide, les programmateur·ices prennent note."]
    :ratio>=.3?["Belle soirée sur scène","Des vrais rires et quelques moments en or."]
    :ratio>=.15?["Des pépites à polir","Le matériau est là, le timing viendra."]
    :["Set de rodage","Chaque bide nourrit le prochain set."];
  // camembert des réactions (couleurs de la barre du set)
  const KINDS=[["applause","👏","Ovations","#ffc23d"],["laugh","😂","Rires","#5ee08a"],["awkward","😬","Sourires gênés","#9aa3b5"],["crickets","🦗","Silences","#5b6272"],["boo","🍅","Huées","#ff5a4e"]].filter(([k])=>cnt(k));
  const tot=S.results.length||1; let acc=0;
  const arc=(f0,f1)=>{ const p=f=>[50+46*Math.sin(2*Math.PI*f),50-46*Math.cos(2*Math.PI*f)]; const [x0,y0]=p(f0),[x1,y1]=p(f1);
    return f1-f0>=.999?`<circle cx="50" cy="50" r="46"`:`<path d="M50 50L${x0.toFixed(2)} ${y0.toFixed(2)}A46 46 0 ${f1-f0>.5?1:0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z"`; };
  const pie=KINDS.map(([k,,,c])=>{ const f0=acc/tot; acc+=cnt(k); return `${arc(f0,acc/tot)} fill="${c}" stroke="#14060b" stroke-width="1.5"/>`; }).join("");
  const legend=KINDS.map(([k,e,l,c])=>`<li><i style="background:${c}"></i>${e} ${l}<b>${cnt(k)}</b></li>`).join("");
  root.classList.add("end");
  root.innerHTML=`<h1>Stand-upper Simulator</h1><div class="menu recap">
    <p class="lbl" style="text-align:center">${S.pub.name}</p>
    <div class="rank">${rank}</div><p class="sub">${sub}</p>
    <div class="pie"><svg viewBox="0 0 100 100" role="img" aria-label="Répartition des réactions">${pie}</svg><ul>${legend}</ul></div>
    <div class="set">${S.results.map(k=>`<i class="${k}"></i>`).join("")}</div>
    <details class="setlist"><summary>Ton set, vanne par vanne</summary><ol>${S.punches.map(p=>`<li><span class="k">${KEMO[p.k]}</span><span>${p.punch||"<em>(pas de punch)</em>"}</span></li>`).join("")}</ol></details>
    <button class="big" id="share">Partager mon set</button><p class="shared" id="shared" hidden></p>
    <button class="pub" id="again"><strong>Rejouer ce public</strong><small>Même salle, nouveaux mots</small></button><button class="pub" id="back"><strong>Changer de public</strong><small>Retour au choix de salle</small></button></div>`;
  const pub=S.pub; $("again").onclick=()=>start(pub); $("back").onclick=menu;
  $("share").onclick=()=>shareSet(rank);
}
document.addEventListener("keydown",e=>{
  const ka={ArrowLeft:"l",ArrowRight:"r",ArrowUp:"u",ArrowDown:"d"}[e.key];
  if(S.phase==="menu"&&ka&&demoGo&&!e.target.closest?.("button")){ e.preventDefault(); ac(); demoGo(ka); return; }
  if(S.phase==="react"&&(e.key==="Enter"||e.key===" ")){ e.preventDefault(); nextJoke(); return; }
  const m={ArrowLeft:"l",ArrowRight:"r",ArrowUp:"u",ArrowDown:"d"};
  if(S.phase==="swipe"&&m[e.key]){ e.preventDefault(); ac(); choose(m[e.key]); }
});
menu();
