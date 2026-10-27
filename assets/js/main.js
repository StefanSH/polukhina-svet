/* ============ общее состояние ============ */
let LANG = (navigator.language||"ru").toLowerCase().startsWith("ru") ? "ru" : "en";
const COARSE = matchMedia("(hover:none),(pointer:coarse)").matches;
const langHooks = [];             // room.js добавляет сюда перерисовку подписей
const $ = id => document.getElementById(id);
const pad2 = n => String(n).padStart(2,"0");
const esc = s => String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

if(COARSE){
  document.querySelector("#scrollHint").dataset.i18n="hintTouch";
  document.querySelector("#roomHelp").dataset.i18n="roomHelpTouch";
}

/* ============ рендер секций ============ */
function imgPath(id,n,small){return `assets/img/${id}/${pad2(n)}${small?"-s":""}.webp`;}
function imgTag(id,n,sizes,cls){
  const [w,h]=MEDIA[id][n-1];
  return `<img${cls?` class="${cls}"`:""} src="${imgPath(id,n,true)}" srcset="${imgPath(id,n,true)} 720w, ${imgPath(id,n)} ${w}w" sizes="${sizes}" width="${w}" height="${h}" loading="lazy" decoding="async" alt="">`;
}

function renderWork(){
  $("workList").innerHTML = PROJECTS.map((p,i)=>`
    <a class="proj" href="#/${p.id}">
      <div class="txt">
        <div class="num">${pad2(i+1)} · ${p.year}</div>
        <h3>${esc(p.t[LANG])}</h3>
        <div class="sub">${esc(p.sub[LANG])}</div>
        <div class="tags">${p.tags[LANG].map(t=>`<span>${esc(t)}</span>`).join("")}</div>
        <div class="go">${I18N[LANG].open}</div>
      </div>
      <div class="pic">${imgTag(p.id,p.cover,"(max-width:980px) 100vw, 58vw")}</div>
    </a>`).join("");
  // на тач-экранах «включаем» карточку, когда она в центре экрана
  if(COARSE){
    const io=new IntersectionObserver(es=>es.forEach(e=>e.target.classList.toggle("lit",e.isIntersecting)),{rootMargin:"-35% 0px -35% 0px"});
    document.querySelectorAll(".proj").forEach(el=>io.observe(el));
  }
}

function renderShop(){
  $("shopGrid").innerHTML = SHOP.map(s=>
    `<div class="cell"><div class="k">${s.k}</div><div class="v">${esc(s[LANG])}</div></div>`).join("");
}

function renderPath(){
  const li = e => `<li><div class="y">${e.y}</div><div>${e.p
      ? `<a class="t" href="#/${e.p}">${esc(e.t[LANG])} →</a>` : `<div class="t">${esc(e.t[LANG])}</div>`}
    <div class="d">${esc(e.d[LANG])}</div></div></li>`;
  $("expList").innerHTML = EXP.map(li).join("");
  $("eduList").innerHTML = EDU.map(li).join("");
  $("docList").innerHTML = DOCS.map(d=>`<li><a href="${d.href}" target="_blank" rel="noopener">${esc(d.t[LANG])}</a></li>`).join("");
}

function applyLang(){
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const v = I18N[LANG][el.dataset.i18n]; if(v!==undefined) el.innerHTML = v;
  });
  document.querySelectorAll("#lang span").forEach(s=>s.classList.toggle("on", s.dataset.l===LANG));
  renderWork(); renderShop(); renderPath();
  if(caseId) renderCase(caseId);
  langHooks.forEach(f=>f());
}
$("lang").addEventListener("click",e=>{
  const l = e.target.dataset.l; if(!l||l===LANG) return; LANG=l; applyLang();
});

