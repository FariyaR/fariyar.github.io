/* Fariya Raza: site behaviour. No frameworks. */
(function(){
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* theme: dark by default, light when chosen. The inline script in <head> applies the saved choice before first paint. */
  var root=document.documentElement, themeBtns=[].slice.call(document.querySelectorAll('[data-theme-toggle]')), themeMeta=document.querySelector('meta[name=theme-color]'), TK={};
  function readTokens(){ var cs=getComputedStyle(root); TK.accentRGB=cs.getPropertyValue('--accent-rgb').trim()||'56,214,233'; TK.text=cs.getPropertyValue('--text').trim()||'#EEF1F5'; }
  function applyTheme(){ var light=root.getAttribute('data-theme')==='light';
    themeBtns.forEach(function(b){ b.setAttribute('aria-label', light?'Switch to dark mode':'Switch to light mode'); });
    if(themeMeta) themeMeta.setAttribute('content', light?'#F6F8FB':'#0C0F14');
    readTokens(); }
  themeBtns.forEach(function(b){ b.addEventListener('click',function(){ var light=root.getAttribute('data-theme')!=='light';
    if(light) root.setAttribute('data-theme','light'); else root.removeAttribute('data-theme');
    try{ localStorage.setItem('theme', light?'light':'dark'); }catch(e){}
    applyTheme(); }); });
  applyTheme();

  /* nav */
  var nav=document.querySelector('.nav'), burger=document.querySelector('.burger');
  var onScroll=function(){ if(nav) nav.classList.toggle('scrolled', scrollY>8); };
  addEventListener('scroll',onScroll,{passive:true}); onScroll();
  if(burger) burger.addEventListener('click',function(){ var o=nav.classList.toggle('open'); burger.setAttribute('aria-expanded',o); });

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
    function paint(){ sats.forEach(function(s){ var g=s.glow; s.halo.style.opacity=(g*.55).toFixed(3); s.pill.setAttribute('stroke','rgba('+TK.accentRGB+','+(.22+.78*g).toFixed(3)+')'); s.pill.style.fill=g>.02?'rgba('+TK.accentRGB+','+(g*.16).toFixed(3)+')':''; s.tx.style.fill=g>.5?TK.text:''; });
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

  /* calculator */
  var H=document.getElementById('c-hours'); if(H){
    var P=document.getElementById('c-people'),R=document.getElementById('c-rate');
    var $=function(id){return document.getElementById(id)}, usd=function(n){return '$'+Math.round(n).toLocaleString('en-US')};
    function calc(){ var h=+H.value,p=+P.value,r=+R.value, hm=h*p*4.33, cm=hm*r;
      $('o-hours-in').value=h; $('o-people-in').value=p; $('o-rate-in').value='$'+r;
      $('o-hours').textContent=Math.round(hm).toLocaleString('en-US')+' h'; $('o-month').textContent=usd(cm); $('o-year').textContent=usd(cm*12);
      $('o-fte').textContent=(hm/160).toFixed(2)+' FTE'; $('o-weeks').textContent='≈ '+(hm/40).toFixed(1)+' work weeks of one full-time person, per month'; }
    [H,P,R].forEach(function(i){i.addEventListener('input',calc)}); calc(); }

  /* intake form: honest states, no-JS fallback keeps action attribute */
  var form=document.getElementById('intake'); if(form){
    var st=document.getElementById('f-status'), btn=form.querySelector('button[type=submit]');
    if(new URLSearchParams(location.search).has('sent')){ document.getElementById('done').classList.add('show'); form.hidden=true; history.replaceState({},'',location.pathname); }
    var t=new URLSearchParams(location.search).get('type'), sel=document.getElementById('ptype'); if(t&&sel){ for(var i=0;i<sel.options.length;i++){ if(sel.options[i].value===t){sel.selectedIndex=i;break;} } }
    form.addEventListener('submit',function(e){ e.preventDefault(); btn.disabled=true; st.className='status'; st.textContent='Sending…';
      fetch(form.action,{method:'POST',headers:{'Accept':'application/json'},body:new FormData(form)}).then(function(r){return r.json()}).then(function(d){
        if(d.success){ st.className='status ok'; st.textContent='Delivered.'; document.getElementById('done').classList.add('show'); form.hidden=true; document.getElementById('done').scrollIntoView({behavior:'smooth',block:'center'}); }
        else throw new Error(); }).catch(function(){ btn.disabled=false; st.className='status err'; st.textContent='Something went wrong. Please retry, or email sy.faraza2899@gmail.com. Your text is still here.'; }); });
  }
})();
