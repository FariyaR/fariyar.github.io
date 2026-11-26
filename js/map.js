/* Zetaophi project map. A dotted world drawn as a star field: each project location is a star, the stars are joined
   into a constellation, and the cursor lights the dots it passes. No dependencies.
   To add a place, add a button to .cmap-places in index.html with data-lat and data-lon; the rest follows.
   Land grid: Natural Earth 110m (public domain) in a Miller projection, 144 x 66 square cells of 2.5 degrees,
   west edge 169W, top edge 78N, one bit per cell, row by row, base64. */
(function(){
  var box=document.querySelector('[data-cmap]'); if(!box) return;
  var sky=box.querySelector('.cmap-sky'), cv=sky&&sky.querySelector('canvas'), ctx=cv&&cv.getContext&&cv.getContext('2d');
  var chips=[].filter.call(box.querySelectorAll('.cmap-places button'),function(b){ return isFinite(parseFloat(b.dataset.lat))&&isFinite(parseFloat(b.dataset.lon)); }); if(!ctx||!chips.length) return;
  var read=sky.querySelector('.cmap-read');
  var GRID='AAAIBPH///AAYAAAAAwAAAAAAAAWmwD///AAAAAOAD+AAAAAAAADlfAP//AAAAAwA/+AGgAAAAA4FgAH/+AAAABgD//ACAAAAAB/3PgH/+AAAADBj//+HgAADAAvxv4D/+AAAgBD/////4AQP/P37m+D/8AAH4AL//////Dgf//9y2eD/wAAP+T////////4P////+Pj/AAAf/f////////+f////8/D8DwA98/////////2H////2HB4BgB9//////////gf////A4A4AAD7//////////Af////A8AQAAD7////////88AHA///A/AAAAD5///////+JgACAP//wfgAABhz///////4DgAAAH//8/wAABhj///////wDAAAAD//+/4AACz////////8DAAAAD////4AAA3////////+CAAAAB////sAAAf////////+AAAAAA////MAAA/////////6AAAAAA////gAAAf/35/////4AAAAAA///9AAAAfvh7/////yAAAAAA///4AAAD43s5/////CAAAAAA///wAAADwK/9////mAAAAAAA///gAAADgC/9////yEAAAAAAf//gAAAB/AD/////ycAAAAAAP//AAAAD/gD/////xgAAAAAAH/+AAAAD////////wAAAAAAAD+CAAAAH///7////wAAAAAAAC+BAAAAP//79////wAAAAAAAAeAAAAAf//9/h///gAAAAAAAAeAgAAAf//9/g/v8AAAAAAAAAOYMAAAf//+/gfH0AAAAAAAAADwAAAAf//+eAcH4IAAAAAAAAAcAAAAf///8AcB4IAAAAAAAAAEMAAAf///kAMBYAAAAAAAAAACfwAAP///8AMBAAAAAAAAAAAA/wAAH///8AAAAEAAAAAAAAAAf+AAAD//4AAChgAAAAAAAAAA//AAAB//wAABjgAAAAAAAAAB//gAAB//gAAAnggAAAAAAAAB//8AAA//AAAAzYeAAAAAAAAB///AAA/+AAAAQAHAAAAAAAAA///AAAf+AAAACAGgAAAAAAAA//+AAAf/AAAAAAAAAAAAAAAAf/8AAAf/EAAAAAyAAAAAAAAAP/8AAA//MAAAAHzAAAAAAAAAH/8AAA/+YAAAAP/AAAAAAAAAD/8AAAf8YAAAAf/gAAAAAAAAH/4AAAf8YAAAB//wAAAAAAAAH/gAAAf4QAAAB//4AAAAAAAAH/AAAAP4AAAAB//4AAAAAAAAH/AAAAPwAAAAA//4AAAAAAAAH+AAAAHgAAAAA+f4AAAAAAAAH8AAAAEAAAAAAwPwAAAAAAAAP4AAAAAAAAAAAAHwBAAAAAAAPwAAAAAAAAAAAAAABgAAAAAAPgAAAAAAAAAAAAAABAAAAAAAPAAAAAAAAAAAAAAgCAAAAAAAOAAAAAAAAAAAAAAAEAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAcAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  var COLS=144, ROWS=66, LON0=-169, YTOP=1.75494, CELL=2*Math.PI/COLS, RAD=Math.PI/180, TAU=Math.PI*2, B=12;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches, narrow=matchMedia('(max-width:680px)');
  function my(lat){ return 1.25*Math.log(Math.tan(Math.PI/4+.4*lat*RAD)); }
  function col(lon){ return (((lon-LON0)%360)+360)%360/360*COLS; }
  function row(lat){ return (YTOP-my(lat))/CELL; }
  function rnd(i){ var x=Math.sin(i*127.1+311.7)*43758.5453; return x-Math.floor(x); }
  function clamp(v,a,b){ return v<a?a:v>b?b:v; }
  /* two framings: the whole world, and on phones the band that holds every project so far (135W to 95E) */
  var FULL={c0:0,r0:0,cw:COLS,rh:ROWS}, NARROW={c0:col(-135),r0:row(72),cw:230/360*COLS,rh:row(-38)-row(72)};

  /* land dots, a few brighter ones, and sparse faint specks over the oceans so the whole panel reads as sky */
  var bin=atob(GRID), dots=[], isLand={}, i;
  for(i=0;i<COLS*ROWS;i++) if(bin.charCodeAt(i>>3)&(128>>(i&7))){ isLand[i]=1; var h=rnd(i), big=rnd(i+.37)<.025;
    dots.push({c:i%COLS+.5,r:(i/COLS|0)+.5,a:big?.78:.24+.3*h*h,s:big?1.5:1,tw:big||rnd(i+.5)<.12?.2:0,ph:rnd(i+.25)*TAU,sp:.5+rnd(i+.75)*1.3,big:big,g:1,f:0,x:0,y:0,lx:0,ly:0}); }
  for(i=0;i<130;i++){ var oc=rnd(i+900.1)*COLS, or=rnd(i+700.3)*ROWS; if(isLand[(or|0)*COLS+(oc|0)]) continue;
    dots.push({c:oc,r:or,a:.1+.18*rnd(i+500.7),s:.55+.4*rnd(i+300.9),tw:rnd(i+100.2)<.4?.1:0,ph:rnd(i+50.5)*TAU,sp:.4+rnd(i+20.4),big:false,g:.45,f:0,x:0,y:0,lx:0,ly:0}); }
  /* each brighter dot is tied to its two nearest brighter neighbours: small figures that only show under the cursor */
  var bigs=dots.filter(function(d){ return d.big; }), minor=[], seen={};
  bigs.forEach(function(a,ai){ var near=[]; bigs.forEach(function(b,bi){ if(ai===bi) return; var dc=a.c-b.c, dr=a.r-b.r, q=dc*dc+dr*dr; if(q<56) near.push({bi:bi,q:q}); });
    near.sort(function(p,q){ return p.q-q.q; }); near.slice(0,2).forEach(function(nb){ var key=ai<nb.bi?ai+'-'+nb.bi:nb.bi+'-'+ai; if(!seen[key]){ seen[key]=1; minor.push([a,bigs[nb.bi]]); } }); });

  /* project stars come from the list of places; their labels sit in an overlay so they stay crisp and themeable */
  var layer=document.createElement('div'); layer.className='cmap-stars'; layer.setAttribute('aria-hidden','true');
  var stars=chips.map(function(b,ix){ var el=document.createElement('span'), dot=document.createElement('i'), lab=document.createElement('em'), nm=b.querySelector('b'), sub=b.querySelector('span');
    el.className='cmap-star'; el.style.setProperty('--i',ix); lab.textContent=nm?nm.textContent:b.textContent;
    if(sub){ var sm=document.createElement('small'); sm.textContent=sub.textContent; lab.appendChild(sm); }
    el.appendChild(dot); el.appendChild(lab); layer.appendChild(el);
    return {btn:b,el:el,lab:lab,c:col(+b.dataset.lon),r:row(+b.dataset.lat),side:b.dataset.side||'e',act:0,x:0,y:0}; });
  sky.appendChild(layer); box.classList.add('ready');
  /* the phone framing is only used while every place sits inside it; one place further out and phones get the whole world too */
  var fitsNarrow=stars.every(function(s){ return s.c>NARROW.c0+2&&s.c<NARROW.c0+NARROW.cw-2&&s.r>NARROW.r0+1.5&&s.r<NARROW.r0+NARROW.rh-1.5; });

  /* the constellation: the shortest set of lines that joins every star, plus one extra line that closes a loop.
     The extra line is the shortest one that does not leave a star within 28 degrees of a line already there. */
  var n=stars.length, edges=[], inTree=[0];
  function gap(a,b){ var dc=stars[a].c-stars[b].c, dr=stars[a].r-stars[b].r; return Math.sqrt(dc*dc+dr*dr); }
  function has(a,b){ return edges.some(function(e){ return (e.a===a&&e.b===b)||(e.a===b&&e.b===a); }); }
  function ang(a,b){ return Math.atan2(stars[b].r-stars[a].r,stars[b].c-stars[a].c); }
  function roomFor(a,b){ return [[a,b],[b,a]].every(function(p){ var th=ang(p[0],p[1]); return edges.every(function(e){ var o=e.a===p[0]?e.b:e.b===p[0]?e.a:-1, d; if(o<0) return true; d=Math.abs(th-ang(p[0],o)); if(d>Math.PI) d=TAU-d; return d>.49; }); }); }
  while(inTree.length<n){ var best=null; inTree.forEach(function(a){ for(var b=0;b<n;b++) if(inTree.indexOf(b)<0){ var d=gap(a,b); if(!best||d<best.d) best={a:a,b:b,d:d}; } }); edges.push(best); inTree.push(best.b); }
  if(n>3){ var extra=null, ea, eb; for(ea=0;ea<n;ea++) for(eb=ea+1;eb<n;eb++) if(!has(ea,eb)&&roomFor(ea,eb)){ var ed=gap(ea,eb); if(!extra||ed<extra.d) extra={a:ea,b:eb,d:ed}; } if(extra) edges.push(extra); }
  var adj=stars.map(function(){ return []; }); edges.forEach(function(e){ adj[e.a].push(e); adj[e.b].push(e); });
  /* a pulse leaves a root star and runs outward along every line; the root is the western star at rest, or the star in focus */
  var west=0; stars.forEach(function(s,ix){ if(s.c<stars[west].c) west=ix; });
  var wave={root:-1,len:1,start:0};
  function setRoot(rt){ if(rt===wave.root) return; var t=stars.map(function(){ return Infinity; }), done=[], k, j; t[rt]=0;
    for(k=0;k<n;k++){ var u=-1; for(j=0;j<n;j++) if(!done[j]&&(u<0||t[j]<t[u])) u=j; done[u]=1; adj[u].forEach(function(e){ var v=e.a===u?e.b:e.a; if(t[u]+e.d<t[v]) t[v]=t[u]+e.d; }); }
    var mx=0; edges.forEach(function(e){ e.from=t[e.a]<=t[e.b]?e.a:e.b; e.to=e.from===e.a?e.b:e.a; e.t0=t[e.from]; mx=Math.max(mx,e.t0+e.d); });
    wave.root=rt; wave.len=mx; wave.start=performance.now(); }
  setRoot(west);

  var W=0, H=0, dpr=1, pitch=1, r0=1, view=FULL, vis=[], still=[], twink=[], DOT=[150,162,178], ACC=[56,214,233], GAIN=1, LINE=.3, dc='', ac='';
  var base=document.createElement('canvas'), bctx=base.getContext('2d');
  var ptr={x:0,y:0,ex:0,ey:0,on:false,k:0}, starHover=-1, chipHover=-1, pinned=-1, cur=-1, visible=false, shown=false, revealAt=0, raf=0, last=0, fade=0;
  /* dots are filled in a dozen alpha steps, so a frame is a handful of paths rather than thousands of fills */
  function fillDots(c,list,alphaOf){ var bk=[], ix, d, a, b;
    for(ix=0;ix<list.length;ix++){ d=list[ix]; a=alphaOf(d); if(a<.012) continue; b=Math.min(B-1,Math.round(a*B)); (bk[b]||(bk[b]=[])).push(d); }
    for(b=0;b<B;b++) if(bk[b]){ c.fillStyle=dc+((b+.5)/B).toFixed(3)+')'; c.beginPath(); for(ix=0;ix<bk[b].length;ix++){ d=bk[b][ix]; c.moveTo(d.x+r0*d.s,d.y); c.arc(d.x,d.y,r0*d.s,0,TAU); } c.fill(); } }
  /* a dot's resting alpha; the theme can lift the land dots (ink on a light page needs more weight than light on dark) */
  function restAlpha(d){ return d.g===1?Math.min(.96,d.a*GAIN):d.a; }
  /* the dots that never change are painted once to an off-screen layer and copied in each frame */
  function paintBase(){ base.width=cv.width; base.height=cv.height; bctx.setTransform(dpr,0,0,dpr,0,0); fillDots(bctx,still,restAlpha); }
  function colors(){ var cs=getComputedStyle(box), d=cs.getPropertyValue('--cmap-dot'), a=cs.getPropertyValue('--accent-rgb');
    if(d&&d.trim()) DOT=d.split(',').map(Number); if(a&&a.trim()) ACC=a.split(',').map(Number);
    GAIN=parseFloat(cs.getPropertyValue('--cmap-gain'))||1; LINE=parseFloat(cs.getPropertyValue('--cmap-line'))||.3;
    dc='rgba('+DOT.join(',')+','; ac='rgba('+ACC.join(',')+','; if(W) paintBase(); }
  function layout(){ view=narrow.matches&&fitsNarrow?NARROW:FULL; sky.style.aspectRatio=(view.cw/view.rh).toFixed(4);
    W=sky.clientWidth; if(!W) return; H=W*view.rh/view.cw; pitch=W/view.cw; r0=clamp(pitch*.19,.8,1.45); dpr=Math.min(window.devicePixelRatio||1,2);
    cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
    vis=dots.filter(function(d){ d.f=0; d.x=(d.c-view.c0)*pitch; d.y=(d.r-view.r0)*pitch; return d.x>-pitch&&d.x<W+pitch&&d.y>-pitch&&d.y<H+pitch; });
    still=vis.filter(function(d){ return reduce||!d.tw; }); twink=vis.filter(function(d){ return !reduce&&d.tw; }); paintBase();
    stars.forEach(function(s){ s.x=(s.c-view.c0)*pitch; s.y=(s.r-view.r0)*pitch; });
    /* stars that land within a few pixels of each other are nudged apart along the line between them, so each stays a separate point */
    for(var it=0;it<4;it++) for(var a=0;a<n;a++) for(var b=a+1;b<n;b++){ var dx=stars[b].x-stars[a].x, dy=stars[b].y-stars[a].y, d=Math.sqrt(dx*dx+dy*dy), m; if(d>=13) continue;
      if(d<.01){ dx=1; dy=0; d=1; } m=(13-d)/2/d; stars[a].x-=dx*m; stars[a].y-=dy*m; stars[b].x+=dx*m; stars[b].y+=dy*m; }
    stars.forEach(function(s){ s.el.style.left=(s.x/W*100).toFixed(3)+'%'; s.el.style.top=(s.y/H*100).toFixed(3)+'%'; });
    place(); if(shown) draw(performance.now()); kick(); }
  /* each label takes the side of its star that keeps it inside the map, clear of other stars, labels and lines,
     and nearer to its own star than to anyone else's; data-side on the button is only a preference. Offsets here mirror the .cmap-star[data-side] rules in site.css. */
  var SIDES=['e','w','ne','se','nw','sw','n','s'];
  function labelBox(s,side,lw,lh){ var x0=side==='e'?s.x+14:side==='w'?s.x-14-lw:side==='n'||side==='s'?s.x-lw/2:side.charAt(1)==='e'?s.x+9:s.x-9-lw,
      y0=side==='e'||side==='w'?s.y-lh/2:side==='n'?s.y-12-lh:side==='s'?s.y+12:side.charAt(0)==='n'?s.y-7-lh:s.y+7; return [x0,y0,x0+lw,y0+lh]; }
  function reach(rc,p){ var dx=Math.max(rc[0]-p.x,0,p.x-rc[2]), dy=Math.max(rc[1]-p.y,0,p.y-rc[3]); return Math.sqrt(dx*dx+dy*dy); }
  function place(){ var boxes=[], sizes=stars.map(function(s){ return [s.lab.offsetWidth,s.lab.offsetHeight]; }), pass;
    var order=stars.map(function(s,ix){ var near=0; stars.forEach(function(o){ if(o!==s&&Math.abs(o.x-s.x)<110&&Math.abs(o.y-s.y)<70) near++; }); return {ix:ix,near:near}; });
    order.sort(function(p,q){ return q.near-p.near||p.ix-q.ix; });
    function fit(ix){ var s=stars[ix], best=null;
      SIDES.forEach(function(side){ var rc=labelBox(s,side,sizes[ix][0],sizes[ix][1]), c=side===s.side?0:side.length>1?3:side==='n'||side==='s'?4:2;
        if(rc[0]<0||rc[2]>W||rc[1]<0||rc[3]>H) c+=1000;
        stars.forEach(function(q){ if(q===s) return; if(q.x>rc[0]-8&&q.x<rc[2]+8&&q.y>rc[1]-8&&q.y<rc[3]+8) c+=400; else if(reach(rc,q)<reach(rc,s)*2) c+=200; });
        boxes.forEach(function(p,pi){ if(p&&pi!==ix&&rc[0]<p[2]+3&&rc[2]>p[0]-3&&rc[1]<p[3]+3&&rc[3]>p[1]-3) c+=600; });
        edges.forEach(function(e){ var A=stars[e.a], Z=stars[e.b], steps=Math.ceil((Math.abs(Z.x-A.x)+Math.abs(Z.y-A.y))/4)||1, j, qx, qy;
          for(j=0;j<=steps;j++){ qx=A.x+(Z.x-A.x)*j/steps; qy=A.y+(Z.y-A.y)*j/steps; if(qx>rc[0]-2&&qx<rc[2]+2&&qy>rc[1]-2&&qy<rc[3]+2){ c+=120; break; } } });
        if(!best||c<best.c) best={c:c,side:side,rc:rc}; });
      boxes[ix]=best.rc; s.el.setAttribute('data-side',best.side); }
    /* the first pass places the most crowded stars first; two more passes let earlier labels move out of the way of later ones */
    for(pass=0;pass<3;pass++) order.forEach(function(o){ fit(o.ix); }); }

  function sync(){ var c=chipHover>=0?chipHover:pinned>=0?pinned:starHover; if(c===cur) return; cur=c;
    stars.forEach(function(s,ix){ s.el.classList.toggle('on',ix===cur); s.btn.classList.toggle('on',ix===cur); });
    layer.classList.toggle('has-on',cur>=0); setRoot(cur>=0?cur:west); wave.start=performance.now(); kick(); }
  function pin(ix){ pinned=ix; chips.forEach(function(b,bx){ b.setAttribute('aria-pressed',String(bx===pinned)); }); sync(); }
  function pick(){ var bi=-1, bd=Math.max(34,pitch*5); stars.forEach(function(s,ix){ var d=Math.sqrt((s.x-ptr.x)*(s.x-ptr.x)+(s.y-ptr.y)*(s.y-ptr.y)); if(d<bd){ bd=d; bi=ix; } }); return bi; }
  function at(e){ var r=sky.getBoundingClientRect(); ptr.x=e.clientX-r.left; ptr.y=e.clientY-r.top; if(!ptr.on&&ptr.k<.02){ ptr.ex=ptr.x; ptr.ey=ptr.y; } ptr.on=true; }
  function readout(){ if(!read) return; var lon=LON0+(view.c0+ptr.x/pitch)/COLS*360, lat=2.5*(Math.atan(Math.exp((YTOP-(view.r0+ptr.y/pitch)*CELL)/1.25))-Math.PI/4)/RAD;
    lon=((lon+180)%360+360)%360-180; read.textContent=Math.abs(lat).toFixed(1)+'°'+(lat<0?'S':'N')+'  '+Math.abs(lon).toFixed(1)+'°'+(lon<0?'W':'E'); }

  /* under the cursor: dots brighten toward the accent, swell, and bulge away from the centre */
  function lens(t){ var k=ptr.k, R=clamp(W*.115,64,130), R2=R*R, push=reduce?0:Math.min(6,pitch*.7), groups={}, keys, ix, d, key;
    for(ix=0;ix<vis.length;ix++){ d=vis[ix]; d.f=0; var qx=d.x-ptr.ex, qy=d.y-ptr.ey, q=qx*qx+qy*qy; if(q>=R2) continue;
      var u=Math.sqrt(q)/R, f=1-u, sh=u>0?push*Math.sin(Math.PI*u)*k/(u*R):0, a=restAlpha(d), rr=r0*d.s+.75;
      f=f*f*(3-2*f)*k*d.g; d.f=f; d.lx=d.x+qx*sh; d.ly=d.y+qy*sh; if(d.tw&&!reduce) a+=d.tw*Math.sin(t*d.sp+d.ph);
      ctx.clearRect(d.x-rr,d.y-rr,rr*2,rr*2); key=clamp(Math.round(a*B),0,B-1)*16+Math.round(f*15); (groups[key]||(groups[key]=[])).push(d); }
    keys=Object.keys(groups);
    for(ix=0;ix<keys.length;ix++){ var g=groups[keys[ix]], aq=((keys[ix]>>4)+.5)/B, fq=(keys[ix]&15)/15, j;
      ctx.fillStyle='rgba('+Math.round(DOT[0]+(ACC[0]-DOT[0])*fq)+','+Math.round(DOT[1]+(ACC[1]-DOT[1])*fq)+','+Math.round(DOT[2]+(ACC[2]-DOT[2])*fq)+','+(aq+(1-aq)*fq).toFixed(3)+')';
      ctx.beginPath(); for(j=0;j<g.length;j++){ d=g[j]; var rad=r0*d.s*(1+.85*d.f); ctx.moveTo(d.lx+rad,d.ly); ctx.arc(d.lx,d.ly,rad,0,TAU); } ctx.fill(); }
    ctx.lineWidth=.8; for(ix=0;ix<minor.length;ix++){ var m=minor[ix], mf=Math.min(m[0].f,m[1].f); if(mf>.04){ ctx.strokeStyle=ac+(mf*.7).toFixed(3)+')'; ctx.beginPath(); ctx.moveTo(m[0].lx,m[0].ly); ctx.lineTo(m[1].lx,m[1].ly); ctx.stroke(); } } }
  function line(x1,y1,x2,y2,cut,p){ var dx=x2-x1, dy=y2-y1, L=Math.sqrt(dx*dx+dy*dy); if(L<cut*2+2) return null; var ux=dx/L, uy=dy/L, len=(L-cut*2)*p;
    return {x1:x1+ux*cut,y1:y1+uy*cut,x2:x1+ux*(cut+len),y2:y1+uy*(cut+len),ux:ux,uy:uy,len:len}; }
  function draw(now){ var t=now/1000, rev=reduce||!revealAt?(shown?1:0):clamp((now-revealAt)/1500,0,1), ix;
    ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
    if(rev<=0) return;
    /* first view: the dots sweep in from the west. After that: the still layer, then the dots that twinkle */
    if(rev<1) fillDots(ctx,vis,function(d){ return (d.tw?restAlpha(d)+d.tw*Math.sin(t*d.sp+d.ph):restAlpha(d))*clamp((rev*1.35-d.x/W)*5,0,1); });
    else { ctx.drawImage(base,0,0,W,H); if(twink.length) fillDots(ctx,twink,function(d){ return restAlpha(d)+d.tw*Math.sin(t*d.sp+d.ph); }); }
    if(ptr.k>.01) lens(t);
    /* the constellation lines, drawn in from the root on first view, with a pulse running along them */
    var cut=clamp(pitch*1.5,6,11), span=reduce||!revealAt?wave.len:(now-revealAt-500)/1700*wave.len, speed=cur>=0?34:24, rest=cur>=0?.5:4.2, wt=((now-wave.start)/1000)%(wave.len/speed+rest)*speed;
    for(ix=0;ix<edges.length;ix++){ var e=edges[ix], A=stars[e.from], Z=stars[e.to], p=clamp((span-e.t0)/e.d,0,1); if(p<=0) continue;
      var seg=line(A.x,A.y,Z.x,Z.y,cut,p); if(!seg) continue; var hot=Math.max(A.act,Z.act);
      ctx.strokeStyle=ac+(LINE+(.88-LINE)*hot).toFixed(3)+')'; ctx.lineWidth=1+.4*hot; ctx.beginPath(); ctx.moveTo(seg.x1,seg.y1); ctx.lineTo(seg.x2,seg.y2); ctx.stroke();
      if(!reduce&&p>=1&&wt>=e.t0&&wt<=e.t0+e.d){ var pp=(wt-e.t0)/e.d, px=seg.x1+(seg.x2-seg.x1)*pp, py=seg.y1+(seg.y2-seg.y1)*pp, tail=Math.min(26,pp*seg.len);
        var gr=ctx.createLinearGradient(px-seg.ux*tail,py-seg.uy*tail,px,py); gr.addColorStop(0,ac+'0)'); gr.addColorStop(1,ac+'.95)');
        ctx.strokeStyle=gr; ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(px-seg.ux*tail,py-seg.uy*tail); ctx.lineTo(px,py); ctx.stroke();
        ctx.fillStyle=ac+'1)'; ctx.shadowColor=ac+'.9)'; ctx.shadowBlur=10; ctx.beginPath(); ctx.arc(px,py,1.9,0,TAU); ctx.fill(); ctx.shadowBlur=0; } } }
  /* the loop runs only while the map is on screen, and at a lower rate when nothing is being pointed at */
  function frame(now){ raf=0; if(!visible||!W) return;
    var idle=!ptr.on&&ptr.k<.01&&cur<0&&(!revealAt||now-revealAt>2400);
    if(idle&&!reduce&&now-last<40){ raf=requestAnimationFrame(frame); return; } last=now;
    if(fade&&now>fade){ fade=0; ptr.on=false; }
    if(reduce){ ptr.k=ptr.on?1:0; ptr.ex=ptr.x; ptr.ey=ptr.y; stars.forEach(function(s,ix){ s.act=ix===cur?1:0; }); }
    else { ptr.k+=((ptr.on?1:0)-ptr.k)*.12; ptr.ex+=(ptr.x-ptr.ex)*.24; ptr.ey+=(ptr.y-ptr.ey)*.24; stars.forEach(function(s,ix){ s.act+=((ix===cur?1:0)-s.act)*.16; }); }
    draw(now); if(!reduce||fade) raf=requestAnimationFrame(frame); }
  function kick(){ if(!raf&&visible) raf=requestAnimationFrame(frame); }

  sky.addEventListener('pointermove',function(e){ if(e.pointerType==='touch') return; at(e); fade=0; starHover=pick(); sky.classList.add('live'); readout(); sync(); kick(); });
  sky.addEventListener('pointerleave',function(e){ if(e.pointerType==='touch') return; ptr.on=false; starHover=-1; sky.classList.remove('live'); sync(); kick(); });
  sky.addEventListener('pointerdown',function(e){ if(e.pointerType!=='touch') return; at(e); ptr.ex=ptr.x; ptr.ey=ptr.y; fade=performance.now()+1800; kick(); });
  sky.addEventListener('pointercancel',function(){ ptr.on=false; fade=0; kick(); });
  /* a tap or click on the map pins the nearest star, or clears the pin; the start of a scroll never does */
  sky.addEventListener('click',function(e){ var r=sky.getBoundingClientRect(); ptr.x=e.clientX-r.left; ptr.y=e.clientY-r.top; pin(pick()); });
  chips.forEach(function(b,ix){ b.setAttribute('aria-pressed','false');
    b.addEventListener('pointerenter',function(e){ if(e.pointerType==='touch') return; chipHover=ix; sync(); });
    b.addEventListener('pointerleave',function(){ chipHover=-1; sync(); });
    b.addEventListener('focus',function(){ chipHover=ix; sync(); }); b.addEventListener('blur',function(){ chipHover=-1; sync(); });
    b.addEventListener('click',function(){ pin(pinned===ix?-1:ix); }); });

  colors(); layout();
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(layout);
  new MutationObserver(function(){ colors(); kick(); }).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  if(window.ResizeObserver) new ResizeObserver(function(){ if(Math.abs(sky.clientWidth-W)>.5) layout(); }).observe(sky); else addEventListener('resize',layout);
  if(narrow.addEventListener) narrow.addEventListener('change',layout);
  addEventListener('resize',function(){ if(Math.min(window.devicePixelRatio||1,2)!==dpr) layout(); });
  new IntersectionObserver(function(es){ es.forEach(function(e){ visible=e.isIntersecting; if(visible){ if(!shown&&e.intersectionRatio>=.25){ shown=true; revealAt=reduce?0:performance.now(); wave.start=performance.now()+2200; box.classList.add('in'); } kick(); } }); },{threshold:[0,.25]}).observe(sky);
  document.addEventListener('visibilitychange',function(){ if(!document.hidden) kick(); });
})();