/* ============ курсор ============ */
const dot=$("dot"), torch=$("torch");
let mx=innerWidth/2,my=innerHeight/2,tagTimer;
addEventListener("pointermove",e=>{
  mx=e.clientX;my=e.clientY;
  document.documentElement.style.setProperty("--mx",mx+"px");
  document.documentElement.style.setProperty("--my",my+"px");
  dot.style.left=mx+"px";dot.style.top=my+"px";
  clearTimeout(tagTimer);
  tagTimer=setTimeout(()=>$("tag").classList.add("show"),1800);
},{passive:true});
setTimeout(()=>$("tag").classList.add("show"),3000);

// курсор растёт над всем, что кликается
document.addEventListener("pointerover",e=>{
  if(e.target.closest("a,button,#lang span,#track")) dot.classList.add("big");
});
document.addEventListener("pointerout",e=>{
  if(e.target.closest("a,button,#lang span,#track")) dot.classList.remove("big");
});

/* на телефоне указателя нет — фонарь дрейфует сам + реагирует на наклон */
let lastPointer=-1e9, gx=0, gy=0;
addEventListener("pointermove",()=>lastPointer=performance.now(),{passive:true});
addEventListener("deviceorientation",e=>{
  gx=Math.max(-1,Math.min(1,(e.gamma||0)/34));
  gy=Math.max(-1,Math.min(1,((e.beta||0)-45)/34));
},true);
(function drift(){
  requestAnimationFrame(drift);
  if(performance.now()-lastPointer < 2600) return;   // пользователь только что вёл пальцем
  const t=performance.now()/1000;
  // пока видно интро — фонарь ходит прямо по имени
  const r=$("name").getBoundingClientRect();
  const onIntro = r.bottom>0 && r.top<innerHeight;
  const cx = onIntro ? r.left+r.width/2 : innerWidth/2;
  const cy = onIntro ? r.top +r.height/2 : innerHeight/2;
  const ax = onIntro ? r.width*.42 : innerWidth*.24;
  const ay = onIntro ? r.height*.40 : innerHeight*.20;
  const px = cx + Math.sin(t*.42)*ax + gx*ax*.8;
  const py = cy + Math.cos(t*.29)*ay + gy*ay*.8;
  mx=px;my=py;
  document.documentElement.style.setProperty("--mx",px+"px");
  document.documentElement.style.setProperty("--my",py+"px");
})();

/* ============ прелоадер ============ */
(function(){
  const fill=$("preFill"),txt=$("preTxt"),pre=$("pre");
  let p=0;
  const iv=setInterval(()=>{
    p += Math.random()*13+4;
    if(p>=100){p=100;clearInterval(iv);
      setTimeout(()=>{pre.classList.add("gone");setTimeout(()=>pre.style.display="none",1000);},420);}
    // мерцание, как у ленты при подаче питания
    fill.style.width=p+"%";
    fill.style.opacity = p<100 && Math.random()<.25 ? .55 : 1;
    txt.textContent = I18N[LANG].loading+" "+pad2(Math.floor(p));
  },95);
})();

/* ============ счётчики ============ */
(function(){
  const seen=new WeakSet();
  const io=new IntersectionObserver(es=>es.forEach(e=>{
    if(!e.isIntersecting||seen.has(e.target))return;seen.add(e.target);
    const el=e.target,to=+el.dataset.count,pf=el.dataset.prefix||"",sf=el.dataset.suffix||"";
    const st=performance.now();
    (function step(t){const k=Math.min(1,(t-st)/1300);const v=Math.round(to*(1-Math.pow(1-k,3)));
     el.textContent=pf+v+sf;if(k<1)requestAnimationFrame(step);})(st);
  }),{threshold:.5});
  document.querySelectorAll("[data-count]").forEach(el=>io.observe(el));
})();

/* ============ страница проекта ============ */
const caseEl=$("case"), caseScroll=$("caseScroll");
let caseId=null, caseTab=0, lbAll=[], lbList=[], lbIdx=0;

