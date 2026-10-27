/* ============ карусель проектов: объекты на кольце, прокрутка выбирает проект ============ */
(function(){
if(!window.THREE) return;   // CDN недоступен — остальной сайт работает без карусели

const room=$("room"), canvas=$("c3d");
const N=OBJ.length, STEP=Math.PI*2/N, R=6;
room.style.height=(100+(N-1)*70)+"vh";   // ~70vh прокрутки на проект

const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, COARSE?1.5:2));
const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0x0E0E12,0.05);
const camera=new THREE.PerspectiveCamera(46,1,.1,120);

const world=new THREE.Group(); scene.add(world);
const ring=new THREE.Group(); world.add(ring);

// свет
const ambient=new THREE.AmbientLight(0xffffff,.10); scene.add(ambient);
const cursorLight=new THREE.PointLight(0xFFB35C,1.6,26,2); scene.add(cursorLight);
const fillLight=new THREE.PointLight(0xB8D8FF,.35,40,2); fillLight.position.set(-8,7,10); scene.add(fillLight);

// пол
const floor=new THREE.Mesh(new THREE.PlaneGeometry(80,80),
  new THREE.MeshStandardMaterial({color:0x0a0a0d,roughness:.75,metalness:.25}));
floor.rotation.x=-Math.PI/2; floor.position.y=-2.6; world.add(floor);
const grid=new THREE.GridHelper(80,80,0x1a1a22,0x14141a);
grid.position.y=-2.59; world.add(grid);
// световое кольцо на полу — «рельс» карусели
const rail=new THREE.Mesh(new THREE.RingGeometry(R-.02,R+.02,128),
  new THREE.MeshBasicMaterial({color:0xFFB35C,transparent:true,opacity:.25,side:THREE.DoubleSide}));
rail.rotation.x=-Math.PI/2; rail.position.y=-2.58; world.add(rail);

// текстура свечения для спрайтов
function glowTex(){
  const c=document.createElement("canvas");c.width=c.height=128;const g=c.getContext("2d");
  const rg=g.createRadialGradient(64,64,0,64,64,64);
  rg.addColorStop(0,"rgba(255,255,255,1)");rg.addColorStop(.25,"rgba(255,255,255,.45)");
  rg.addColorStop(1,"rgba(255,255,255,0)");
  g.fillStyle=rg;g.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(c);
}
const GT=glowTex();
function addGlow(parent,color,size,op){
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:GT,color,transparent:true,opacity:op||.5,
    blending:THREE.AdditiveBlending,depthWrite:false}));
  s.scale.set(size,size,1);parent.add(s);return s;
}
// подпись-текстура (обновляется при смене языка)
const redraw=[];
function makeLabel(parent,getText,y){
  const c=document.createElement("canvas");c.width=768;c.height=64;
  const tex=new THREE.CanvasTexture(c);
  const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,opacity:0,depthWrite:false}));
  spr.scale.set(4.8,.4,1);spr.position.y=y;parent.add(spr);
  function draw(){const g=c.getContext("2d");g.clearRect(0,0,768,64);
    const txt=getText().toUpperCase();let fs=26;
    do{g.font=`500 ${fs}px 'JetBrains Mono',monospace`;}while(g.measureText(txt).width>740&&--fs>12);  // длинное имя папки — мельче
    g.fillStyle="#EDEAE4";g.textAlign="center";g.textBaseline="middle";
    g.fillText(txt,384,32);tex.needsUpdate=true;}
  draw();redraw.push(draw);
  return spr;
}

const WARM=0xFFB35C, COOL=0xB8D8FF, LASER=0xFF3B4E, PINK=0xFF4F8B;
// конструкторы объектов по id проекта: строят содержимое в группе h и возвращают {pick, ...что анимировать}
const BUILD={};

