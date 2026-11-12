/* Fariya Raza: site behaviour. No frameworks. */
(function(){
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* nav */
  var nav=document.querySelector('.nav'), burger=document.querySelector('.burger');
  var onScroll=function(){ if(nav) nav.classList.toggle('scrolled', scrollY>8); };
  addEventListener('scroll',onScroll,{passive:true}); onScroll();
  if(burger) burger.addEventListener('click',function(){ var o=nav.classList.toggle('open'); burger.setAttribute('aria-expanded',o); });

  /* theme toggle (dark by default; choice remembered on this device) */
  var root=document.documentElement, tbtn=document.querySelector('[data-theme-toggle]'), tmeta=document.querySelector('meta[name=theme-color]');
  function applyTheme(light){ if(light) root.setAttribute('data-theme','light'); else root.removeAttribute('data-theme');
    if(tmeta) tmeta.setAttribute('content',light?'#F5F7FA':'#0C0F14');
    if(tbtn){ tbtn.setAttribute('aria-label',light?'Switch to dark theme':'Switch to light theme'); tbtn.setAttribute('aria-pressed',String(light)); }
    try{ localStorage.setItem('theme',light?'light':'dark'); }catch(e){} }
  if(tbtn){ tbtn.setAttribute('aria-pressed',String(root.getAttribute('data-theme')==='light')); if(root.getAttribute('data-theme')==='light') tbtn.setAttribute('aria-label','Switch to dark theme');
    tbtn.addEventListener('click',function(){ applyTheme(root.getAttribute('data-theme')!=='light'); }); }

  /* reveals */
  var io=new IntersectionObserver(function(es){es.forEach(function(e){ if(e.isIntersecting){e.target.classList.add('in'); io.unobserve(e.target);} });},{threshold:.12});
  document.querySelectorAll('[data-reveal]').forEach(function(el){io.observe(el)});

  /* hero: rotating problem line (fixed box, text only) */
  /* rotating words in the hero */
  var rot=document.querySelector('[data-rotate]');
  if(rot && !reduce){ var items=JSON.parse(rot.dataset.rotate), ri=0;
    setInterval(function(){ ri=(ri+1)%items.length; rot.style.opacity=0; rot.style.transform='translateY(6px)';
      setTimeout(function(){ rot.textContent=items[ri]; rot.style.opacity=1; rot.style.transform='none'; },220); },3200); }

  /* stacked service cards: earlier cards shrink as the next one covers them */
  var stack=[].slice.call(document.querySelectorAll('.stack-card'));
  if(stack.length && !reduce){ var stk=function(){ stack.forEach(function(c,i){ var r=c.getBoundingClientRect(), top=96+i*16; var covered=Math.max(0,Math.min(1,(top-r.top+1)/1)); var next=stack[i+1]; if(next){ var nr=next.getBoundingClientRect(); var p=Math.max(0,Math.min(1,(r.bottom-nr.top)/r.height)); c.style.transform='scale('+(1-p*.05)+')'; c.style.opacity=1-p*.35; } }); }; addEventListener('scroll',stk,{passive:true}); stk(); }

  /* robot scenes: parallax, holograms, click-to-open mini interface (paused when hidden / offscreen) */
  document.querySelectorAll('.robot-scene').forEach(function(scene){
    var robot=scene.querySelector('.robot'), cards=[].slice.call(scene.querySelectorAll('.holo .card')), panel=scene.querySelector('.holo-panel');
    var wires=scene.querySelector('.holo-wires'), pre=wires?wires.dataset.prefix:'', ORG=scene.classList.contains('small')?{x:40,y:58}:{x:81,y:47};
    function wire(){ if(!wires) return; var sr=scene.getBoundingClientRect(); if(!sr.width||!sr.height) return;
      cards.forEach(function(c){ var p=document.getElementById(pre+c.dataset.holo); if(!p) return; var r=c.getBoundingClientRect();
        var onLeft=(r.left+r.width/2)<sr.left+sr.width/2;
        var ex=((onLeft?r.right:r.left)-sr.left)/sr.width*100, ey=(r.top+r.height/2-sr.top)/sr.height*100;
        var c1x=ORG.x-(ORG.x-ex)*.35, c1y=ORG.y-18, c2x=ex+(onLeft?6:-6), c2y=ey;
        p.setAttribute('d','M'+ORG.x+' '+ORG.y+' C '+c1x+' '+c1y+', '+c2x+' '+c2y+', '+ex+' '+ey); }); }
    wire(); addEventListener('resize',wire);
    var tx=0,ty=0,cx=0,cy=0,t=0,idle=true,running=false,visible=false;
    scene.addEventListener('mousemove',function(e){var r=scene.getBoundingClientRect(); tx=((e.clientX-r.left)/r.width-.5)*2; ty=((e.clientY-r.top)/r.height-.5)*2; idle=false;});
    scene.addEventListener('mouseleave',function(){idle=true});
    function closePanel(){ if(!panel) return; panel.classList.remove('show'); panel.hidden=true; cards.forEach(function(x){x.setAttribute('aria-expanded','false')}); }
    cards.forEach(function(c,k){
      c.addEventListener('click',function(){ if(!panel||!c.dataset.items) return; var o=c.getAttribute('aria-expanded')==='true'; closePanel(); if(o) return;
        c.setAttribute('aria-expanded','true'); panel.querySelector('#hp-title').textContent=c.dataset.title; var hi=panel.querySelector('#hp-img'); if(hi){ if(c.dataset.img){hi.src=c.dataset.img; hi.hidden=false;} else hi.hidden=true; }
        panel.querySelector('#hp-list').innerHTML=c.dataset.items.split('|').map(function(x,i){return '<li><span>0'+(i+1)+'</span>'+x+'</li>'}).join('');
        panel.hidden=false; panel.classList.add('show'); panel.querySelector('[data-close]').focus(); });
      if(!reduce){ c.style.opacity=0; setTimeout(function(){ c.style.transition='opacity .5s,transform .5s,border-color .2s,box-shadow .2s'; c.style.opacity=1; },500+k*160); } });
    if(panel){ panel.querySelector('[data-close]').addEventListener('click',closePanel); document.addEventListener('keydown',function(e){ if(e.key==='Escape') closePanel(); }); }
    function frame(){ if(!running) return; t+=.016;
      if(idle){ tx*=.96; ty*=.96; }
      cx+=(tx-cx)*.06; cy+=(ty-cy)*.06;
      if(robot && !scene.classList.contains('small')) robot.style.transform='rotateY('+(cx*3)+'deg) rotateX('+(-cy*2)+'deg)';
      cards.forEach(function(c,k){ var d=1+k*.35; c.style.transform='translate('+(cx*8*d)+'px,'+(cy*6*d + Math.sin(t*1.1+k)*3)+'px)'; });
      wire(); requestAnimationFrame(frame); }
    function start(){ if(reduce||running||!visible||document.hidden) return; running=true; requestAnimationFrame(frame); }
    function stop(){ running=false; }
    new IntersectionObserver(function(es){ visible=es[0].isIntersecting; visible?start():stop(); }).observe(scene);
    document.addEventListener('visibilitychange',function(){ document.hidden?stop():start(); });
  });

  /* Betterlab-style mask-line heading reveals */
  document.querySelectorAll('h2.mask').forEach(function(h){ var parts=h.innerHTML.split(/<br\s*\/?>/i); h.innerHTML=parts.map(function(x){return '<span class="ml"><span>'+x+'</span></span>'}).join(''); });
  var mio=new IntersectionObserver(function(es){es.forEach(function(e){ if(e.isIntersecting){e.target.classList.add('in'); mio.unobserve(e.target);} });},{threshold:.4});
  document.querySelectorAll('h2.mask').forEach(function(h){ if(reduce) h.classList.add('in'); else mio.observe(h); });

  /* flow diagram pulses only while visible */
  var flow=document.querySelector('[data-flow]');
  if(flow) new IntersectionObserver(function(es){ flow.classList.toggle('on',es[0].isIntersecting); }).observe(flow);

  /* use-case stack: cards behind shrink and dim as the next one covers them */
  var ucs=[].slice.call(document.querySelectorAll('.uc'));
  if(ucs.length && !reduce){ var ucf=function(){ ucs.forEach(function(w,i){ var card=w.firstElementChild, next=ucs[i+1]; if(!next) return; var r=next.getBoundingClientRect(); var p=Math.max(0,Math.min(1,1-r.top/innerHeight)); card.style.transform='scale('+(1-p*.06)+') translateY('+(-p*24)+'px)'; card.style.opacity=1-p*.5; }); }; addEventListener('scroll',ucf,{passive:true}); ucf(); }

  /* orbit: pills sized to their labels; packets travel the spokes and nodes glow as they arrive */
  var orbit=document.querySelector('[data-orbit]');
  if(orbit){
    var ocx=+orbit.dataset.cx, ocy=+orbit.dataset.cy, coreGlow=orbit.querySelector('.core-glow'), CORE_R=46;
    var sats=[].slice.call(orbit.querySelectorAll('.sat')).map(function(g){ return {g:g,pill:g.querySelector('.pill'),halo:g.querySelector('.halo'),tx:g.querySelector('text'),x:+g.dataset.x,y:+g.dataset.y,glow:0}; });
    function fit(){ sats.forEach(function(s){ var w=Math.ceil(s.tx.getBBox().width)+30; s.pill.setAttribute('width',w); s.pill.setAttribute('x',-w/2); s.halo.setAttribute('width',w+6); s.halo.setAttribute('x',-(w+6)/2); }); }
    fit(); if(document.fonts&&document.fonts.ready) document.fonts.ready.then(fit);
    var pks=[].slice.call(orbit.querySelectorAll('.pk')).map(function(c){ var k=+c.dataset.k; return {el:c,s:sats[k],out:c.dataset.dir==='out',phase:(k*0.17)%1,speed:1/3400}; });
    var coreG=0, last=0, running=false, vis=false;
    function paint(){ sats.forEach(function(s){ var g=s.glow; s.halo.style.opacity=(g*.55).toFixed(3); s.pill.style.stroke='rgba(var(--accent-rgb),'+(.22+.78*g).toFixed(3)+')'; s.pill.style.fill=g>.02?'rgba(var(--accent-rgb),'+(g*.16).toFixed(3)+')':''; s.tx.style.fill=g>.5?'var(--text)':''; });
      if(coreGlow) coreGlow.style.opacity=(coreG*.5).toFixed(3); }
    function frame(ts){ if(!running) return; var dt=last?Math.min(48,ts-last):16; last=ts;
      sats.forEach(function(s){ s.glow=Math.max(0,s.glow-dt/520); }); coreG=Math.max(0,coreG-dt/520);
      pks.forEach(function(p){ p.phase+=dt*p.speed; if(p.phase>=1.25){ p.phase=0; }
        var t=Math.min(1,p.phase); var u=p.out?t:1-t; /* u: 0 at the orb's rim, 1 at the pill's border */
        var dx=p.s.x-ocx, dy=p.s.y-ocy, len=Math.sqrt(dx*dx+dy*dy), nx=dx/len, ny=dy/len;
        var w2=(+p.s.pill.getAttribute('width')||120)/2+3, h2=20; /* half pill size plus a small gap */
        var tEdge=Math.min(Math.abs(nx)>1e-6?w2/Math.abs(nx):1e9, Math.abs(ny)>1e-6?h2/Math.abs(ny):1e9);
        var x0=ocx+nx*CORE_R, y0=ocy+ny*CORE_R, x1=p.s.x-nx*tEdge, y1=p.s.y-ny*tEdge;
        var x=x0+(x1-x0)*u, y=y0+(y1-y0)*u; p.el.setAttribute('cx',x); p.el.setAttribute('cy',y);
        p.el.style.opacity=p.phase>=1?0:(t<.08?t/.08:1);
        var near=p.out?u:1-u; /* proximity to the node for outbound, to the core for inbound */
        if(p.out){ if(u>.82) p.s.glow=Math.max(p.s.glow,(u-.82)/.18); }
        else { if(u<.18) coreG=Math.max(coreG,(.18-u)/.18); if(t<.1) p.s.glow=Math.max(p.s.glow,1-t/.1); } });
      paint(); requestAnimationFrame(frame); }
    function start(){ if(reduce||running||!vis||document.hidden) return; running=true; last=0; requestAnimationFrame(frame); }
    function stop(){ running=false; }
    new IntersectionObserver(function(es){ vis=es[0].isIntersecting; vis?start():stop(); },{threshold:.2}).observe(orbit);
    document.addEventListener('visibilitychange',function(){ document.hidden?stop():start(); });
    if(reduce){ pks.forEach(function(p){p.el.style.display='none'}); }
  }

  /* how-I-build: one line drawn on scroll */
  var steps=document.getElementById('steps');
  if(steps){ var segs=[].slice.call(steps.querySelectorAll('.seg')), scards=[].slice.call(steps.querySelectorAll('.card'));
    var layout=function(){ var sr=steps.getBoundingClientRect(); segs.forEach(function(sg,i){ var a=scards[i], b=scards[i+1]; if(!a||!b) return; var ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect();
        if(rb.left<=ra.right){ sg.style.display='none'; return; } sg.style.display=''; sg.style.left=(ra.right-sr.left)+'px'; sg.style.width=(rb.left-ra.right)+'px'; }); };
    var draw=function(){ var r=steps.getBoundingClientRect(), vh=innerHeight; var P=Math.min(1,Math.max(0,(vh-r.top-40)/(vh*.55+r.height*.35)));
      if(reduce) P=1;
      scards[0].classList.toggle('on',P>.04);
      segs.forEach(function(sg,i){ var n=segs.length, s0=(i+.15)/n, s1=(i+1)/n; var f=Math.min(1,Math.max(0,(P-s0)/(s1-s0))); sg.firstElementChild.style.width=(f*100)+'%'; if(scards[i+1]) scards[i+1].classList.toggle('on',f>=.999); }); };
    layout(); draw(); addEventListener('scroll',draw,{passive:true}); addEventListener('resize',function(){layout();draw();});
    if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){layout();draw();}); }

  /* pipelines: hover/click explains, play walks the steps, retry loop visible */
  document.querySelectorAll('.pipe-wrap').forEach(function(w){
    var btns=[].slice.call(w.querySelectorAll('.pipe button')), note=w.querySelector('.pipe-note'), play=w.querySelector('[data-play]');
    var retry=w.dataset.retry?w.dataset.retry.split(',').map(Number):null, timer=null;
    function show(b){ btns.forEach(function(x){x.setAttribute('aria-expanded',x===b?'true':'false')}); note.innerHTML='<b>'+b.textContent+'</b>: '+b.dataset.note; }
    btns.forEach(function(b){ b.setAttribute('aria-expanded','false'); b.addEventListener('mouseenter',function(){show(b)}); b.addEventListener('focus',function(){show(b)}); b.addEventListener('click',function(){show(b)}); });
    var auto=true, seq=btns.map(function(b,i){return i}); if(retry) seq.splice(retry[0]+1,0,retry[1],retry[0]);
    var k=0, paused=!!reduce, hover=false;
    function clear(){ btns.forEach(function(x){x.classList.remove('lit','fail','pass')}); }
    function step(){ clear(); if(k>=seq.length){ k=0; timer=setTimeout(step,1400); return; }
      var b=btns[seq[k]]; b.classList.add('lit'); if(!hover) show(b);
      if(retry&&k===retry[0]+1){ var g=btns[retry[0]]; g.classList.add('fail'); if(!hover) note.innerHTML='<b>'+g.textContent+'</b>: FAIL <span class="pipe-retry">→ RETRY with the failure reason → CORRECT → re-check</span>'; }
      if(retry&&k===retry[0]+3){ b.classList.add('pass'); if(!hover) note.innerHTML='<b>'+b.textContent+'</b>: PASS. '+b.dataset.note; }
      k++; timer=setTimeout(step,retry&&k===retry[0]+2?1300:950); }
    function run(){ if(timer||paused) return; step(); }
    function halt(){ clearTimeout(timer); timer=null; }
    w.addEventListener('mouseenter',function(){hover=true}); w.addEventListener('mouseleave',function(){hover=false});
    if(play) play.addEventListener('click',function(){ paused=!paused; play.textContent=paused?'Play':'Pause'; play.setAttribute('aria-pressed',String(!paused)); if(paused){halt();clear();} else run(); });
    new IntersectionObserver(function(es){ es[0].isIntersecting?run():halt(); },{threshold:.3}).observe(w);
    document.addEventListener('visibilitychange',function(){ document.hidden?halt():run(); });
    if(reduce&&play){ play.textContent='Play'; play.setAttribute('aria-pressed','false'); }
  });

  /* calculator: one init for the page and for the pop-up (root = the [data-calc] block) */
  function initCalc(root, base){
    var H=root.querySelector('#c-hours'), P=root.querySelector('#c-people'), R=root.querySelector('#c-rate'); if(!H||!P||!R) return;
    var $=function(id){return root.querySelector('#'+id)}, usd=function(n){return '$'+Math.round(n).toLocaleString('en-US')}, cta=root.querySelector('[data-calc-cta]');
    function calc(){ var h=+H.value,p=+P.value,r=+R.value, hm=h*p*4.33, cm=hm*r;
      $('o-hours-in').value=h; $('o-people-in').value=p; $('o-rate-in').value='$'+r;
      $('o-hours').textContent=Math.round(hm).toLocaleString('en-US')+' h'; $('o-month').textContent=usd(cm); $('o-year').textContent=usd(cm*12);
      $('o-fte').textContent=(hm/160).toFixed(2)+' FTE'; $('o-weeks').textContent='≈ '+(hm/40).toFixed(1)+' work weeks of one full-time person, per month';
      if(cta) cta.href=(base||'')+'start-a-project.html?est='+encodeURIComponent(usd(cm*12)+' per year ('+h+' h/week × '+p+' people × $'+r+'/h)'); }
    var d=(document.body.dataset.calcDefaults||'').split(','); if(d.length===3&&d.every(function(x){return x&&!isNaN(x)})){ H.value=d[0]; P.value=d[1]; R.value=d[2]; }
    [H,P,R].forEach(function(i){i.addEventListener('input',calc)}); calc(); }
  var calcOnPage=document.querySelector('[data-calc]'); if(calcOnPage) initCalc(calcOnPage,'');

  /* calculator pop-up: floating button bottom-right on every other page, a nudge bubble pointing at it, and a dialog filled from calculator.html */
  var calcLink=document.querySelector('.nav a[href$="calculator.html"]');
  if(!calcOnPage && calcLink){
    var calcHref=calcLink.getAttribute('href'), calcBase=calcHref.replace(/calculator\.html$/,'');
    var fab=document.createElement('a'); fab.className='calc-fab'; fab.href=calcHref; fab.setAttribute('aria-haspopup','dialog');
    fab.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h2M12 11h2M16 11h2M8 15h2M12 15h2M16 15h2M8 19h2M12 19h2M16 19h2"/></svg><span class="long">What’s manual work costing you?</span><span class="short">Cost calculator</span>';
    var nudge=document.createElement('div'); nudge.className='calc-nudge'; nudge.hidden=true;
    nudge.innerHTML='<p><b>Three sliders, ten seconds.</b> See what repetitive work costs your team per year.</p><button type="button" aria-label="Dismiss">×</button>';
    var dlg=document.createElement('dialog'); dlg.className='calc-modal'; dlg.setAttribute('aria-labelledby','cm-title');
    dlg.innerHTML='<div class="cm-head"><div><span class="eyebrow">Planning calculator</span><h2 id="cm-title">What is manual work costing you?</h2></div><button type="button" class="cm-close" aria-label="Close">×</button></div><div class="cm-body"><p class="muted">Loading the calculator…</p></div><div class="cm-foot"><a href="'+calcHref+'">Open the full calculator ↗</a></div>';
    document.body.appendChild(fab); document.body.appendChild(nudge); document.body.appendChild(dlg);
    var cmBody=dlg.querySelector('.cm-body'), loading=null;
    function loadCalc(){ if(!loading) loading=fetch(calcHref,{credentials:'same-origin'}).then(function(r){ if(!r.ok) throw new Error(r.status); return r.text(); }).then(function(html){
        var c=new DOMParser().parseFromString(html,'text/html').querySelector('[data-calc]'); if(!c) throw new Error('no calculator');
        cmBody.innerHTML=''; cmBody.appendChild(document.importNode(c,true)); initCalc(cmBody,calcBase); }).catch(function(e){ loading=null; throw e; });
      return loading; }
    function hideNudge(){ nudge.hidden=true; try{ sessionStorage.setItem('calc-nudge','1'); }catch(e){} }
    nudge.querySelector('button').addEventListener('click',hideNudge);
    var seen=false; try{ seen=sessionStorage.getItem('calc-nudge')==='1'; }catch(e){}
    if(!seen) setTimeout(function(){ if(dlg.open) return; nudge.hidden=false; loadCalc().catch(function(){}); },3500);
    var warm=function(){ loadCalc().catch(function(){}); }; fab.addEventListener('mouseenter',warm,{once:true}); fab.addEventListener('focus',warm,{once:true});
    if(typeof dlg.showModal==='function'){
      var openCalc=function(e){ e.preventDefault(); hideNudge(); dlg.showModal(); document.body.classList.add('modal-open');
        loadCalc().then(function(){ var f=cmBody.querySelector('input'); if(f&&!matchMedia('(pointer:coarse)').matches) f.focus(); }).catch(function(){ dlg.close(); location.href=calcHref; }); };
      fab.addEventListener('click',openCalc); document.querySelectorAll('[data-calc-open]').forEach(function(a){ a.addEventListener('click',openCalc); });
      dlg.querySelector('.cm-close').addEventListener('click',function(){ dlg.close(); });
      dlg.addEventListener('click',function(e){ if(e.target===dlg) dlg.close(); });
      dlg.addEventListener('close',function(){ document.body.classList.remove('modal-open'); fab.focus(); });
    }
  }

  /* guided services pages: the hub lists industries (real links); each industry page holds its areas and services and keeps the choice in the URL hash (#area or #area/row) */
  var guide=document.querySelector('[data-guide]');
  if(guide){
    var panels=[].slice.call(guide.querySelectorAll('.panel')), steps=guide.querySelectorAll('.gsteps li'), crumbI=guide.querySelector('[data-crumb=industry]'), crumbA=guide.querySelector('[data-crumb=area]');
    var fixedInd=guide.dataset.industry||'', hubHref=guide.dataset.hub||'';
    var SCOPES={'AI systems':'2–6 weeks','Automation':'3 days – 2 weeks','Data systems':'multi-week','AI products':'4–8 weeks'}, TIERS={'quick win':'Quick win · days to 2 weeks','standard build':'Standard build · 2–6 weeks','complex system':'Complex system · multi-week'};
    function nameOf(sel){ var a=guide.querySelector(sel); return a?a.querySelector('.t').firstChild.textContent:''; }
    function parseHash(){ var h=location.hash.replace(/^#/,''), p=h?h.split('/'):[]; return fixedInd?{ind:fixedInd,area:p[0]||'',hit:p[1]||''}:{ind:p[0]||'',area:p[1]||'',hit:''}; }
    function show(first){ var ph=parseHash(), ind=ph.ind, area=ph.area;
      var target=area?guide.querySelector('.panel[data-panel=services][data-industry="'+ind+'"][data-area="'+area+'"]'):ind?guide.querySelector('.panel[data-panel=area][data-industry="'+ind+'"]'):null;
      if(!target){ target=guide.querySelector('.panel[data-panel=industry]')||guide.querySelector('.panel[data-panel=area]'); area=''; if(!fixedInd) ind=''; }
      panels.forEach(function(p){ p.classList.toggle('on',p===target); });
      var step=target.dataset.panel, order=['industry','area','services'];
      steps.forEach(function(li){ var k=li.dataset.step; li.classList.toggle('is-cur',k===step); li.classList.toggle('is-done',order.indexOf(k)<order.indexOf(step)); });
      if(fixedInd) crumbI.innerHTML='<a href="'+hubHref+'">'+(guide.dataset.industryName||'')+'</a>';
      crumbA.innerHTML=area?'<a href="#">'+nameOf('.panel[data-industry="'+ind+'"] .pick a[data-pick="'+area+'"]')+'</a>':'';
      if(step==='services'){ document.body.dataset.calcDefaults=target.dataset.calcPreset||''; var d=(target.dataset.calcPreset||'').split(','), ids=['c-hours','c-people','c-rate'];
        ids.forEach(function(id,i){ var el=document.querySelector('dialog.calc-modal #'+id); if(el&&d[i]){ el.value=d[i]; el.dispatchEvent(new Event('input')); } });
        if(ph.hit!==''){ var li=target.querySelectorAll('.services > li')[+ph.hit]; if(li){ li.classList.remove('hit'); void li.offsetWidth; li.classList.add('hit'); setTimeout(function(){ li.scrollIntoView({block:'center',behavior:reduce?'auto':'smooth'}); },80); } } }
      if(!first&&ph.hit===''){ var top=guide.getBoundingClientRect().top+scrollY-84; if(scrollY>top) scrollTo({top:top,behavior:reduce?'auto':'smooth'}); target.querySelector('.q').focus({preventScroll:true}); } }
    addEventListener('hashchange',function(){show(false)}); show(true);

    /* keyword search: the industry page indexes its own panels; the hub fetches data.json and links into the industry pages */
    var gs=guide.querySelector('#gs'), gsClear=guide.querySelector('.gs-clear'), results=guide.querySelector('.panel[data-panel=results]'), idx=[], idxReady=null;
    if(gs&&results){
      function fromPanels(){ guide.querySelectorAll('.panel[data-panel=services]').forEach(function(p){ var crumb=p.querySelector('.eyebrow').textContent, hook=p.querySelector('.q').textContent;
        [].forEach.call(p.querySelectorAll('.services > li'),function(li,i){ idx.push({href:'#'+p.dataset.area+'/'+i,crumb:crumb,hook:hook,name:li.querySelector('b').textContent,what:li.querySelector('p').textContent,human:li.querySelector('.who').textContent,cap:li.querySelector('.cap').firstChild.textContent,scope:li.querySelector('.cap small').textContent}); }); }); }
      function loadIndex(){ if(idxReady) return idxReady;
        if(guide.querySelector('.panel[data-panel=services]')||!guide.dataset.data){ fromPanels(); idxReady=Promise.resolve(); return idxReady; }
        idxReady=fetch(guide.dataset.data).then(function(r){ return r.json(); }).then(function(data){ data.forEach(function(ind){ ind.areas.forEach(function(a){ a.services.forEach(function(s,i){
          idx.push({href:ind.slug+'/#'+a.slug+'/'+i,crumb:ind.name+' · '+a.name,hook:a.hook,name:s.name,what:s.what,human:s.human,cap:s.capability,scope:TIERS[s.tier]||SCOPES[s.capability]||''}); }); }); }); }).catch(function(){ idxReady=null; });
        return idxReady; }
      var esc=function(x){ return x.replace(/[&<>"]/g,function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]; }); };
      var toks=function(q){ return q.toLowerCase().split(/[^a-z0-9+]+/).filter(function(t){ return t.length>=2; }); };
      function scoreOf(it,ts,all){ var s=0, hit=0; ts.forEach(function(t){ var n=it.name.toLowerCase().indexOf(t)>=0, c=it.crumb.toLowerCase().indexOf(t)>=0, h=it.hook.toLowerCase().indexOf(t)>=0, w=(it.what+' '+it.human).toLowerCase().indexOf(t)>=0;
          if(n) s+=4; else if(c) s+=3; else if(h) s+=2; else if(w) s+=1; if(n||c||h||w) hit++; }); return (all&&hit<ts.length)?0:s; }
      function mark(text,ts){ var out=esc(text); if(!ts.length) return out; var re=new RegExp('('+ts.map(function(t){ return t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }).join('|')+')','gi'); return out.replace(re,'<mark>$1</mark>'); }
      function render(){ var q=gs.value.trim(), ts=toks(q); gsClear.hidden=!q;
        if(!ts.length){ if(results.classList.contains('on')){ results.classList.remove('on'); show(true); } return; }
        var hits=idx.map(function(it){ return {it:it,s:scoreOf(it,ts,true)}; }).filter(function(h){ return h.s>0; });
        if(!hits.length) hits=idx.map(function(it){ return {it:it,s:scoreOf(it,ts,false)}; }).filter(function(h){ return h.s>0; });
        hits.sort(function(a,b){ return b.s-a.s; }); hits=hits.slice(0,12);
        var head=hits.length?'<span class="eyebrow">Search</span><h2 class="q" tabindex="-1">'+hits.length+(hits.length===1?' service matches ':' services match ')+'<em>“'+esc(q)+'”</em>.</h2>'
          :'<span class="eyebrow">Search</span><h2 class="q" tabindex="-1">Nothing matches <em>“'+esc(q)+'”</em> yet.</h2><p class="lede">Try another word, pick an industry below, or <a href="'+(fixedInd?'../../':'../')+'start-a-project.html">describe the work</a> and I’ll tell you whether a machine should do it.</p>';
        results.innerHTML=head+(hits.length?'<ol class="results">'+hits.map(function(h){ var it=h.it; return '<li><a href="'+it.href+'"><div><span class="crumb">'+esc(it.crumb)+'</span><b>'+mark(it.name,ts)+'</b><p>'+mark(it.what,ts)+'</p></div><span class="cap">'+esc(it.cap)+'<small>'+esc(it.scope)+'</small></span></a></li>'; }).join('')+'</ol>':'');
        panels.forEach(function(p){ p.classList.remove('on'); }); results.classList.add('on');
        results.querySelectorAll('.results a').forEach(function(a){ a.addEventListener('click',function(){ gs.value=''; gsClear.hidden=true; }); }); }
      var tmr; gs.addEventListener('input',function(){ clearTimeout(tmr); loadIndex().then(function(){ tmr=setTimeout(render,70); }); });
      gs.addEventListener('focus',function(){ loadIndex(); },{once:true});
      gs.addEventListener('keydown',function(e){ if(e.key==='Enter'){ var a=results.querySelector('.results a'); if(a) a.click(); } if(e.key==='Escape'){ gs.value=''; render(); } });
      gsClear.addEventListener('click',function(){ gs.value=''; render(); gs.focus(); });
      guide.querySelectorAll('.gs-hints button').forEach(function(b){ b.addEventListener('click',function(){ gs.value=b.textContent; loadIndex().then(render); gs.focus(); }); });
    }
  }

  /* intake form: honest states, no-JS fallback keeps action attribute */
  var form=document.getElementById('intake'); if(form){
    var st=document.getElementById('f-status'), btn=form.querySelector('button[type=submit]');
    if(new URLSearchParams(location.search).has('sent')){ document.getElementById('done').classList.add('show'); form.hidden=true; history.replaceState({},'',location.pathname); }
    var t=new URLSearchParams(location.search).get('type'), sel=document.getElementById('ptype'); if(t&&sel){ for(var i=0;i<sel.options.length;i++){ if(sel.options[i].value===t){sel.selectedIndex=i;break;} } }
    var est=new URLSearchParams(location.search).get('est'), ta=form.querySelector('textarea'); if(est&&ta&&!ta.value){ ta.value='Planning estimate from the calculator: '+est+'.\n\nWhat is still done by hand: '; ta.focus(); try{ ta.setSelectionRange(ta.value.length,ta.value.length); }catch(e){} }
    form.addEventListener('submit',function(e){ e.preventDefault(); btn.disabled=true; st.className='status'; st.textContent='Sending…';
      fetch(form.action,{method:'POST',headers:{'Accept':'application/json'},body:new FormData(form)}).then(function(r){return r.json()}).then(function(d){
        if(d.success){ st.className='status ok'; st.textContent='Delivered.'; document.getElementById('done').classList.add('show'); form.hidden=true; document.getElementById('done').scrollIntoView({behavior:'smooth',block:'center'}); }
        else throw new Error(); }).catch(function(){ btn.disabled=false; st.className='status err'; st.textContent='Something went wrong. Please retry, or email contact@zetaophi.com. Your text is still here.'; }); });
  }
})();
