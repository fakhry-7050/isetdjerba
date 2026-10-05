(() => {
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'iset2026';
const AUTH_KEY = 'iset-admin-auth';
const LOCATIONS_KEY = 'iset-locations';
const ROUTE_KEY = 'iset-route-settings';
const cropStart = 29.3;
const cropTop = 10.5;
const cropWidth = 100 - cropStart;
const cropHeight = 100 - cropTop;

const loginView = document.querySelector('#loginView');
const adminView = document.querySelector('#adminView');
const loginForm = document.querySelector('#loginForm');
const loginError = document.querySelector('#loginError');
const markersLayer = document.querySelector('#adminMarkers');
const canvas = document.querySelector('#adminMapCanvas');
const routePath = document.querySelector('#adminRoutePath');
const form = document.querySelector('#markerForm');
const rows = document.querySelector('#locationRows');
const search = document.querySelector('#adminSearch');
const message = document.querySelector('#editorMessage');
const CLOUD_KEY = 'iset-cloudinary-config';
loginView.hidden = false;
loginView.style.display = 'block';
adminView.hidden = true;
adminView.style.display = 'none';
let selectedId = null;
let locations = [];
let mode = 'move';
let routePoints = JSON.parse(localStorage.getItem('iset-route-points') || '[]');
let routesByLocation = JSON.parse(localStorage.getItem('iset-routes-by-location') || '{}');
let draggedMarker = null;

const byId = id => document.querySelector(`#${id}`);
const mapX = value => ((value - cropStart) / cropWidth) * 100;
const mapY = value => ((value - cropTop) / cropHeight) * 100;
const originalX = value => cropStart + (value * cropWidth / 100);
const originalY = value => cropTop + (value * cropHeight / 100);

function saveLocations() {
  localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
  window.campusLocations?.splice(0, window.campusLocations.length, ...locations);
}

async function loadSharedDataIntoAdmin() {
  try {
    const binId = window.JSONBIN_CONFIG?.BIN_ID;
    if (!binId || binId.includes('PASTE_YOUR')) throw new Error('JSONBin BIN_ID is not configured');
    const accessKey = window.JSONBIN_CONFIG?.ACCESS_KEY || window.JSONBIN_CONFIG?.UPDATE_ACCESS_KEY;
    if (!accessKey || accessKey.includes('PASTE_YOUR')) throw new Error('JSONBin ACCESS_KEY is not configured');
    const response = await fetch(`https://api.jsonbin.io/v3/b/${encodeURIComponent(binId)}/latest?ts=${Date.now()}`, {
      headers: { 'X-Access-Key': accessKey },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const data = payload.record || payload;

    if (Array.isArray(data.locations) && data.locations.length) {
      locations = data.locations.map(location => ({ ...location }));
      localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
    }
    if (Array.isArray(data.routePoints)) {
      routePoints = data.routePoints.map(point => ({ x: Number(point.x), y: Number(point.y) }));
      localStorage.setItem('iset-route-points', JSON.stringify(routePoints));
    }
    if (data.routesByLocation && typeof data.routesByLocation === 'object') {
      routesByLocation = data.routesByLocation;
      localStorage.setItem('iset-routes-by-location', JSON.stringify(routesByLocation));
    }
    if (data.routeSettings && Number.isFinite(Number(data.routeSettings.x)) && Number.isFinite(Number(data.routeSettings.y))) {
      byId('routeX').value = data.routeSettings.x;
      byId('routeY').value = data.routeSettings.y;
      localStorage.setItem(ROUTE_KEY, JSON.stringify(data.routeSettings));
    }

    window.campusLocations = locations;
    render();
    const status = byId('syncStatus');
    if (status) {
      status.textContent = `JSONBin connected • ${locations.length} markers`;
      status.style.color = '#5cae68';
    }
    return true;
  } catch (error) {
    console.warn('JSONBin data unavailable; using local/bundled data.', error);
    const status = byId('syncStatus');
    if (status) {
      status.textContent = `JSONBin error: ${error.message}`;
      status.style.color = '#d65b5b';
    }
    message.textContent = `Live data unavailable: ${error.message}`;
    return false;
  }
}

async function saveSharedData() {
  try {
    const binId = window.JSONBIN_CONFIG?.BIN_ID;
    const accessKey = window.JSONBIN_CONFIG?.UPDATE_ACCESS_KEY;
    if (!binId || binId.includes('PASTE_YOUR')) throw new Error('JSONBin BIN_ID is not configured');
    if (!accessKey || accessKey.includes('PASTE_YOUR')) throw new Error('JSONBin UPDATE_ACCESS_KEY is not configured');

    const routeSettings = {
      x: Number(byId('routeX')?.value ?? 64.2),
      y: Number(byId('routeY')?.value ?? 83.1)
    };
    if (!Number.isFinite(routeSettings.x) || !Number.isFinite(routeSettings.y)) {
      throw new Error('Invalid route start coordinates');
    }

    const data = { locations, routePoints, routesByLocation, routeSettings };
    const response = await fetch(`https://api.jsonbin.io/v3/b/${encodeURIComponent(binId)}`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'X-Access-Key': accessKey,
        'X-Bin-Versioning': 'true'
      },
      cache: 'no-store',
      body: JSON.stringify(data)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || `HTTP ${response.status}`);

    const saved = result.record || data;
    if (Array.isArray(saved.locations)) {
      locations = saved.locations.map(location => ({ ...location }));
      localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
    }
    if (Array.isArray(saved.routePoints)) {
      routePoints = saved.routePoints.map(point => ({ x: Number(point.x), y: Number(point.y) }));
      localStorage.setItem('iset-route-points', JSON.stringify(routePoints));
    }
    if (saved.routesByLocation && typeof saved.routesByLocation === 'object') {
      routesByLocation = saved.routesByLocation;
      localStorage.setItem('iset-routes-by-location', JSON.stringify(routesByLocation));
    }
    localStorage.setItem(ROUTE_KEY, JSON.stringify(routeSettings));
    window.campusLocations?.splice(0, window.campusLocations.length, ...locations);
    render();
    return true;
  } catch (error) {
    console.error('JSONBin save failed:', error);
    message.textContent = `Save failed: ${error.message}`;
    return false;
  }
}

function coordinatesFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(100, originalX(((event.clientX - rect.left) / rect.width) * 100))),
    y: Math.max(0, Math.min(100, originalY(((event.clientY - rect.top) / rect.height) * 100)))
  };
}