/* Vibes — LED-куб, лазерные лучи и бегущая строка */
BUILD.vibes=h=>{
  const solid=new THREE.MeshStandardMaterial({color:0x111114,emissive:WARM,emissiveIntensity:.35,roughness:.4});
  const cube=new THREE.Group();
  cube.add(new THREE.Mesh(new THREE.BoxGeometry(1.3,1.3,1.3),solid));
  cube.add(new THREE.Mesh(new THREE.BoxGeometry(1.65,1.65,1.65),new THREE.MeshBasicMaterial({color:WARM,wireframe:true})));
  cube.position.y=.35; h.add(cube);
  const beams=[];
  for(let i=0;i<6;i++){
    const b=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,4.2,6),
      new THREE.MeshBasicMaterial({color:LASER,transparent:true,opacity:.7}));
    b.rotation.z=Math.PI/2; b.rotation.y=(i/6)*Math.PI; b.position.y=.35+(i-2.5)*.22; h.add(b); beams.push(b);
  }
  const c=document.createElement("canvas");c.width=1024;c.height=128;
  const ctx=c.getContext("2d"), tex=new THREE.CanvasTexture(c);tex.wrapS=THREE.RepeatWrapping;
  const tick=new THREE.Mesh(new THREE.PlaneGeometry(3,.4),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide}));
  tick.position.y=-1.15; h.add(tick);
  function drawTicker(){
    ctx.fillStyle="#050506";ctx.fillRect(0,0,1024,128);
    ctx.font="600 62px 'JetBrains Mono',monospace";ctx.fillStyle="#FFB35C";ctx.textBaseline="middle";
    ctx.fillText(LANG==="ru"?"LED · ARDUINO · HD2020 · СВЕТ РУКАМИ · ":"LED · ARDUINO · HD2020 · LIGHT BY HAND · ",0,64);
    tex.needsUpdate=true;
  }
  drawTicker();redraw.push(drawTicker);
  addGlow(h,WARM,5.5,.32);
  const pick=new THREE.Mesh(new THREE.BoxGeometry(3.4,3.2,2),new THREE.MeshBasicMaterial({visible:false}));h.add(pick);
  return {pick,beams,ticker:tex,spinObj:cube,spin:.006};
};

/* Коломенское — музейная витрина */
BUILD.kolomenskoe=h=>{
  const glass=new THREE.Mesh(new THREE.BoxGeometry(1.4,2.3,1.4),
    new THREE.MeshStandardMaterial({color:0x0d1016,roughness:.1,metalness:.7,transparent:true,opacity:.45}));
  h.add(glass);
  h.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.4,2.3,1.4)),
    new THREE.LineBasicMaterial({color:COOL,transparent:true,opacity:.85})));
  const plinth=new THREE.Mesh(new THREE.BoxGeometry(1.6,.5,1.6),new THREE.MeshStandardMaterial({color:0x121218,roughness:.8}));
  plinth.position.y=-1.4; h.add(plinth);
  const art=new THREE.Mesh(new THREE.IcosahedronGeometry(.4,0),
    new THREE.MeshStandardMaterial({color:0x1a1a1f,emissive:WARM,emissiveIntensity:.5,roughness:.5}));
  art.position.y=-.2;h.add(art);
  addGlow(h,COOL,3.6,.22);
  return {pick:glass,art,spinObj:h,spin:.002};
};

/* Фестиваль — перфорированные «врата» с мерцающими точками */
BUILD.festival=h=>{
  const c=document.createElement("canvas");c.width=192;c.height=256;
  const ctx=c.getContext("2d"), tex=new THREE.CanvasTexture(c);
  const cols=12, rows=16, ph=[...Array(cols*rows)].map(()=>Math.random()*6.28);
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(1.8,2.5),
    new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));
  h.add(panel);
  const back=new THREE.Mesh(new THREE.PlaneGeometry(1.8,2.5),new THREE.MeshStandardMaterial({color:0x0c0a0c,roughness:.7,side:THREE.DoubleSide}));
  back.position.z=-.02;h.add(back);
  function draw(t){
    ctx.clearRect(0,0,192,256);
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      const v=.25+.75*Math.max(0,Math.sin(t*1.6+ph[y*cols+x]+y*.35));
      ctx.fillStyle=`rgba(255,79,139,${v.toFixed(2)})`;
      ctx.fillRect(x*16+5,y*16+5,6,6);
    }
    tex.needsUpdate=true;
  }
  draw(0);
  addGlow(h,PINK,3.8,.24);
  return {pick:panel,dots:draw,sway:true};
};

