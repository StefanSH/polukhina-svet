/* ============ 3D-комната: объекты-проекты ============ */
(function(){
if(!window.THREE) return;   // CDN недоступен — остальной сайт работает без комнаты

const canvas=$("c3d");
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, COARSE?1.5:2));
const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0x0E0E12,0.036);
const camera=new THREE.PerspectiveCamera(48,1,.1,120);
camera.position.set(0,1.2,15.5);

const world=new THREE.Group(); scene.add(world);

// свет
const ambient=new THREE.AmbientLight(0xffffff,.10); scene.add(ambient);
const cursorLight=new THREE.PointLight(0xFFB35C,1.6,26,2); scene.add(cursorLight);
const fillLight=new THREE.PointLight(0xB8D8FF,.35,40,2); fillLight.position.set(-8,7,6); scene.add(fillLight);

// пол
const floor=new THREE.Mesh(new THREE.PlaneGeometry(70,70),
  new THREE.MeshStandardMaterial({color:0x0a0a0d,roughness:.75,metalness:.25}));
floor.rotation.x=-Math.PI/2; floor.position.y=-3.2; world.add(floor);
const grid=new THREE.GridHelper(70,70,0x1a1a22,0x14141a);
grid.position.y=-3.19; world.add(grid);

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
  const c=document.createElement("canvas");c.width=640;c.height=64;
  const tex=new THREE.CanvasTexture(c);
  const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,opacity:0,depthWrite:false}));
  spr.scale.set(5.2,.52,1);spr.position.y=y;parent.add(spr);
  function draw(){const g=c.getContext("2d");g.clearRect(0,0,640,64);
    g.font="500 26px 'JetBrains Mono',monospace";g.fillStyle="#EDEAE4";g.textAlign="center";g.textBaseline="middle";
    g.fillText(getText().toUpperCase(),320,32);tex.needsUpdate=true;}
  draw();redraw.push(draw);
  return spr;
}

const WARM=0xFFB35C, COOL=0xB8D8FF, LASER=0xFF3B4E, PINK=0xFF4F8B;
const items=[]; // {g, pick, label, idx, ...}
const title=i=>()=>OBJ[i].t[LANG];
function place(g,x,y,z){g.position.set(x,y,z);world.add(g);}

/* 1 — светящиеся кубы */
(function(){
  const g=new THREE.Group();
  const solid=new THREE.MeshStandardMaterial({color:0x111114,emissive:WARM,emissiveIntensity:.35,roughness:.4});
  const box=new THREE.Mesh(new THREE.BoxGeometry(1.5,1.5,1.5),solid);g.add(box);
  g.add(new THREE.Mesh(new THREE.BoxGeometry(1.9,1.9,1.9),new THREE.MeshBasicMaterial({color:WARM,wireframe:true})));
  addGlow(g,WARM,6,.35);
  const l=makeLabel(g,title(0),1.9);
  place(g,-4.6,.4,-1.5);
  items.push({g,pick:box,label:l,idx:0,spin:.004});
})();

/* 2 — бегущая строка */
(function(){
  const g=new THREE.Group();
  const c=document.createElement("canvas");c.width=1024;c.height=128;
  const ctx=c.getContext("2d");
  const tex=new THREE.CanvasTexture(c);tex.wrapS=THREE.RepeatWrapping;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(4.4,.62),
    new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide}));
  g.add(mesh);
  const fr=new THREE.Mesh(new THREE.BoxGeometry(4.7,.9,.14),new THREE.MeshStandardMaterial({color:0x0d0d10,roughness:.6}));
  fr.position.z=-.09;g.add(fr);
  addGlow(g,WARM,4.5,.28);
  function drawTicker(){
    ctx.fillStyle="#050506";ctx.fillRect(0,0,1024,128);
    ctx.font="600 62px 'JetBrains Mono',monospace";ctx.fillStyle="#FFB35C";ctx.textBaseline="middle";
    ctx.fillText(LANG==="ru"?"LED · ARDUINO · HD2020 · СВЕТ РУКАМИ · ":"LED · ARDUINO · HD2020 · LIGHT BY HAND · ",0,64);
    tex.needsUpdate=true;
  }
  drawTicker();redraw.push(drawTicker);
  const l=makeLabel(g,title(1),1.15);
  place(g,0,2.4,-4.2);
  items.push({g,pick:mesh,label:l,idx:1,ticker:tex});
})();