function renderRoute() {
  const points = routePoints.map(point => `${mapX(point.x)},${mapY(point.y)}`);
  routePath.setAttribute('d', points.length ? `M ${points.join(' L ')}` : '');
}

function loadCloudinaryConfig(){
  try{return JSON.parse(localStorage.getItem(CLOUD_KEY)||'{}')}catch{return {}}
}
function renderCloudinaryConfig(){
  const cfg=loadCloudinaryConfig();
  const cloud=byId('cloudinaryCloud'), preset=byId('cloudinaryPreset');
  if(cloud) cloud.value=cfg.cloud||'';
  if(preset) preset.value=cfg.preset||'';
  const status=byId('cloudinaryStatus');
  if(status) status.textContent=cfg.cloud&&cfg.preset?'Ready to upload.':'Add your Cloudinary cloud name + unsigned preset.';
}
function populateStreetLinks(selected=[]){
  const select=byId('streetLinks'); if(!select)return;
  const selectedSet=new Set(Array.isArray(selected)?selected:[]);
  select.innerHTML=locations.filter(l=>l.id!==selectedId).map(l=>'<option value="'+String(l.id).replace(/"/g,'&quot;')+'" '+(selectedSet.has(l.id)?'selected':'')+'>'+String(l.name).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+'</option>').join('');
}
function renderPanoramaPreview(url){
  const box=byId('panoramaPreview'); if(!box)return;
  box.innerHTML=url?'<div class="panorama-preview-card"><img src="'+String(url).replace(/"/g,'&quot;')+'" alt="360 panorama preview"><span>360° image attached</span></div>':'<div class="image-empty">No 360° panorama uploaded yet.</div>';
}
async function uploadPanorama(){
  const file=byId('panoramaFile')?.files?.[0];
  const cfg=loadCloudinaryConfig();
  const status=byId('panoramaUploadStatus');
  if(!file){if(status)status.textContent='Choose a 360° image first.';return;}
  if(!cfg.cloud||!cfg.preset){if(status)status.textContent='Set up Cloudinary first above.';document.querySelector('.upload-settings')?.setAttribute('open','');return;}
  if(file.size>100*1024*1024){if(status)status.textContent='File is over 100 MB.';return;}
  if(status)status.textContent='Uploading…';
  const fd=new FormData(); fd.append('file',file); fd.append('upload_preset',cfg.preset); fd.append('folder','iset-djerba/360');
  try{
    const res=await fetch('https://api.cloudinary.com/v1_1/'+encodeURIComponent(cfg.cloud)+'/image/upload',{method:'POST',body:fd});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.secure_url)throw new Error(data.error?.message||'Upload failed');
    byId('markerPanorama').value=data.secure_url;
    renderPanoramaPreview(data.secure_url);
    if(status)status.textContent='Uploaded ✓';
  }catch(err){console.error(err);if(status)status.textContent='Upload failed: '+err.message;}
}

function showEditor(location) {
  selectedId = location?.id || null;
  byId('editorTitle').textContent = location?.name || 'New marker';
  byId('deleteButton').disabled = !location;
  byId('markerName').value = location?.name || '';
  byId('markerShort').value = location?.short || '';
  byId('markerType').value = location?.type || 'common';
  byId('markerDesc').value = location?.desc || '';
  byId('markerImages').value = Array.isArray(location?.images) ? location.images.join('\n') : '';
  byId('markerPanorama').value = location?.panorama || '';
  byId('panoramaFile').value = '';
  byId('panoramaUploadStatus').textContent = '';
  renderPanoramaPreview(location?.panorama || '');
  populateStreetLinks(location?.streetLinks || []);
  renderAdminImagePreview();
  byId('markerX').value = Number(location?.x ?? 50).toFixed(1);
  byId('markerY').value = Number(location?.y ?? 50).toFixed(1);
  message.textContent = location ? 'Marker selected. Click the map to reposition it.' : 'Create a new marker, then save it.';
  render();
}

function renderAdminImagePreview() {
  const box = byId('imagePreview');
  if (!box) return;
  const urls = (byId('markerImages')?.value || '').split(/\r?\n/).map(v => v.trim()).filter(Boolean);
  box.innerHTML = urls.length ? urls.map((url, i) => '<div class="admin-image-thumb"><img src="' + url.replace(/"/g, '&quot;') + '" alt="Photo ' + (i + 1) + '"></div>').join('') : '<span class="image-empty">No photos added yet.</span>';
}

function render() {
  const query = (search?.value || '').trim().toLowerCase();
  const visible = locations.filter(location => `${location.name} ${location.short} ${location.type}`.toLowerCase().includes(query));
  byId('markerCount').textContent = `${locations.length} markers`;
  markersLayer.innerHTML = locations.map(location => `<div class="admin-marker ${selectedId === location.id ? 'selected' : ''}" data-id="${location.id}" style="left:${mapX(location.x)}%;top:${mapY(location.y)}%"><button type="button" aria-label="Edit ${location.name}"><span>${location.short}</span></button><em>${location.short}</em></div>`).join('');
  markersLayer.querySelectorAll('.admin-marker button').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    showEditor(locations.find(location => location.id === button.parentElement.dataset.id));
  }));
  markersLayer.querySelectorAll('.admin-marker').forEach(marker => marker.addEventListener('pointerdown', event => {
    if (mode !== 'move') return;
    event.preventDefault();
    event.stopPropagation();
    selectedId = marker.dataset.id;
    draggedMarker = marker;
    showEditor(locations.find(location => location.id === selectedId));
  }));
  rows.innerHTML = visible.map(location => `<div class="location-row ${selectedId === location.id ? 'selected' : ''}" data-id="${location.id}" data-type="${location.type}"><span class="row-icon">${location.short.slice(0, 3)}</span><b>${location.name}<small>${location.desc}</small></b><span class="row-coords">${Number(location.x).toFixed(1)} / ${Number(location.y).toFixed(1)}</span><span class="row-edit">EDIT ↗</span></div>`).join('');
  rows.querySelectorAll('.location-row').forEach(row => row.addEventListener('click', () => showEditor(locations.find(location => location.id === row.dataset.id))));
  renderRoute();
}

async function openAdmin() {
  loginView.hidden = true;
  loginView.style.display = 'none';
  adminView.hidden = false;
  adminView.style.display = 'grid';

  const route = JSON.parse(localStorage.getItem(ROUTE_KEY) || '{"x":64.2,"y":83.1}');
  byId('routeX').value = route.x;
  byId('routeY').value = route.y;

  locations = (window.campusLocations || []).map(location => ({ ...location }));
  render();

  // Always prefer the live Netlify data when the admin page is online.
  await loadSharedDataIntoAdmin();
}

loginForm.addEventListener('submit', event => {
  event.preventDefault();
  if (byId('loginUser').value.trim() === ADMIN_USER && byId('loginPass').value === ADMIN_PASS) {
    sessionStorage.setItem(AUTH_KEY, 'true');
    openAdmin();
  } else {
    loginError.textContent = 'Invalid username or password.';
  }
});

byId('logoutButton').addEventListener('click', () => {
  sessionStorage.removeItem(AUTH_KEY);
  adminView.hidden = true;
  adminView.style.display = 'none';
  loginView.hidden = false;
  loginView.style.display = 'block';
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const images = (byId('markerImages').value || '').split(/\r?\n/).map(v => v.trim()).filter(Boolean).slice(0, 12);
  const panorama = byId('markerPanorama').value.trim();
  const streetLinks = [...(byId('streetLinks')?.selectedOptions || [])].map(o=>o.value);
  const data = { id: selectedId || `custom-${Date.now()}`, name: byId('markerName').value.trim(), short: byId('markerShort').value.trim().toUpperCase(), type: byId('markerType').value, desc: byId('markerDesc').value.trim(), images, panorama, streetLinks, x: Number(byId('markerX').value), y: Number(byId('markerY').value) };
  const index = locations.findIndex(location => location.id === data.id);
  if (index >= 0) locations[index] = data;
  else locations.push(data);
  selectedId = data.id;
  saveLocations();
  const synced = await saveSharedData();
  showEditor(data);
  message.textContent = synced
    ? 'Saved and published for everyone.'
    : 'Saved locally, but server sync failed.';
});

byId('deleteButton').addEventListener('click', async () => {
  if (!selectedId || !confirm('Delete this marker?')) return;
  locations = locations.filter(location => location.id !== selectedId);
  selectedId = null;
  saveLocations();
  await saveSharedData();
  showEditor(null);
});

byId('newMarkerButton').addEventListener('click', () => showEditor(null));
byId('saveCloudinary')?.addEventListener('click',()=>{
  const cloud=byId('cloudinaryCloud').value.trim();
  const preset=byId('cloudinaryPreset').value.trim();
  localStorage.setItem(CLOUD_KEY,JSON.stringify({cloud,preset}));
  renderCloudinaryConfig();
});
byId('uploadPanoramaButton')?.addEventListener('click',uploadPanorama);
byId('markerImages')?.addEventListener('input', renderAdminImagePreview);
search.addEventListener('input', render);

document.querySelectorAll('.map-mode').forEach(button => button.addEventListener('click', () => {
  mode = button.dataset.mode;

  if (mode === 'route') {
    if (!selectedId) {
      mode = 'move';
      message.textContent = 'Select a marker first, then choose Draw route.';
    } else {
      routePoints = Array.isArray(routesByLocation[selectedId])
        ? routesByLocation[selectedId].map(point => ({ ...point }))
        : [];
      renderRoute();
      message.textContent = `Drawing route for ${locations.find(item => item.id === selectedId)?.name || 'selected marker'}.`;
    }
  }

  document.querySelectorAll('.map-mode').forEach(item => item.classList.toggle('active', item === button));
  byId('mapModeHint').textContent = mode === 'move' ? 'Drag a marker to move it' : mode === 'add' ? 'Click the plan to create a marker' : 'Click the plan to add route points';
  canvas.style.cursor = mode === 'move' ? 'grab' : 'crosshair';
}));

canvas.addEventListener('click', event => {
  if (mode === 'route') {
    if (!selectedId) {
      message.textContent = 'Select a marker before drawing its route.';
      return;
    }
    const point = coordinatesFromEvent(event);
    routePoints.push(point);
    localStorage.setItem('iset-route-points', JSON.stringify(routePoints));
    byId('coordinateReadout').textContent = `${point.x.toFixed(1)} / ${point.y.toFixed(1)}`;
    renderRoute();
    return;
  }
  if (mode === 'add') {
    const point = coordinatesFromEvent(event);
    selectedId = null;
    showEditor({ id: `custom-${Date.now()}`, name: '', short: '', type: 'common', desc: '', x: point.x, y: point.y });
    byId('coordinateReadout').textContent = `${point.x.toFixed(1)} / ${point.y.toFixed(1)}`;
    return;
  }
  if (!selectedId) {
    message.textContent = 'Select a marker or choose New marker first.';
    return;
  }
  const point = coordinatesFromEvent(event);
  const x = point.x;
  const y = point.y;
  byId('markerX').value = x.toFixed(1);
  byId('markerY').value = y.toFixed(1);
  byId('coordinateReadout').textContent = `${x.toFixed(1)} / ${y.toFixed(1)}`;
  message.textContent = 'Position updated in the form. Save place to publish it.';
});

document.addEventListener('pointermove', event => {
  if (!draggedMarker) return;
  const location = locations.find(item => item.id === draggedMarker.dataset.id);
  if (!location) return;
  const point = coordinatesFromEvent(event);
  location.x = point.x;
  location.y = point.y;
  draggedMarker.style.left = `${mapX(point.x)}%`;
  draggedMarker.style.top = `${mapY(point.y)}%`;
  byId('markerX').value = point.x.toFixed(1);
  byId('markerY').value = point.y.toFixed(1);
  byId('coordinateReadout').textContent = `${point.x.toFixed(1)} / ${point.y.toFixed(1)}`;
});

document.addEventListener('pointerup', () => {
  if (!draggedMarker) return;
  saveLocations();
  message.textContent = 'Marker position saved.';
  draggedMarker = null;
});

byId('saveRouteButton').addEventListener('click', async () => {
  if (!selectedId) {
    message.textContent = 'Select a marker first.';
    return;
  }

  if (!routePoints.length) {
    message.textContent = 'Draw at least one route point first.';
    return;
  }

  routesByLocation[selectedId] = routePoints.map(point => ({
    x: Number(point.x),
    y: Number(point.y)
  }));

  localStorage.setItem('iset-route-points', JSON.stringify(routePoints));
  localStorage.setItem(
    'iset-routes-by-location',
    JSON.stringify(routesByLocation)
  );

  const synced = await saveSharedData();

  message.textContent = synced
    ? 'Route saved for this marker and published for everyone.'
    : 'Route saved locally, but server sync failed.';
});

byId('saveRouteStartButton')?.addEventListener('click', async () => {
  const x = Number(byId('routeX').value);
  const y = Number(byId('routeY').value);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    message.textContent = 'Enter valid route start coordinates.';
    return;
  }

  localStorage.setItem(ROUTE_KEY, JSON.stringify({ x, y }));
  const synced = await saveSharedData();
  message.textContent = synced
    ? 'Route start saved and published for everyone.'
    : 'Route start saved locally, but server sync failed.';
});