/* Балашиха — объём фабрики с перекрытиями и стеклянным сводом */
BUILD.balashikha=h=>{
  h.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3,1.8,2.2)),
    new THREE.LineBasicMaterial({color:COOL,transparent:true,opacity:.75})));
  const slab=new THREE.MeshStandardMaterial({color:0x14141a,roughness:.85,transparent:true,opacity:.85});
  [-.45,.15].forEach(y=>{const s=new THREE.Mesh(new THREE.BoxGeometry(2.9,.04,2.1),slab);s.position.y=y;h.add(s);});
  const w=new THREE.Mesh(new THREE.BoxGeometry(.06,1.8,1.3),slab);w.position.set(.5,0,-.4);h.add(w);
  const vault=new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,2.2,16,1,true,0,Math.PI),
    new THREE.MeshBasicMaterial({color:COOL,wireframe:true,transparent:true,opacity:.35}));
  vault.rotation.x=Math.PI/2; vault.rotation.z=Math.PI/2; vault.position.y=.9; h.add(vault);
  const pick=new THREE.Mesh(new THREE.BoxGeometry(3,2.6,2.2),new THREE.MeshBasicMaterial({visible:false}));h.add(pick);
  addGlow(h,COOL,5,.2);
  return {pick,spinObj:h,spin:-.003};
};

/* Частные объекты — план участка с зонами, наклонённый к зрителю */
BUILD.private=h=>{
  const board=new THREE.Group(); board.rotation.x=-.95; h.add(board);
  board.add(new THREE.Mesh(new THREE.PlaneGeometry(3.4,3.4),
    new THREE.MeshBasicMaterial({color:0x0b1410,transparent:true,opacity:.85,side:THREE.DoubleSide})));
  const zones=[[-1.05,-1.05,1.05,.9],[.35,-1.1,1.3,.75],[-1.2,.4,.8,1.15],[.25,.5,1.4,1.3],[-.15,-.1,.55,.5],[1.25,1.25,.55,.55],[-1.35,1.35,.4,.4]];
  zones.forEach(z=>{
    const r=new THREE.Mesh(new THREE.PlaneGeometry(z[2],z[3]),
      new THREE.MeshBasicMaterial({color:WARM,transparent:true,opacity:.14,side:THREE.DoubleSide}));
    r.position.set(z[0],z[1],.01);board.add(r);
    const e=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(z[2],z[3])),
      new THREE.LineBasicMaterial({color:WARM,transparent:true,opacity:.6}));
    e.position.set(z[0],z[1],.02);board.add(e);
  });
  addGlow(h,WARM,4.6,.15);
  const pick=new THREE.Mesh(new THREE.BoxGeometry(3.4,2.6,1.6),new THREE.MeshBasicMaterial({visible:false}));h.add(pick);
  return {pick,sway:true};
};

/* ---- раскладываем объекты по кольцу ---- */
const items=OBJ.map((o,i)=>{
  const g=new THREE.Group(), h=new THREE.Group(), a=i*STEP;
  g.position.set(Math.sin(a)*R,0,Math.cos(a)*R);
  g.rotation.y=a;                     // «лицом» наружу кольца
  g.add(h); ring.add(g);
  const it=(BUILD[o.p]||BUILD.kolomenskoe)(h);
  it.g=g; it.h=h; it.idx=i;
  it.label=makeLabel(g,()=>OBJ[i].t[LANG],-2.05);
  return it;
});