/* 3 — лазерная стена */
(function(){
  const g=new THREE.Group();
  const beams=[];
  for(let i=0;i<7;i++){
    const b=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,7,6),
      new THREE.MeshBasicMaterial({color:LASER,transparent:true,opacity:.7}));
    b.rotation.z=Math.PI/2; b.rotation.y=(i/7)*Math.PI;
    b.position.y=(i-3)*.32; g.add(b); beams.push(b);
  }
  const hit=new THREE.Mesh(new THREE.BoxGeometry(6,2.6,2.6),new THREE.MeshBasicMaterial({visible:false}));
  g.add(hit);
  addGlow(g,LASER,5,.22);
  const l=makeLabel(g,title(2),2.1);
  place(g,4.9,.9,-2.2);
  items.push({g,pick:hit,label:l,idx:2,beams});
})();

/* 4 — объём фабрики: корпус с перекрытиями */
(function(){
  const g=new THREE.Group();
  g.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3.4,1.9,2.6)),
    new THREE.LineBasicMaterial({color:COOL,transparent:true,opacity:.75})));
  const slab=new THREE.MeshStandardMaterial({color:0x14141a,roughness:.85,transparent:true,opacity:.85});
  [-.48,.16].forEach(y=>{const s=new THREE.Mesh(new THREE.BoxGeometry(3.3,.04,2.5),slab);s.position.y=y;g.add(s);});
  const w=new THREE.Mesh(new THREE.BoxGeometry(.06,1.9,1.5),slab);w.position.set(.5,0,-.5);g.add(w);
  const pick=new THREE.Mesh(new THREE.BoxGeometry(3.4,1.9,2.6),new THREE.MeshBasicMaterial({visible:false}));
  g.add(pick);
  addGlow(g,COOL,5,.2);
  const l=makeLabel(g,title(3),1.6);
  place(g,-3.2,-1.4,3.2);
  items.push({g,pick,label:l,idx:3,spin:-.002});
})();

/* 5 — музейная витрина */
(function(){
  const g=new THREE.Group();
  const glass=new THREE.Mesh(new THREE.BoxGeometry(1.3,2.1,1.3),
    new THREE.MeshStandardMaterial({color:0x0d1016,roughness:.1,metalness:.7,transparent:true,opacity:.45}));
  g.add(glass);
  g.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.3,2.1,1.3)),
    new THREE.LineBasicMaterial({color:COOL,transparent:true,opacity:.85})));
  const art=new THREE.Mesh(new THREE.IcosahedronGeometry(.36,0),
    new THREE.MeshStandardMaterial({color:0x1a1a1f,emissive:WARM,emissiveIntensity:.5,roughness:.5}));
  art.position.y=-.2;g.add(art);
  addGlow(g,COOL,3.4,.22);
  const l=makeLabel(g,title(4),1.75);
  place(g,3.1,-1.2,3.6);
  items.push({g,pick:glass,label:l,idx:4,art});
})();

/* 6 — частные объекты: участок с зонами */
(function(){
  const g=new THREE.Group();
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(4.2,4.2),
    new THREE.MeshBasicMaterial({color:0x0b1410,transparent:true,opacity:.8,side:THREE.DoubleSide}));
  plane.rotation.x=-Math.PI/2;g.add(plane);
  const zones=[[-1.3,-1.3,1.3,1.1],[.4,-1.4,1.6,.9],[-1.5,.5,1,1.4],[.3,.6,1.7,1.6],[-.2,-.1,.7,.6],[1.55,1.55,.7,.7],[-1.7,1.7,.5,.5]];
  zones.forEach(z=>{
    const r=new THREE.Mesh(new THREE.PlaneGeometry(z[2],z[3]),
      new THREE.MeshBasicMaterial({color:WARM,transparent:true,opacity:.13,side:THREE.DoubleSide}));
    r.rotation.x=-Math.PI/2;r.position.set(z[0],.012,z[1]);g.add(r);
    const e=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(z[2],z[3])),
      new THREE.LineBasicMaterial({color:WARM,transparent:true,opacity:.55}));
    e.rotation.x=-Math.PI/2;e.position.set(z[0],.02,z[1]);g.add(e);
  });
  const pick=new THREE.Mesh(new THREE.BoxGeometry(4.2,.4,4.2),new THREE.MeshBasicMaterial({visible:false}));
  g.add(pick);
  addGlow(g,WARM,5,.14);
  const l=makeLabel(g,title(5),1.2);
  place(g,0,-2.85,1.2);
  items.push({g,pick,label:l,idx:5,spin:.0012});
})();

