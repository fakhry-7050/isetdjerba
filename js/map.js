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
    scale: 1, panX: 0, panY: 0, dragging: false, pointers: new Map(), pinch: null,
    lastTapTime: 0, lastTapPos: null, view3D: false,
    isPinching: false
  };

  const MAP_ASPECT = 1.62;
  const MAP_CROP_START_X = 31.5;
  const MAP_CROP_WIDTH = 66.5;
  const MAP_CROP_START_Y = 12.0;
  const MAP_CROP_HEIGHT = 85.5;

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

  // Zoom indicator
  const zoomIndicator = document.createElement('div');
  zoomIndicator.className = 'zoom-indicator';
  zoomIndicator.innerHTML = '<span class="zoom-dot"></span><span>MAP ZOOM</span><strong id="zoomIndicatorValue">100%</strong>';
  $('#mapShell')?.appendChild(zoomIndicator);

  const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
  const mapX = (x) => ((Number(x) - MAP_CROP_START_X) / MAP_CROP_WIDTH) * 100;
  const mapY = (y) => ((Number(y) - MAP_CROP_START_Y) / MAP_CROP_HEIGHT) * 100;
  const typeLabel = (t) => ({department:'Department',room:'Room',lab:'Laboratory',common:'Campus service'})[t] || 'Location';
  const shortType = (t) => ({department:'D',room:'R',lab:'L',common:'•'})[t] || '•';

  // Device detection for scale limits
  function getScaleLimits(){
    const isTV = window.matchMedia('(min-width: 1920px)').matches;
    const isPhone = window.matchMedia('(max-width: 600px)').matches;
    const isTablet = window.matchMedia('(min-width: 601px) and (max-width: 1024px)').matches;
    if(isTV) return {min:0.5, max:4.5};
    if(isPhone) return {min:0.75, max:5.5};
    if(isTablet) return {min:0.65, max:5};
    return {min:0.6, max:6};
  }

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
      console.warn('JSONBin campus data unavailable; trying bundled/local data.', err);
      data = window.ISET_CAMPUS_DATA || null;
      if(!data && window.location.protocol !== 'file:') {
        try {
          const res = await fetch('data/campus-data.json', {cache:'no-store'});
          if(res.ok) data = await res.json();
        } catch(fallbackErr){ console.warn('Local JSON fallback failed.', fallbackErr); }
      }
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
    $('#statusText').textContent = `${state.locations.length} locations ready${data === window.ISET_CAMPUS_DATA ? ' · local backup' : ''}`;
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
      <button class="marker ${escapeAttr(l.type||'location')} ${state.selected?.id===l.id?'selected':''}" data-id="${escapeAttr(l.id)}" style="left:${mapX(l.x)}%;top:${mapY(l.y)}%" aria-label="${escapeAttr(l.name)}" title="${escapeAttr(l.name)}">
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

  // --- UNIVERSAL ZOOM & PAN LOGIC - FIXED FOR ALL DEVICES ---

  function clampPan(){
    if(!viewport || !canvas) return;
    const rect = viewport.getBoundingClientRect();
    const vw = rect.width, vh = rect.height;
    const cw = canvas.offsetWidth || vw;
    const ch = canvas.offsetHeight || cw / MAP_ASPECT;

    // Calculate how much we can pan - keep at least 20% of map visible
    const scaledW = cw * state.scale;
    const scaledH = ch * state.scale;

    // If scaled map is smaller than viewport, center it (no pan needed beyond small offset)
    // If larger, allow pan but keep edges within reach
    const maxX = Math.max(0, (scaledW - vw) / 2 + 60);
    const maxY = Math.max(0, (scaledH - vh) / 2 + 60);

    // For very zoomed out, limit pan to small range
    if(scaledW <= vw) {
      state.panX = clamp(state.panX, -60, 60);
    } else {
      state.panX = clamp(state.panX, -maxX, maxX);
    }
    if(scaledH <= vh) {
      state.panY = clamp(state.panY, -60, 60);
    } else {
      state.panY = clamp(state.panY, -maxY, maxY);
    }
  }

  function applyTransform(){
    clampPan();
    viewport.classList.toggle('view-3d', !!state.view3D);
    const zoomValue = document.querySelector('#zoomIndicatorValue');
    if(zoomValue) zoomValue.textContent = `${Math.round(state.scale * 100)}%`;
    const tilt = state.view3D ? 52 : 0;
    // Use precise transform - keep GPU accelerated
    canvas.style.transform = `translate3d(calc(-50% + ${state.panX}px), calc(-50% + ${state.panY}px), 0) scale(${state.scale}) rotateX(${tilt}deg)`;
    // Update zoom indicator visibility
    if(zoomIndicator) {
      zoomIndicator.style.opacity = state.scale === 1 ? '0.6' : '1';
    }
  }

  function fitMap(){
    const rect = viewport.getBoundingClientRect();
    if(!rect.width || !rect.height) return;

    // For all devices, make canvas fill viewport
    // On TV and large screens, ensure it covers
    const isTV = window.matchMedia('(min-width: 1920px)').matches;
    const isPhone = window.matchMedia('(max-width: 600px)').matches;

    // Canvas should be viewport size for precise control
    canvas.style.width = `${Math.round(rect.width)}px`;
    canvas.style.height = `${Math.round(rect.height)}px`;

    // Reset transform
    state.scale = 1;
    state.panX = 0;
    state.panY = 0;

    // On phone, slight zoom in for better readability
    if(isPhone) {
      // Keep at 1 for phone to show whole campus
      state.scale = 1;
    }
    // On TV, fit with slight margin
    if(isTV) {
      state.scale = 1;
    }

    applyTransform();
    // Re-render route after fit
    setTimeout(renderRoute, 50);
  }

  function zoomAt(nextScale, clientX, clientY){
    const rect = viewport.getBoundingClientRect();
    if(!rect.width || !rect.height) return;

    const limits = getScaleLimits();
    nextScale = clamp(nextScale, limits.min, limits.max);

    // If scale not changing much, ignore (prevents jitter)
    if(Math.abs(nextScale - state.scale) < 0.001) return;

    // Calculate viewport center
    const vpCenterX = rect.left + rect.width / 2;
    const vpCenterY = rect.top + rect.height / 2;

    // Point where user is zooming (mouse or pinch center)
    // If no clientX/Y provided, use viewport center
    const zoomX = clientX != null ? clientX : vpCenterX;
    const zoomY = clientY != null ? clientY : vpCenterY;

    // Calculate the map point under the zoom point BEFORE zoom
    // Formula: mapPoint = (zoomPoint - viewportCenter - pan) / oldScale
    const oldScale = state.scale;
    const mapPointX = (zoomX - vpCenterX - state.panX) / oldScale;
    const mapPointY = (zoomY - vpCenterY - state.panY) / oldScale;

    // Apply new scale
    state.scale = nextScale;

    // Calculate new pan so that same map point stays under zoom point AFTER zoom
    // newPan = zoomPoint - viewportCenter - mapPoint * newScale
    state.panX = zoomX - vpCenterX - mapPointX * nextScale;
    state.panY = zoomY - vpCenterY - mapPointY * nextScale;

    applyTransform();
  }

  function zoomByFactor(factor, clientX, clientY){
    zoomAt(state.scale * factor, clientX, clientY);
  }

  function resetView(){ fitMap(); }

  function toggle3D(){
    state.view3D = !state.view3D;
    viewport.classList.toggle('view-3d', state.view3D);
    const btn = $('#view3D');
    if(btn){
      btn.classList.toggle('active', state.view3D);
      btn.textContent = state.view3D ? '2D' : '3D';
      btn.setAttribute('aria-label', state.view3D ? 'Switch to 2D' : 'Switch to 3D');
    }
    // Re-fit after toggle to keep map visible
    setTimeout(() => {
      fitMap();
      if(state.selected) focusSelected({route: state.showRoute});
    }, 50);
  }

  function focusSelected(options={}){
    if(!state.selected) return;
    const rect = viewport.getBoundingClientRect();
    if(!rect.width || !rect.height) return;

    const isMobile = window.matchMedia('(max-width: 900px)').matches;
    const isTV = window.matchMedia('(min-width: 1920px)').matches;
    const limits = getScaleLimits();

    // Target scale - adaptive per device
    let targetScale = options.scale;
    if(!targetScale) {
      if(isMobile) targetScale = 1.35;
      else if(isTV) targetScale = 1.5;
      else targetScale = 1.4;
    }
    targetScale = clamp(targetScale, limits.min, limits.max);

    const baseW = canvas.offsetWidth || rect.width;
    const baseH = canvas.offsetHeight || baseW / MAP_ASPECT;

    // Calculate pan to center selected marker
    // selected is in original coordinates (0-100), mapX/mapY converts to canvas %
    const targetCanvasX = mapX(state.selected.x);
    const targetCanvasY = mapY(state.selected.y);

    // Formula: pan = -(target% - 50%) * baseSize * scale
    state.scale = targetScale;
    state.panX = -(targetCanvasX / 100 - 0.5) * baseW * state.scale;
    state.panY = -(targetCanvasY / 100 - 0.5) * baseH * state.scale;

    // Adjust for UI - don't hide marker under directory or mobile bar
    const directory = $('#directory');
    const isDirOpen = directory?.classList.contains('open') && isMobile;
    const mobileBar = $('#mobileBar');
    const mobileBarHeight = isMobile ? (mobileBar?.offsetHeight || 60) : 0;
    const dirHeight = isDirOpen ? (directory?.offsetHeight || 0) : 0;

    if(options.route) {
      // When showing route, shift up a bit to show whole route
      state.panY += isMobile ? 30 : 20;
    } else if(isMobile) {
      // On mobile, shift up to avoid mobile bar
      state.panY += (mobileBarHeight + dirHeight * 0.3) / 2;
    }

    // If directory is open on desktop (side panel), shift right
    if(!isMobile && directory && !directory.classList.contains('navigator-hidden')) {
      const dirWidth = directory.offsetWidth || 360;
      state.panX += (dirWidth / 2) * 0.6;
    }

    applyTransform();
  }

  // Routes
  function routeForSelected(){
    const custom = state.selected ? state.routesByLocation[state.selected.id] : null;
    return Array.isArray(custom)&&custom.length ? custom : (state.routePoints.length ? state.routePoints : null);
  }
  function buildPath(points){
    if(!points?.length) return '';
    const start={x:Number(state.routeSettings.x),y:Number(state.routeSettings.y)};
    const all=[start,...points.map(p=>({x:Number(p.x),y:Number(p.y)})), ...(state.selected?[{x:Number(state.selected.x),y:Number(state.selected.y)}]:[])];
    if(all.length<2) return '';
    let d=`M ${mapX(all[0].x)} ${mapY(all[0].y)}`;
    for(let i=1;i<all.length;i++){
      const prev=all[i-1], cur=all[i];
      const midX=(prev.x+cur.x)/2, midY=(prev.y+cur.y)/2;
      d += ` Q ${mapX(prev.x)} ${mapY(prev.y)} ${mapX(midX)} ${mapY(midY)}`;
      if(i===all.length-1) d += ` Q ${mapX(cur.x)} ${mapY(cur.y)} ${mapX(cur.x)} ${mapY(cur.y)}`;
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

    const start={x:Number(state.routeSettings.x),y:Number(state.routeSettings.y)};
    const all=[start,...points.map(p=>({x:Number(p.x),y:Number(p.y)})),{x:Number(state.selected.x),y:Number(state.selected.y)}];
    const arrows=[];
    for(let i=0;i<all.length-1;i++){
      const a=all[i],b=all[i+1],dx=b.x-a.x,dy=b.y-a.y;
      if(Math.hypot(dx,dy)<2) continue;
      const t=.58, x=a.x+dx*t, y=a.y+dy*t;
      const angle=Math.atan2(dy,dx)*180/Math.PI;
      arrows.push(`<path class="route-arrow visible" d="M -1.8 -1.3 L 1.8 0 L -1.8 1.3 Z" transform="translate(${mapX(x)} ${mapY(y)}) rotate(${angle})"></path>`);
    }
    routeArrows.innerHTML=arrows.join('');
    startLabel.style.left=`${mapX(state.routeSettings.x)}%`;startLabel.style.top=`${mapY(state.routeSettings.y)}%`;
  }

  async function refreshLiveRoutes(){
    try{
      if(!API) return;
      const res=await fetch(API,{headers:apiHeaders(),cache:'no-store'});
      if(!res.ok) return;
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

  function escapeHtml(v){var m={"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"};return String(v??"").replace(/[&<>"']/g,function(c){return m[c]});}
  function escapeAttr(v){return escapeHtml(v)}

  // --- FIXED POINTER CONTROLS FOR ALL DEVICES ---

  // Helper: distance between two pointers
  function getDistance(a,b){
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function getMidpoint(a,b){
    return {x:(a.x+b.x)/2, y:(a.y+b.y)/2};
  }

  // Single pointer drag + pinch handling
  viewport.addEventListener('pointerdown', e => {
    // Don't interfere with markers or UI
    if(e.target.closest('.marker, button, a, input')) return;

    // Capture pointer
    try{ viewport.setPointerCapture(e.pointerId); }catch{}
    state.pointers.set(e.pointerId, {x:e.clientX, y:e.clientY, id:e.pointerId});

    const count = state.pointers.size;

    if(count === 1){
      // Start dragging
      state.dragging = true;
      state.isPinching = false;
      state.pinch = null;
      state.lastX = e.clientX;
      state.lastY = e.clientY;
      viewport.classList.add('dragging');
      // Prevent text selection
      e.preventDefault();
    } else if(count === 2){
      // Start pinching - stop dragging
      state.dragging = false;
      state.isPinching = true;
      const pts = [...state.pointers.values()];
      const dist = getDistance(pts[0], pts[1]);
      const mid = getMidpoint(pts[0], pts[1]);
      state.pinch = {
        startDist: Math.max(dist, 10),
        startScale: state.scale,
        startMid: mid,
        startPanX: state.panX,
        startPanY: state.panY
      };
      viewport.classList.add('dragging');
      e.preventDefault();
    }
  }, {passive:false});

  viewport.addEventListener('pointermove', e => {
    if(!state.pointers.has(e.pointerId)) return;

    // Update pointer position
    state.pointers.set(e.pointerId, {x:e.clientX, y:e.clientY, id:e.pointerId});
    const pts = [...state.pointers.values()];

    if(pts.length === 1 && state.dragging && !state.isPinching){
      // Single finger / mouse drag - PAN
      const dx = e.clientX - state.lastX;
      const dy = e.clientY - state.lastY;

      // Only start moving after 3px threshold (prevents accidental drag on tap)
      if(Math.abs(dx) < 3 && Math.abs(dy) < 3 && Math.hypot(state.panX, state.panY) === 0) {
        // Still within threshold, don't pan yet
      }

      state.panX += dx;
      state.panY += dy;
      state.lastX = e.clientX;
      state.lastY = e.clientY;

      applyTransform();
      e.preventDefault();

    } else if(pts.length === 2){
      // Two fingers - PINCH ZOOM + PAN
      const dist = Math.max(getDistance(pts[0], pts[1]), 10);
      const mid = getMidpoint(pts[0], pts[1]);

      if(!state.pinch){
        // First time with 2 pointers
        state.pinch = {
          startDist: dist,
          startScale: state.scale,
          startMid: mid,
          startPanX: state.panX,
          startPanY: state.panY
        };
        return;
      }

      // Calculate new scale from pinch distance
      const scaleFactor = dist / state.pinch.startDist;
      let newScale = state.pinch.startScale * scaleFactor;
      const limits = getScaleLimits();
      newScale = clamp(newScale, limits.min, limits.max);

      // Calculate how midpoint moved since pinch start
      const midDeltaX = mid.x - state.pinch.startMid.x;
      const midDeltaY = mid.y - state.pinch.startMid.y;

      // For zoom, we want to zoom around the midpoint
      // Use zoomAt logic but with our stored start values
      const rect = viewport.getBoundingClientRect();
      const vpCenterX = rect.left + rect.width / 2;
      const vpCenterY = rect.top + rect.height / 2;

      // Map point under original midpoint at start of pinch
      const startMapX = (state.pinch.startMid.x - vpCenterX - state.pinch.startPanX) / state.pinch.startScale;
      const startMapY = (state.pinch.startMid.y - vpCenterY - state.pinch.startPanY) / state.pinch.startScale;

      // New pan so that same map point is under new midpoint
      state.scale = newScale;
      state.panX = mid.x - vpCenterX - startMapX * newScale;
      state.panY = mid.y - vpCenterY - startMapY * newScale;

      applyTransform();
      e.preventDefault();
    }
  }, {passive:false});

  const endPointer = e => {
    if(!state.pointers.has(e.pointerId)) return;

    const wasDragging = state.dragging;
    const wasPinching = state.isPinching;
    const startPos = state.pointers.get(e.pointerId);

    state.pointers.delete(e.pointerId);

    try{ viewport.releasePointerCapture(e.pointerId); }catch{}

    if(state.pointers.size === 0){
      // All pointers lifted
      state.dragging = false;
      state.isPinching = false;
      state.pinch = null;
      viewport.classList.remove('dragging');

      // Handle double-tap / double-click zoom
      if(!wasPinching && startPos){
        const now = Date.now();
        const timeSinceLastTap = now - state.lastTapTime;
        const isDoubleTap = timeSinceLastTap < 350 && timeSinceLastTap > 0;

        if(isDoubleTap && state.lastTapPos){
          const dist = Math.hypot(e.clientX - state.lastTapPos.x, e.clientY - state.lastTapPos.y);
          if(dist < 40){
            // Double tap - zoom in at tap point
            zoomByFactor(1.6, e.clientX, e.clientY);
            state.lastTapTime = 0;
            state.lastTapPos = null;
            return;
          }
        }

        // Check if it was a tap (not drag) - small movement
        const moveDist = Math.hypot(e.clientX - startPos.x, e.clientY - startPos.y);
        if(moveDist < 10 && !wasPinching){
          state.lastTapTime = now;
          state.lastTapPos = {x:e.clientX, y:e.clientY};
        } else {
          // It was a drag, not a tap
          state.lastTapTime = 0;
          state.lastTapPos = null;
        }
      }

    } else if(state.pointers.size === 1){
      // One pointer left after pinch - switch to drag
      const remaining = [...state.pointers.values()][0];
      state.lastX = remaining.x;
      state.lastY = remaining.y;
      state.dragging = true;
      state.isPinching = false;
      state.pinch = null;
    }
  };

  viewport.addEventListener('pointerup', endPointer);
  viewport.addEventListener('pointercancel', endPointer);
  viewport.addEventListener('pointerleave', e => {
    // Only end if no pointers left
    if(state.pointers.size === 0){
      state.dragging = false;
      viewport.classList.remove('dragging');
    }
  });

  // --- WHEEL ZOOM - FIXED FOR MOUSE + TRACKPAD ---
  viewport.addEventListener('wheel', e => {
    // Allow zoom with wheel, but prevent page scroll
    e.preventDefault();

    // Normalize delta - handle different devices
    let delta = e.deltaY;
    // If deltaMode is 1 (lines), convert to pixels (roughly 16px per line)
    if(e.deltaMode === 1) delta *= 16;
    else if(e.deltaMode === 2) delta *= 800; // pages

    // For trackpad, delta is often small, for mouse wheel larger
    // Use exponential factor for smooth zoom
    // Negative delta = zoom in, positive = zoom out
    const factor = Math.exp(-delta * 0.0012); // tuned for smoothness

    // Clamp factor to avoid extreme jumps
    const clampedFactor = clamp(factor, 0.85, 1.18);

    zoomByFactor(clampedFactor, e.clientX, e.clientY);

  }, {passive:false});

  // Double click zoom
  viewport.addEventListener('dblclick', e => {
    // Don't double zoom if clicking on marker
    if(e.target.closest('.marker')) return;
    e.preventDefault();
    zoomByFactor(1.5, e.clientX, e.clientY);
  });

  // --- BUTTON CONTROLS ---
  $('#zoomIn')?.addEventListener('click', () => {
    const rect = viewport.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    zoomByFactor(1.28, centerX, centerY);
  });
  $('#zoomOut')?.addEventListener('click', () => {
    const rect = viewport.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    zoomByFactor(0.78, centerX, centerY);
  });
  $('#resetView')?.addEventListener('click', resetView);

  // Directory toggle
  const directory = $('#directory');
  const floatingSearch = $('#openDirectory');
  const toggleUI = $('#toggleUI');
  function setNavigatorHidden(hidden){
    directory?.classList.toggle('navigator-hidden', hidden);
    floatingSearch?.classList.toggle('navigator-hidden', hidden);
    if(toggleUI){
      toggleUI.setAttribute('aria-label', hidden ? 'Show Campus Navigator' : 'Hide Campus Navigator');
      toggleUI.setAttribute('title', hidden ? 'Show Campus Navigator' : 'Hide Campus Navigator');
    }
  }
  toggleUI?.addEventListener('click',()=>{
    setNavigatorHidden(!directory?.classList.contains('navigator-hidden'));
  });

  $('#fitSelected')?.addEventListener('click',()=>{if(!state.selected){openDirectory();return}focusSelected();openDetailsPanel()});
  $('#routeToggle')?.addEventListener('click',()=>{if(!state.selected){openDirectory();return}toggleRoute()});
  $('#fullscreen')?.addEventListener('click',()=>{
    if(!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  });
  $('#openDetails')?.addEventListener('click',openDetailsPanel);
  $('#closeDetails')?.addEventListener('click',closeDetails);
  $('#detailFocus')?.addEventListener('click',()=>{focusSelected();closeDetails()});
  $('#detailRoute')?.addEventListener('click',()=>toggleRoute(true));
  $('#detailStreetView')?.addEventListener('click',()=>window.openIsetStreetView?.(state.selected));
  $('#search')?.addEventListener('input',e=>{state.query=e.target.value;renderDirectory()});
  $('#clearSearch')?.addEventListener('click',()=>{$('#search').value='';state.query='';renderDirectory();$('#search').focus()});
  $('#showAll')?.addEventListener('click',()=>{state.filter='all';state.query='';$('#search').value='';$$('.filter').forEach(x=>x.classList.toggle('active',x.dataset.filter==='all'));renderDirectory()});
  $$('.filter').forEach(b=>b.addEventListener('click',()=>{state.filter=b.dataset.filter;$$('.filter').forEach(x=>x.classList.toggle('active',x===b));renderDirectory()}));
  $('#refreshData')?.addEventListener('click',loadData);
  $('#helpBtn')?.addEventListener('click',()=>$('#helpModal').classList.add('open'));
  $('#closeHelp')?.addEventListener('click',()=>$('#helpModal').classList.remove('open'));
  $('#helpModal')?.addEventListener('click',e=>{if(e.target.id==='helpModal')e.currentTarget.classList.remove('open')});

  function openDirectory(){$('#directory').classList.add('open');setTimeout(()=>$('#search')?.focus(),100)}
  viewport.addEventListener('click',e=>{
    if(window.matchMedia('(max-width: 900px)').matches &&
       directory?.classList.contains('open') &&
       !e.target.closest('.marker')){
      directory.classList.remove('open');
    }
  });
  $('#openDirectory')?.addEventListener('click',openDirectory);
  $('#closeDirectory')?.addEventListener('click',()=>$('#directory').classList.remove('open'));
  $('#mobileSearch')?.addEventListener('click',openDirectory);
  $('#mobileDirectory')?.addEventListener('click',openDirectory);
  $('#mobileFocus')?.addEventListener('click',()=>focusSelected());
  $('#mobileRoute')?.addEventListener('click',()=>toggleRoute());

  // Keyboard
  document.addEventListener('keydown',e=>{
    if(e.target.matches('input,textarea,select')) return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openDirectory();return}
    if(e.key.toLowerCase()==='r'){e.preventDefault();toggleRoute()}
    if(e.key.toLowerCase()==='f'){e.preventDefault();focusSelected()}
    if(e.key==='+'||e.key==='='||e.key==='NumpadAdd'){
      e.preventDefault();
      const r=viewport.getBoundingClientRect();
      zoomByFactor(1.22, r.left+r.width/2, r.top+r.height/2);
    }
    if(e.key==='-'||e.key==='_'||e.key==='NumpadSubtract'){
      e.preventDefault();
      const r=viewport.getBoundingClientRect();
      zoomByFactor(0.82, r.left+r.width/2, r.top+r.height/2);
    }
    if(e.key==='0'){e.preventDefault();resetView()}
    if(e.key==='Escape'){closeDetails();$('#helpModal').classList.remove('open');$('#directory').classList.remove('open')}
  });

  // Resize handling - universal for all screens
  let resizeTimer;
  let lastWidth = window.innerWidth;
  let lastHeight = window.innerHeight;

  const handleResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(()=>{
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      const widthChanged = Math.abs(newWidth - lastWidth) > 50;
      const heightChanged = Math.abs(newHeight - lastHeight) > 50;

      // If significant resize (orientation change, TV resize, etc) - refit
      if(widthChanged || heightChanged){
        if(state.scale === 1 && !state.selected){
          fitMap();
        } else {
          // Keep current scale but re-clamp pan
          applyTransform();
          renderRoute();
        }
        lastWidth = newWidth;
        lastHeight = newHeight;
      } else {
        // Small resize - just update route
        renderRoute();
      }
    }, 120);
  };

  window.addEventListener('resize', handleResize, {passive:true});
  window.addEventListener('orientationchange', () => {
    setTimeout(()=>{ fitMap(); if(state.selected) focusSelected(); }, 300);
  });

  // Also watch viewport size with ResizeObserver for more precise handling
  if('ResizeObserver' in window){
    const ro = new ResizeObserver(() => handleResize());
    ro.observe(viewport);
  }

  // Initial load
  loadData();

  // Fit on load after images
  window.addEventListener('load', () => {
    setTimeout(fitMap, 100);
  });

  // Prevent context menu on long press (mobile)
  viewport.addEventListener('contextmenu', e => {
    if(e.target.closest('.marker')) return;
    e.preventDefault();
  });

  // Prevent double-tap zoom on iOS Safari (we handle it ourselves)
  let lastTouchEnd = 0;
  viewport.addEventListener('touchend', e => {
    const now = Date.now();
    if(now - lastTouchEnd <= 300){
      // Double tap detected - prevent default browser zoom
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, {passive:false});

})();