/* ---- навигация по папкам ---- */
const nav=$("roomNav");
let active=-1;
function markNav(){
  nav.querySelectorAll("button").forEach(b=>b.classList.toggle("on",+b.dataset.i===active));
  // на телефоне навигация — горизонтальная лента: подкручиваем к активной папке
  const on=nav.querySelector(".on");
  if(on && nav.scrollWidth>nav.clientWidth) nav.scrollTo({left:on.offsetLeft-20,behavior:"smooth"});
}
function renderNav(){
  nav.innerHTML=OBJ.map((o,i)=>`<button type="button" data-i="${i}"><i>${pad2(i+1)}</i>${esc(o.t[LANG])}</button>`).join("");
  markNav();
}
nav.addEventListener("click",e=>{const b=e.target.closest("[data-i]"); if(b) goTo(+b.dataset.i);});
// прокрутить страницу так, чтобы проект i встал в центр карусели
function goTo(i){
  const top=room.getBoundingClientRect().top+scrollY, span=room.offsetHeight-innerHeight;
  scrollTo({top:top+span*i/(N-1),behavior:"smooth"});
}

/* ---- карточка выбранного проекта ---- */
const panel=$("panel");
let swapT;
function fillPanel(i){
  const o=OBJ[i], p=PROJECTS.find(x=>x.id===o.p);
  $("pNum").textContent=pad2(i+1)+" / "+pad2(N);
  $("pTitle").textContent=o.t[LANG];
  $("pText").textContent=o.d[LANG];
  $("pMeta").innerHTML=o.m[LANG].map(x=>"· "+esc(x)).join("<br>");
  // подпапки — сразу ведут на нужную вкладку проекта
  $("pDirs").innerHTML=(p&&p.dirs||[]).map((d,k)=>`<a href="#/${o.p}/${k+1}">${esc(d.t[LANG])}</a>`).join("");
  $("pOpen").href="#/"+o.p;
}
function setActive(i){
  if(i===active) return;
  const first=active<0; active=i; markNav();
  if(first){fillPanel(i);return;}
  clearTimeout(swapT); panel.classList.add("swap");
  swapT=setTimeout(()=>{fillPanel(active);panel.classList.remove("swap");},220);
}

langHooks.push(()=>{redraw.forEach(f=>f()); renderNav(); if(active>=0) fillPanel(active);});

/* ---- прокрутка → поворот кольца ---- */
// у каждого проекта есть «площадка», где кольцо стоит, между ними — плавный поворот
function dwell(f){
  const s=Math.floor(f), x=f-s, k=Math.min(1,Math.max(0,(x-.22)/.56));
  return s+k*k*(3-2*k);
}
function progress(){
  const r=room.getBoundingClientRect(), span=r.height-innerHeight;
  return span>0 ? Math.min(1,Math.max(0,-r.top/span)) : 0;
}
let pos=0;

/* ---- наведение / клик ---- */
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
let hovered=null;
function pickAt(x,y){
  const r=canvas.getBoundingClientRect();
  ndc.x=((x-r.left)/r.width)*2-1; ndc.y=-((y-r.top)/r.height)*2+1;
  ray.setFromCamera(ndc,camera);
  const hits=ray.intersectObjects(items.map(i=>i.pick),false);
  return hits.length?items.find(i=>i.pick===hits[0].object):null;
}
canvas.addEventListener("pointermove",e=>{
  const it=pickAt(e.clientX,e.clientY);
  if(it!==hovered){hovered=it;dot.classList.toggle("big",!!it);}
},{passive:true});
canvas.addEventListener("pointerleave",()=>{hovered=null;dot.classList.remove("big");});
let downX=0,downY=0;
canvas.addEventListener("pointerdown",e=>{downX=e.clientX;downY=e.clientY;});
canvas.addEventListener("pointerup",e=>{
  if(Math.hypot(e.clientX-downX,e.clientY-downY)>7)return; // это была прокрутка пальцем
  const it=pickAt(e.clientX,e.clientY); if(!it) return;
  if(it.idx===active) location.hash="#/"+OBJ[it.idx].p; else goTo(it.idx);
});

