(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const cfg = window.JSONBIN_CONFIG || {};
  const BIN = cfg.BIN_ID;
  const KEY = cfg.ACCESS_KEY || cfg.UPDATE_ACCESS_KEY || '';
  const API = BIN ? `https://api.jsonbin.io/v3/b/${BIN}/latest` : '';

  const state = {
    locations: [], routesByLocation: {}, routePoints: [], routeSettings: {x:64.2,y:83.1},
    selected: null, filter: 'all', query: '', showRoute: false,
    scale: 1, panX: 0, panY: 0, dragging: false, pointers: new Map(), lastTap: 0, view3D: false
  };

  const MAP_ASPECT = 2048 / 1449;
  const viewport = $('#viewport');
  const canvas = $('#canvas');
  const markers = $('#markers');
  const results = $('#results');
  const details = $('#details');
  const routeLine = $('#routeLine');
  const routeGlow = $('#routeGlow');
  const routeDots = $('#routeDots');
  const routeArrows = $('#routeArrows');
  const startDot = $('#startDot');
  const destinationHalo = $('#destinationHalo');
  const startLabel = $('#startLabel');

  const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
  const mapX = (x) => Number(x) || 0;
  const mapY = (y) => Number(y) || 0;
  const typeLabel = (t) => ({department:'Department',room:'Room',lab:'Laboratory',common:'Campus service'})[t] || 'Location';
  const shortType = (t) => ({department:'D',room:'R',lab:'L',common:'•'})[t] || '•';

  function apiHeaders(){
    const h = {Accept:'application/json'};
    if(KEY) h['X-Access-Key'] = KEY;
    return h;
  }

  async function loadData(){
    $('#statusText').textContent = 'Loading campus data…';
    const selectedId = state.selected?.id || null;
    let data = null;
    try {
      if(!API) throw new Error('JSONBin configuration missing');
      const res = await fetch(API, {headers: apiHeaders(), cache:'no-store'});
      if(!res.ok) throw new Error(`JSONBin HTTP ${res.status}`);
      const payload = await res.json();
      data = payload.record || payload;
    } catch(err) {
      console.warn(err);
      try {
        const res = await fetch('data/campus-data.json', {cache:'no-store'});
        if(res.ok) data = await res.json();
      } catch(fallbackErr){ console.warn(fallbackErr); }
    }
    if(!data || !Array.isArray(data.locations)) {
      $('#statusText').textContent = 'Data unavailable';
      results.innerHTML = '<div class="empty">Campus data could not be loaded.<br>Check the JSONBin configuration.</div>';
      return;
    }
    state.locations = data.locations;
    window.__isetCampusLocations = state.locations;
    state.selected = selectedId ? state.locations.find(l=>l.id===selectedId) || null : null;
    state.routesByLocation = data.routesByLocation || {};
    state.routePoints = Array.isArray(data.routePoints) ? data.routePoints : [];
    state.routeSettings = {...state.routeSettings, ...(data.routeSettings || {})};
    $('#statusText').textContent = `${state.locations.length} locations ready`;
    renderDirectory(); renderMarkers(); fitMap(); renderRoute();
  }

  function filtered(){
    const q = state.query.trim().toLowerCase();
    return state.locations.filter(l => {
      const typeOK = state.filter === 'all' || l.type === state.filter;
      const text = `${l.name} ${l.short||''} ${l.desc||''}`.toLowerCase();
      return typeOK && (!q || text.includes(q));
    });
  }

  function renderDirectory(){
    const list = filtered();
    $('#count').textContent = `${list.length} / ${state.locations.length}`;
    if(!list.length){results.innerHTML='<div class="empty">No place found.<br>Try another name or category.</div>';return;}
    results.innerHTML = list.map(l => `
      <button class="result ${state.selected?.id===l.id?'selected':''}" data-id="${escapeAttr(l.id)}" type="button">
        <span class="result-icon ${escapeAttr(l.type)}">${escapeHtml(l.short || shortType(l.type))}</span>
        <span class="result-main"><span class="result-name">${escapeHtml(l.name)}</span><span class="result-meta">${escapeHtml(typeLabel(l.type))}</span></span>
        <span class="result-arrow">›</span>
      </button>`).join('');
    $$('.result').forEach(b=>b.addEventListener('click',()=>selectById(b.dataset.id,true)));
  }

  function renderMarkers(){
    markers.innerHTML = state.locations.map(l => `
      <button class="marker ${state.selected?.id===l.id?'selected':''}" data-id="${escapeAttr(l.id)}" style="left:${mapX(l.x)}%;top:${mapY(l.y)}%" aria-label="${escapeAttr(l.name)}" title="${escapeAttr(l.name)}">
        <span>${escapeHtml(l.short || shortType(l.type))}</span>
      </button>`).join('');
    $$('.marker').forEach(m=>m.addEventListener('click',(e)=>{e.stopPropagation();selectById(m.dataset.id,true)}));
  }

  function selectById(id, openDetails=true){
    const loc = state.locations.find(l=>l.id===id); if(!loc)return;
    state.selected = loc;
    renderDirectory(); renderMarkers(); updateDetails(); focusSelected();
    if(window.matchMedia('(max-width: 900px)').matches) $('#directory').classList.remove('open');
    if(openDetails) openDetailsPanel();
    renderRoute();
  }

  function updateDetails(){
    const l=state.selected;
    $('#selectedName').textContent=l?.name||'No place selected';
    $('#selectedType').textContent=l?`${typeLabel(l.type)} · ${l.short||'—'}`:'Choose a marker or directory item.';
    $('#detailType').textContent=(l?typeLabel(l.type):'LOCATION').toUpperCase();
    $('#detailName').textContent=l?.name||'Select a place';
    $('#detailDesc').textContent=l?.desc||'Select a marker to see details.';
    $('#detailCode').textContent=l?.short||'—';
    $('#detailCategory').textContent=l?typeLabel(l.type):'—';
    renderDetailGallery(l?.images || []);
    window.__isetSelectedLocation = l || null;
    document.dispatchEvent(new CustomEvent('iset:location-selected', {detail:l || null}));
    $('#detailStreetView')?.classList.toggle('has-panorama', !!l?.panorama);
    $('#routeToggle').classList.toggle('active',!!state.showRoute);
    $('#mobileRoute').classList.toggle('active',!!state.showRoute);
  }

  function renderDetailGallery(images){
    const box = $('#detailGallery');
    if(!box) return;
    const list = Array.isArray(images) ? images.filter(Boolean).slice(0,12) : [];
    if(!list.length){
      box.innerHTML = '<div class="detail-gallery-empty">No photos added for this place.</div>';
      return;
    }
    box.innerHTML = list.map((url,i) => `<button class="detail-photo" type="button" data-photo-index="${i}" aria-label="Open photo ${i+1}"><img src="${escapeAttr(url)}" alt="Photo ${i+1}" loading="lazy" onerror="this.closest('.detail-photo').classList.add('broken')"></button>`).join('');
    box.querySelectorAll('.detail-photo').forEach(btn => btn.addEventListener('click',()=>{
      const index=Number(btn.dataset.photoIndex);
      openPhotoViewer(list,index);
    }));
  }

  function openPhotoViewer(images,index){
    const old=$('#photoViewer');
    if(old) old.remove();
    const modal=document.createElement('div');
    modal.id='photoViewer';
    modal.className='photo-viewer';
    modal.innerHTML=`<div class="photo-viewer-backdrop" data-close-photo></div><div class="photo-viewer-card"><button class="photo-viewer-close" type="button" data-close-photo>×</button><button class="photo-nav prev" type="button" data-photo-prev>‹</button><img id="photoViewerImage" src="${escapeAttr(images[index])}" alt="Place photo"><button class="photo-nav next" type="button" data-photo-next>›</button><div class="photo-counter">${index+1} / ${images.length}</div></div>`;
    document.body.appendChild(modal);
    let current=index;
    const image=modal.querySelector('#photoViewerImage');
    const counter=modal.querySelector('.photo-counter');
    const show=i=>{current=(i+images.length)%images.length;image.src=images[current];counter.textContent=`${current+1} / ${images.length}`;};
    modal.querySelector('[data-photo-prev]').addEventListener('click',()=>show(current-1));
    modal.querySelector('[data-photo-next]').addEventListener('click',()=>show(current+1));
    modal.querySelectorAll('[data-close-photo]').forEach(el=>el.addEventListener('click',()=>modal.remove()));
    const key=e=>{if(e.key==='Escape'){modal.remove();document.removeEventListener('keydown',key)}else if(e.key==='ArrowLeft')show(current-1);else if(e.key==='ArrowRight')show(current+1)};
    document.addEventListener('keydown',key);
  }

  function openDetailsPanel(){details.classList.add('open');details.setAttribute('aria-hidden','false')}
  function closeDetails(){details.classList.remove('open');details.setAttribute('aria-hidden','true')}

  function applyTransform(){
    viewport.classList.toggle('view-3d', !!state.view3D);
    const tilt = state.view3D ? 52 : 0;
    canvas.style.transform=`translate3d(calc(-50% + ${state.panX}px),calc(-50% + ${state.panY}px),0) scale(${state.scale}) rotateX(${tilt}deg)`;
  }

  function fitMap(){
    const rect=viewport.getBoundingClientRect();
    if(!rect.width || !rect.height)return;
    // Cover the complete browser viewport like the Admin map: preserve the
    // source image proportions, scale until every edge is covered, and crop only
    // the excess outside the viewport. Marker coordinates stay aligned to the image.
    const coverWidth=Math.max(rect.width, rect.height*MAP_ASPECT);
    canvas.style.width=`${Math.ceil(coverWidth)}px`;
    canvas.style.height='auto';
    state.scale=1; state.panX=0; state.panY=0; applyTransform();
  }

  function zoomAt(nextScale, clientX, clientY){
    const rect=viewport.getBoundingClientRect();
    const cx=clientX-rect.left-rect.width/2, cy=clientY-rect.top-rect.height/2;
    const old=state.scale; nextScale=clamp(nextScale,.65,4.5);
    const ratio=nextScale/old;
    state.panX=cx-(cx-state.panX)*ratio; state.panY=cy-(cy-state.panY)*ratio;
    state.scale=nextScale; applyTransform();
  }

  function resetView(){fitMap()}
  function toggle3D(){
    state.view3D=!state.view3D;
    viewport.classList.toggle('view-3d',state.view3D);
    const btn=$('#view3D');
    if(btn){btn.classList.toggle('active',state.view3D);btn.textContent=state.view3D?'2D':'3D';}
    fitMap();
    if(state.selected) focusSelected({route:state.showRoute});
  }

  function focusSelected(options={}){
    if(!state.selected)return;
    const rect=viewport.getBoundingClientRect();
    const isMobile=window.matchMedia('(max-width: 900px)').matches;
    const targetScale=clamp(options.scale || (isMobile ? 1.18 : 1.15),1,4.5);
    const baseW=canvas.offsetWidth || rect.width;
    const baseH=canvas.offsetHeight || baseW / MAP_ASPECT;
    state.scale=targetScale;
    // Exact inverse of the centered canvas transform: selected point lands at viewport center.
    state.panX=-(Number(state.selected.x)/100-.5)*baseW*state.scale;
    state.panY=-(Number(state.selected.y)/100-.5)*baseH*state.scale;
    // Keep a little breathing room so the selected marker is not hidden under UI.
    if(options.route){
      state.panY += isMobile ? 18 : 10;
    }
    applyTransform();
  }

  function routeForSelected(){
    const custom = state.selected ? state.routesByLocation[state.selected.id] : null;
    return Array.isArray(custom)&&custom.length ? custom : (state.routePoints.length ? state.routePoints : null);
  }
  function buildPath(points){
    if(!points?.length)return '';
    const start={x:Number(state.routeSettings.x),y:Number(state.routeSettings.y)};
    const all=[start,...points.map(p=>({x:Number(p.x),y:Number(p.y)})), ...(state.selected?[{x:Number(state.selected.x),y:Number(state.selected.y)}]:[])];
    if(all.length<2)return '';
    let d=`M ${mapX(all[0].x)} ${mapY(all[0].y)}`;
    for(let i=1;i<all.length;i++){
      const prev=all[i-1], cur=all[i];
      const midX=(prev.x+cur.x)/2, midY=(prev.y+cur.y)/2;
      d += ` Q ${mapX(prev.x)} ${mapY(prev.y)} ${mapX(midX)} ${mapY(midY)}`;
      if(i===all.length-1)d += ` Q ${mapX(cur.x)} ${mapY(cur.y)} ${mapX(cur.x)} ${mapY(cur.y)}`;
    }
    return d;
  }

  function renderRoute(){
    const points=routeForSelected();
    const has=!!(state.showRoute && state.selected && points?.length);
    [routeLine,routeGlow,startDot,destinationHalo,startLabel].forEach(el=>el?.classList.toggle('visible',has));
    if(!has){
      routeLine.removeAttribute('d');routeGlow.removeAttribute('d');
      routeDots.innerHTML='';routeArrows.innerHTML='';
      return;
    }
    const d=buildPath(points);
    routeLine.setAttribute('d',d);routeGlow.setAttribute('d',d);routeLine.classList.add('animated');
    startDot.setAttribute('cx',mapX(state.routeSettings.x));startDot.setAttribute('cy',mapY(state.routeSettings.y));
    destinationHalo.setAttribute('cx',mapX(state.selected.x));destinationHalo.setAttribute('cy',mapY(state.selected.y));
    routeDots.innerHTML=points.map(p=>`<circle class="route-dot" cx="${mapX(p.x)}" cy="${mapY(p.y)}" r=".62"></circle>`).join('');

    // Direction arrows are positioned on the actual waypoint-to-waypoint segments.
    const start={x:Number(state.routeSettings.x),y:Number(state.routeSettings.y)};
    const all=[start,...points.map(p=>({x:Number(p.x),y:Number(p.y)})),{x:Number(state.selected.x),y:Number(state.selected.y)}];
    const arrows=[];
    for(let i=0;i<all.length-1;i++){
      const a=all[i],b=all[i+1],dx=b.x-a.x,dy=b.y-a.y;
      if(Math.hypot(dx,dy)<2)continue;
      const t=.58, x=a.x+dx*t, y=a.y+dy*t;
      const angle=Math.atan2(dy,dx)*180/Math.PI;
      arrows.push(`<path class="route-arrow visible" d="M -1.8 -1.3 L 1.8 0 L -1.8 1.3 Z" transform="translate(${mapX(x)} ${mapY(y)}) rotate(${angle})"></path>`);
    }
    routeArrows.innerHTML=arrows.join('');
    startLabel.style.left=`${mapX(state.routeSettings.x)}%`;startLabel.style.top=`${mapY(state.routeSettings.y)}%`;
  }

  async function refreshLiveRoutes(){
    try{
      if(!API)return;
      const res=await fetch(API,{headers:apiHeaders(),cache:'no-store'});
      if(!res.ok)return;
      const payload=await res.json();
      const data=payload.record||payload;
      if(Array.isArray(data.locations)){
        state.locations=data.locations;
        if(state.selected?.id) state.selected=state.locations.find(l=>l.id===state.selected.id)||state.selected;
      }
      state.routesByLocation=data.routesByLocation||{};
      state.routePoints=Array.isArray(data.routePoints)?data.routePoints:state.routePoints;
      state.routeSettings={...state.routeSettings,...(data.routeSettings||{})};
    }catch(err){console.warn('Live route refresh failed',err)}
  }

  async function toggleRoute(force, focus=true){
    state.showRoute=typeof force==='boolean'?force:!state.showRoute;
    if(state.showRoute && state.selected){
      await refreshLiveRoutes();
      if(focus) focusSelected({route:true});
    }
    updateDetails();renderDirectory();renderMarkers();renderRoute();
  }

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function escapeAttr(v){return escapeHtml(v)}

  // Pointer controls: one finger = pan, two fingers = pinch + pan.
  viewport.addEventListener('pointerdown',e=>{
    if(e.target.closest('.marker'))return;
    viewport.setPointerCapture?.(e.pointerId);state.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(state.pointers.size===1){state.dragging=true;state.lastX=e.clientX;state.lastY=e.clientY;viewport.classList.add('dragging')}
  });
  viewport.addEventListener('pointermove',e=>{
    if(!state.pointers.has(e.pointerId))return;state.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const ps=[...state.pointers.values()];
    if(ps.length===1&&state.dragging){const p=ps[0];state.panX+=p.x-state.lastX;state.panY+=p.y-state.lastY;state.lastX=p.x;state.lastY=p.y;applyTransform()}
    else if(ps.length===2){
      const [a,b]=ps;const midX=(a.x+b.x)/2,midY=(a.y+b.y)/2;const dist=Math.hypot(a.x-b.x,a.y-b.y);
      if(!state.pinch){state.pinch={dist,midX,midY};return}
      zoomAt(state.scale*(dist/state.pinch.dist),midX,midY);
      state.panX += midX-state.pinch.midX;state.panY += midY-state.pinch.midY;applyTransform();state.pinch={dist,midX,midY};
    }
  });
  const endPointer=e=>{state.pointers.delete(e.pointerId);if(state.pointers.size===0){state.dragging=false;state.pinch=null;viewport.classList.remove('dragging')}else if(state.pointers.size===1){const p=[...state.pointers.values()][0];state.lastX=p.x;state.lastY=p.y;state.pinch=null}};
  viewport.addEventListener('pointerup',endPointer);viewport.addEventListener('pointercancel',endPointer);viewport.addEventListener('pointerleave',()=>{if(state.pointers.size===0)state.dragging=false});
  viewport.addEventListener('wheel',e=>{e.preventDefault();zoomAt(state.scale*(e.deltaY>0?.9:1.1),e.clientX,e.clientY)},{passive:false});
  viewport.addEventListener('dblclick',e=>zoomAt(state.scale*1.45,e.clientX,e.clientY));

  $('#zoomIn').addEventListener('click',()=>{const r=viewport.getBoundingClientRect();zoomAt(state.scale*1.25,r.left+r.width/2,r.top+r.height/2)});
  $('#zoomOut').addEventListener('click',()=>{const r=viewport.getBoundingClientRect();zoomAt(state.scale*.8,r.left+r.width/2,r.top+r.height/2)});
  $('#resetView').addEventListener('click',resetView);

  // One control toggles only the Campus Navigator directory.
  const directory = $('#directory');
  const floatingSearch = $('#openDirectory');
  const toggleUI = $('#toggleUI');
  function setNavigatorHidden(hidden){
    directory?.classList.toggle('navigator-hidden', hidden);
    floatingSearch?.classList.toggle('navigator-hidden', hidden);
    if(toggleUI){
      toggleUI.textContent = hidden ? '☰' : '☰';
      toggleUI.setAttribute('aria-label', hidden ? 'Show Campus Navigator' : 'Hide Campus Navigator');
      toggleUI.setAttribute('title', hidden ? 'Show Campus Navigator' : 'Hide Campus Navigator');
    }
  }
  toggleUI?.addEventListener('click',()=>{
    setNavigatorHidden(!directory?.classList.contains('navigator-hidden'));
  });

  $('#fitSelected').addEventListener('click',()=>{if(!state.selected){openDirectory();return}focusSelected();openDetailsPanel()});
  $('#routeToggle').addEventListener('click',()=>{if(!state.selected){openDirectory();return}toggleRoute()});
  $('#fullscreen').addEventListener('click',()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.()});
  $('#openDetails').addEventListener('click',openDetailsPanel);$('#closeDetails').addEventListener('click',closeDetails);
  $('#detailFocus').addEventListener('click',()=>{focusSelected();closeDetails()});$('#detailRoute').addEventListener('click',()=>toggleRoute(true));
  $('#detailStreetView')?.addEventListener('click',()=>window.openIsetStreetView?.(state.selected));
  $('#search').addEventListener('input',e=>{state.query=e.target.value;renderDirectory()});
  $('#clearSearch').addEventListener('click',()=>{$('#search').value='';state.query='';renderDirectory();$('#search').focus()});
  $('#showAll').addEventListener('click',()=>{state.filter='all';state.query='';$('#search').value='';$$('.filter').forEach(x=>x.classList.toggle('active',x.dataset.filter==='all'));renderDirectory()});
  $$('.filter').forEach(b=>b.addEventListener('click',()=>{state.filter=b.dataset.filter;$$('.filter').forEach(x=>x.classList.toggle('active',x===b));renderDirectory()}));
  $('#refreshData').addEventListener('click',loadData);
  $('#helpBtn').addEventListener('click',()=>$('#helpModal').classList.add('open'));$('#closeHelp').addEventListener('click',()=>$('#helpModal').classList.remove('open'));$('#helpModal').addEventListener('click',e=>{if(e.target.id==='helpModal')e.currentTarget.classList.remove('open')});
  function openDirectory(){$('#directory').classList.add('open');$('#search').focus()}
  $('#openDirectory').addEventListener('click',openDirectory);
  $('#closeDirectory').addEventListener('click',()=>$('#directory').classList.remove('open'));
  $('#mobileSearch').addEventListener('click',openDirectory);$('#mobileDirectory').addEventListener('click',openDirectory);$('#mobileFocus').addEventListener('click',()=>focusSelected());$('#mobileRoute').addEventListener('click',()=>toggleRoute());
  document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openDirectory();return}if(e.key.toLowerCase()==='r')toggleRoute();if(e.key.toLowerCase()==='f')focusSelected();if(e.key==='+'||e.key==='='){const r=viewport.getBoundingClientRect();zoomAt(state.scale*1.18,r.left+r.width/2,r.top+r.height/2)}if(e.key==='-'){const r=viewport.getBoundingClientRect();zoomAt(state.scale*.85,r.left+r.width/2,r.top+r.height/2)}if(e.key==='Escape'){closeDetails();$('#helpModal').classList.remove('open');$('#directory').classList.remove('open')}});
  let resizeTimer;
  window.addEventListener('resize',()=>{
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{
      if(state.scale===1 && !state.selected) fitMap();
      else renderRoute();
    },80);
  });
  loadData();
})();