byId('resetButton').addEventListener('click', () => {
  if (!confirm('Remove all saved marker changes and restore defaults?')) return;
  localStorage.removeItem(LOCATIONS_KEY);
  localStorage.removeItem(ROUTE_KEY);
  localStorage.removeItem('iset-route-points');
  localStorage.removeItem('iset-routes-by-location');
  window.location.reload();
});

byId('clearRouteButton').addEventListener('click', async () => {
  if (!selectedId) {
    message.textContent = 'Select a marker first.';
    return;
  }

  delete routesByLocation[selectedId];
  routePoints = [];

  localStorage.setItem('iset-route-points', '[]');
  localStorage.setItem(
    'iset-routes-by-location',
    JSON.stringify(routesByLocation)
  );

  await saveSharedData();
  renderRoute();
  message.textContent = 'Route cleared for this marker and synced.';
});

byId('exportButton').addEventListener('click', () => {
  const backup = { locations, route: { x: Number(byId('routeX').value), y: Number(byId('routeY').value) }, exportedAt: new Date().toISOString() };
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
  link.download = 'iset-map-backup.json';
  link.click();
  URL.revokeObjectURL(link.href);
});

renderCloudinaryConfig();
if (sessionStorage.getItem(AUTH_KEY) === 'true') openAdmin();
})();


/* =========================================================
   PORTABLE JSON BACKUP
   Exports exactly the current admin state.
========================================================= */
byId('exportLiveJson')?.addEventListener('click', () => {
  const data = {
    locations,
    routePoints,
    routesByLocation,
    routeSettings: {
      x: Number(byId('routeX')?.value ?? 64.2),
      y: Number(byId('routeY')?.value ?? 83.1)
    },
    exportedAt: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'iset-djerba-campus-data.json';
  link.click();
  URL.revokeObjectURL(url);
});