/* 7 — фестивальные «врата»: перфорированная стена с мерцающими точками */
(function(){
  const g=new THREE.Group();
  const c=document.createElement("canvas");c.width=192;c.height=256;
  const ctx=c.getContext("2d"), tex=new THREE.CanvasTexture(c);
  const cols=12, rows=16, ph=[...Array(cols*rows)].map(()=>Math.random()*6.28);
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(1.5,2.1),
    new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));
  g.add(panel);
  const back=new THREE.Mesh(new THREE.PlaneGeometry(1.5,2.1),new THREE.MeshStandardMaterial({color:0x0c0a0c,roughness:.7,side:THREE.DoubleSide}));
  back.position.z=-.02;g.add(back);
  function draw(t){
    ctx.clearRect(0,0,192,256);
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      const v=.25+.75*Math.max(0,Math.sin(t*1.6+ph[y*cols+x]+y*.35));
      ctx.fillStyle=`rgba(255,79,139,${v.toFixed(2)})`;
      ctx.fillRect(x*16+5,y*16+5,6,6);
    }
    tex.needsUpdate=true;
  }
  addGlow(g,PINK,3.4,.22);
  const l=makeLabel(g,title(6),1.55);
  place(g,5.4,2.6,2.4);
  items.push({g,pick:panel,label:l,idx:6,spin:.003,dots:draw});
})();

/* ---- ресайз ---- */
function resize(){
  const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;
  if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio())){
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  }
}

/* ---- вращение перетаскиванием ---- */
let drag=false,px=0,py=0,rotY=0,rotX=0,tRotY=0,tRotX=0;
canvas.addEventListener("pointerdown",e=>{drag=true;px=e.clientX;py=e.clientY;dot.classList.add("big");lastPointer=performance.now();});
addEventListener("pointerup",()=>{if(drag){drag=false;dot.classList.remove("big");}});
addEventListener("pointermove",e=>{
  if(!drag)return;
  tRotY+=(e.clientX-px)*.005; tRotX+=(e.clientY-py)*(COARSE?0:.003);
  tRotX=Math.max(-.5,Math.min(.55,tRotX));
  px=e.clientX;py=e.clientY;
},{passive:true});

/* ---- raycast / клик ---- */
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
let hovered=null,openIdx=null;
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
  if(Math.hypot(e.clientX-downX,e.clientY-downY)>7)return; // это было перетаскивание
  const it=pickAt(e.clientX,e.clientY);
  if(it)openPanel(it.idx); else closePanel();
});

/* ---- панель ---- */
const panel=$("panel");
function fillPanel(i){
  const o=OBJ[i];
  $("pNum").textContent=pad2(i+1)+" / "+pad2(OBJ.length);
  $("pTitle").textContent=o.t[LANG];
  $("pText").textContent=o.d[LANG];
  $("pMeta").innerHTML=o.m[LANG].map(x=>"· "+esc(x)).join("<br>");
  $("pOpen").href="#/"+o.p;
}
function openPanel(i){openIdx=i;fillPanel(i);panel.classList.add("open");}
function closePanel(){openIdx=null;panel.classList.remove("open");}
$("pClose").addEventListener("click",e=>{e.stopPropagation();closePanel();});

langHooks.push(()=>{redraw.forEach(f=>f()); if(openIdx!==null) fillPanel(openIdx);});

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

/* ---- рендерим только когда комната на экране ---- */
let visible=false;
new IntersectionObserver(es=>visible=es[0].isIntersecting).observe($("room"));

let t=0;
function tick(){
  requestAnimationFrame(tick);
  if(!visible || document.body.classList.contains("locked")) return;
  t+=.016;
  resize();

  if(COARSE && !drag) tRotY += .0009;
  rotY+=(tRotY-rotY)*.06; rotX+=(tRotX-rotX)*.06;
  // лёгкий параллакс от курсора поверх перетаскивания
  const nx=(mx/innerWidth-.5),ny=(my/innerHeight-.5);
  world.rotation.y=rotY+nx*.22;
  world.rotation.x=rotX+ny*.10;

  // курсор как источник света в сцене
  cursorLight.position.set(nx*16,-ny*10+1.5,7.5);
  cursorLight.intensity=.5+level*3.4;
  ambient.intensity=.04+level*.14;
  fillLight.intensity=.1+level*.5;

  items.forEach(it=>{
    if(it.spin)it.g.rotation.y+=it.spin;
    if(it.ticker)it.ticker.offset.x=(t*.14)%1;
    if(it.beams)it.beams.forEach((b,i)=>b.material.opacity=.35+.45*Math.abs(Math.sin(t*1.2+i)));
    if(it.art){it.art.rotation.y+=.006;it.art.rotation.x+=.003;}
    if(it.dots && Math.round(t*60)%3===0)it.dots(t);
    it.g.position.y += Math.sin(t*.7+it.idx)*.0016;
    const active = hovered===it || openIdx===it.idx;
    it.label.material.opacity += ((active?1:0)-it.label.material.opacity)*.12;
    it.g.scale.setScalar(it.g.scale.x + ((active?1.06:1)-it.g.scale.x)*.12);
  });

  renderer.render(scene,camera);
}
items.forEach(it=>it.dots&&it.dots(0));
tick();
})();