function renderCase(id){
  const i=PROJECTS.findIndex(p=>p.id===id), p=PROJECTS[i], L=LANG, T=I18N[L];
  const prev=PROJECTS[(i+PROJECTS.length-1)%PROJECTS.length], next=PROJECTS[(i+1)%PROJECTS.length];
  lbAll=[];
  // grp — лайтбокс листает только внутри своего раздела / вкладки
  const lbBtn=(n,cap,sizes,grp)=>{lbAll.push({id:p.id,n,cap,grp});
    return `<button type="button" data-lb="${lbAll.length-1}">${imgTag(p.id,n,sizes)}</button>`;};
  const GAL="(max-width:640px) 100vw, 33vw";

  let h=`<div class="c-hero"><img src="${imgPath(p.id,p.cover)}" alt=""></div>
    <div class="c-head"><div class="c-year">${p.year}</div><h1 class="c-title">${esc(p.t[L])}</h1><div class="c-sub">${esc(p.sub[L])}</div></div>
    <div class="c-grid">
      <div><div class="c-lead">${esc(p.lead[L])}</div><div class="c-body">${p.body[L].map(x=>`<p>${esc(x)}</p>`).join("")}</div></div>
      <dl class="c-meta">${p.meta[L].map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
    </div>`;

  (p.f||[]).forEach((f,k)=>{
    h+=`<section class="c-feat"><figure>${lbBtn(f.img,f.t[L],"(max-width:980px) 100vw, 58vw","f")}</figure>
      <div><div class="label">${pad2(k+1)} / ${pad2(p.f.length)}</div><h3>${esc(f.t[L])}</h3><p>${esc(f.d[L])}</p></div></section>`;
  });

  (p.v||[]).forEach(v=>{
    h+=`<section class="c-sec c-clip"><div class="label"><span>${esc(v.t[L])}</span></div>
      <figure><video src="${v.src}" poster="${v.poster}" controls muted loop playsinline preload="none"></video></figure></section>`;
  });

  if(p.anim) h+=`<section class="c-sec"><div class="label"><span>${L==="ru"?"Световые сценарии врат":"Gate light scenarios"}</span></div>
      <div class="anim">${p.anim.map(a=>`<figure><img src="${a.src}" loading="lazy" alt=""><figcaption>${esc(a.t[L])}</figcaption></figure>`).join("")}</div></section>`;

  (p.g||[]).forEach((g,k)=>{
    h+=`<section class="c-sec"><div class="label"><span>${esc(g.t[L])}</span><span>${pad2(g.n.length)}</span></div>
      <div class="gal">${g.n.map(n=>lbBtn(n,g.t[L],GAL,"g"+k)).join("")}</div></section>`;
  });

  // подпапки проекта — кнопки-вкладки
  if(p.dirs){
    if(caseTab>=p.dirs.length) caseTab=0;
    h+=`<section class="c-sec c-dirs" id="caseDirs"><div class="label"><span>${T.dirs}</span><span>${pad2(p.dirs.length)}</span></div>
      <div class="tabs" role="tablist">${p.dirs.map((d,k)=>`<button type="button" role="tab" data-tab="${k}" aria-selected="${k===caseTab}">${esc(d.t[L])}<sup>${d.n.length}</sup></button>`).join("")}</div>
      ${p.dirs.map((d,k)=>`<div class="gal" data-pane="${k}"${k===caseTab?"":" hidden"}>${d.n.map(n=>lbBtn(n,d.t[L],GAL,"d"+k)).join("")}</div>`).join("")}</section>`;
  }


  h+=`<div class="c-foot">
      <a href="#/${prev.id}">${T.casePrev}</a>
      <a class="next" href="#/${next.id}"><small>${T.caseNext}</small>${esc(next.t[L])}</a>
    </div>`;

  $("caseBody").innerHTML=h;
  $("caseNum").textContent=`${pad2(i+1)} / ${pad2(PROJECTS.length)}`;
}