/* ---- диммер ---- */
let level=.55;
const track=$("track"),fill=$("fill"),knob=$("knob"),kelvin=$("kelvin");
function setLevel(v){
  level=Math.max(.06,Math.min(1,v));
  fill.style.height=(level*100)+"%";
  knob.style.bottom="calc("+(level*100)+"% - 8px)";
  kelvin.textContent=Math.round(2700+level*3800)+"K";
  // цвет курсора-фонаря меняется вместе с температурой
  const c=new THREE.Color(WARM).lerp(new THREE.Color(COOL),Math.max(0,(level-.35)/.65));
  cursorLight.color=c;
  const hex="#"+c.getHexString();
  document.documentElement.style.setProperty("--accent",hex);
  torch.style.background=`radial-gradient(220px circle at var(--mx,50%) var(--my,50%), ${hex}22, ${hex}0a 45%, transparent 70%)`;
}
let dimDrag=false;
function dimFromY(y){const r=track.getBoundingClientRect();setLevel(1-(y-r.top)/r.height);}
track.addEventListener("pointerdown",e=>{dimDrag=true;dimFromY(e.clientY);e.stopPropagation();});
addEventListener("pointermove",e=>{if(dimDrag)dimFromY(e.clientY);});
addEventListener("pointerup",()=>dimDrag=false);
setLevel(.55);

/* ---- ресайз: на узком экране камера отходит дальше ---- */
function resize(){
  const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;
  if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio())){
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    const narrow=camera.aspect<1;
    camera.position.set(0,narrow?1.4:2,R+(narrow?10+(1-camera.aspect)*5:9.5));
    camera.lookAt(0,narrow?.1:-.2,R-2);
    // на широком экране сцена смещена влево — справа карточка проекта
    world.position.x=camera.aspect>1.2?-1.2:0;
  }
}

/* ---- рендерим только когда карусель на экране ---- */
let visible=false;
new IntersectionObserver(es=>visible=es[0].isIntersecting).observe(room);

renderNav();
setActive(0);

let t=0;
function tick(){
  requestAnimationFrame(tick);
  if(!visible || document.body.classList.contains("locked")) return;
  t+=.016;
  resize();

  const target=dwell(progress()*(N-1));
  pos+=(target-pos)*.08;
  ring.rotation.y=-pos*STEP;
  setActive(Math.round(target));

  // лёгкий параллакс от курсора
  const nx=(mx/innerWidth-.5),ny=(my/innerHeight-.5);
  world.rotation.y=nx*.12;
  world.rotation.x=ny*.05;

  // курсор как источник света в сцене
  cursorLight.position.set(nx*16,-ny*10+1.5,R+5);
  cursorLight.intensity=.5+level*3.4;
  ambient.intensity=.04+level*.14;
  fillLight.intensity=.1+level*.5;

  items.forEach(it=>{
    // близость к фронту кольца: 1 — по центру, 0 — соседний и дальше
    let d=Math.abs(((it.idx-pos)%N+N)%N); d=Math.min(d,N-d);
    const front=Math.max(0,1-d);
    if(it.spinObj)it.spinObj.rotation.y+=it.spin*(1+front*2);
    if(it.sway)it.h.rotation.y=Math.sin(t*.6+it.idx)*.25;
    if(it.ticker)it.ticker.offset.x=(t*.14)%1;
    if(it.beams)it.beams.forEach((b,i)=>b.material.opacity=.3+.5*Math.abs(Math.sin(t*1.2+i)));
    if(it.art){it.art.rotation.y+=.006;it.art.rotation.x+=.003;}
    if(it.dots && Math.round(t*60)%3===0)it.dots(t);
    if(it.screens)it.screens.forEach((s,k)=>s.position.y=Math.sin(t*1.1+k*1.3)*.08);
    it.g.position.y=Math.sin(t*.7+it.idx)*.08+front*.15;
    const on = hovered===it || it.idx===active;
    it.label.material.opacity += ((on?1:0)-it.label.material.opacity)*.12;
    const sc=.8+front*.25+(hovered===it?.06:0);
    it.g.scale.setScalar(it.g.scale.x+(sc-it.g.scale.x)*.12);
  });

  renderer.render(scene,camera);
}
tick();
})();