function setTab(k){
  caseTab=k;
  document.querySelectorAll("#caseDirs [data-tab]").forEach(b=>b.setAttribute("aria-selected",+b.dataset.tab===k));
  document.querySelectorAll("#caseDirs [data-pane]").forEach(g=>g.hidden=+g.dataset.pane!==k);
  history.replaceState(null,"",`#/${caseId}/${k+1}`);
}
function openCase(id,tab){
  const changed = id!==caseId;
  caseId=id;
  if(changed||tab!==undefined) caseTab=tab||0;
  renderCase(id);
  if(changed) caseScroll.scrollTop=0;
  // переход сразу к нужной папке (#/id/N)
  if(tab!==undefined && $("caseDirs")) requestAnimationFrame(()=>{caseScroll.scrollTop=$("caseDirs").offsetTop-70;});
  caseEl.classList.add("open"); caseEl.setAttribute("aria-hidden","false");
  document.body.classList.add("locked");
  document.title = PROJECTS.find(p=>p.id===id).t[LANG]+" — Полухина дизайн";
}
function closeCase(){
  if(!caseId) return;
  caseId=null;
  caseEl.classList.remove("open"); caseEl.setAttribute("aria-hidden","true");
  document.body.classList.remove("locked");
  document.title = "Полухина дизайн";
  caseEl.querySelectorAll("video").forEach(v=>v.pause());
}
function route(){
  const m=location.hash.match(/^#\/([\w-]+)(?:\/(\d+))?/);
  if(m && PROJECTS.some(p=>p.id===m[1])) openCase(m[1], m[2]?Math.max(0,m[2]-1):undefined); else closeCase();
}
addEventListener("hashchange",route);
$("caseClose").addEventListener("click",()=>{
  // убираем #/id без прокрутки страницы
  history.pushState(null,"",location.pathname+location.search);
  closeCase();
});

/* ============ лайтбокс ============ */
const lb=$("lb");
function showLb(i){
  lbIdx=(i+lbList.length)%lbList.length;
  const it=lbList[lbIdx];
  $("lbImg").src=imgPath(it.id,it.n);
  $("lbCap").textContent=`${it.cap} · ${lbIdx+1} / ${lbList.length}`;
  lb.classList.add("open"); lb.setAttribute("aria-hidden","false");
}
function closeLb(){lb.classList.remove("open"); lb.setAttribute("aria-hidden","true");}
$("caseBody").addEventListener("click",e=>{
  const t=e.target.closest("[data-tab]"); if(t){setTab(+t.dataset.tab);return;}
  const b=e.target.closest("[data-lb]"); if(!b) return;
  const it=lbAll[+b.dataset.lb];
  lbList=lbAll.filter(x=>x.grp===it.grp);
  showLb(lbList.indexOf(it));
});
$("lbPrev").addEventListener("click",()=>showLb(lbIdx-1));
$("lbNext").addEventListener("click",()=>showLb(lbIdx+1));
$("lbClose").addEventListener("click",closeLb);
lb.addEventListener("click",e=>{if(e.target===lb) closeLb();});
let lbX=0;
lb.addEventListener("touchstart",e=>lbX=e.touches[0].clientX,{passive:true});
lb.addEventListener("touchend",e=>{const dx=e.changedTouches[0].clientX-lbX; if(Math.abs(dx)>50) showLb(lbIdx+(dx<0?1:-1));});
addEventListener("keydown",e=>{
  if(lb.classList.contains("open")){
    if(e.key==="Escape") closeLb();
    if(e.key==="ArrowLeft") showLb(lbIdx-1);
    if(e.key==="ArrowRight") showLb(lbIdx+1);
  } else if(caseId && e.key==="Escape") $("caseClose").click();
});

/* ---- «включить свет заново» ---- */
$("back").addEventListener("click",()=>scrollTo({top:0,behavior:"smooth"}));

applyLang();
route();
