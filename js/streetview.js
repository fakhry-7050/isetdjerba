(() => {
  'use strict';
  let modal=null, scene=null, camera=null, renderer=null, sphere=null, frame=0;
  let lon=0, lat=0, fov=75, dragging=false, lastX=0, lastY=0, current=null;

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  function close(){
    if(!modal)return;
    cancelAnimationFrame(frame);
    try{modal.__cleanup?.();}catch(e){}
    try{renderer?.dispose?.();}catch(e){}
    modal.remove();
    modal=null;scene=null;camera=null;renderer=null;sphere=null;current=null;
    document.body.style.overflow='';
  }

  function linksFor(loc){
    const links=Array.isArray(loc?.streetLinks)?loc.streetLinks:[];
    const all=Array.isArray(window.__isetCampusLocations)?window.__isetCampusLocations:[];
    return links.map(id=>all.find(x=>x.id===id)).filter(Boolean);
  }

  function open(loc){
    close();
    current=loc||null;
    modal=document.createElement('div');
    modal.className='streetview-modal open';
    modal.innerHTML=`
      <div class="streetview-stage"></div>
      <div class="streetview-loader">Loading 360° view…</div>
      <div class="streetview-ui">
        <div class="streetview-topbar">
          <div class="streetview-title"><strong></strong><span>Campus 360° · Drag to look around</span></div>
          <div class="streetview-actions">
            <button type="button" data-zoom-out aria-label="Zoom out">−</button>
            <button type="button" data-zoom-in aria-label="Zoom in">+</button>
            <button type="button" data-fullscreen aria-label="Fullscreen">⛶</button>
            <button type="button" data-close aria-label="Close">×</button>
          </div>
        </div>
        <div class="streetview-bottom">
          <div class="streetview-hint">🖱 Drag · Wheel zoom · Touch drag</div>
          <div class="streetview-links"></div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.body.style.overflow='hidden';
    modal.querySelector('.streetview-title strong').textContent=loc?.name||'ISET Djerba';
    modal.querySelector('[data-close]').addEventListener('click',close);
    modal.querySelector('[data-fullscreen]').addEventListener('click',()=>modal.requestFullscreen?.());
    modal.querySelector('[data-zoom-in]').addEventListener('click',()=>setFov(fov-8));
    modal.querySelector('[data-zoom-out]').addEventListener('click',()=>setFov(fov+8));

    const linksBox=modal.querySelector('.streetview-links');
    const links=linksFor(loc);
    links.forEach(target=>{
      const b=document.createElement('button');b.className='streetview-link';b.textContent='→ '+target.name;
      b.addEventListener('click',()=>open(target));linksBox.appendChild(b);
    });

    if(!loc?.panorama){
      modal.querySelector('.streetview-loader').outerHTML=`<div class="streetview-empty"><div class="streetview-empty-card"><b>360° photo not added yet</b><p>This location is ready for Street View. When you photograph the ISET, add its equirectangular 360° image to this place and it will open here.</p><code>panorama: "your-360-image.jpg"</code></div></div>`;
      return;
    }
    initThree(loc.panorama);
  }

  function setFov(v){
    fov=clamp(v,45,100);
    if(camera){camera.fov=fov;camera.updateProjectionMatrix();}
  }

  function initThree(url){
    if(!window.THREE){
      modal.querySelector('.streetview-loader').textContent='360° viewer library unavailable.';
      return;
    }
    const stage=modal.querySelector('.streetview-stage');
    scene=new THREE.Scene();
    camera=new THREE.PerspectiveCamera(fov,stage.clientWidth/stage.clientHeight,.1,1100);
    camera.position.set(0,0,0.1);
    renderer=new THREE.WebGLRenderer({antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer.setSize(stage.clientWidth,stage.clientHeight);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    stage.appendChild(renderer.domElement);

    const textureLoader=new THREE.TextureLoader();
    textureLoader.load(url,(texture)=>{
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.minFilter=THREE.LinearFilter;
      const geometry=new THREE.SphereGeometry(500,72,48);
      geometry.scale(-1,1,1);
      sphere=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:texture}));
      scene.add(sphere);
      modal.querySelector('.streetview-loader')?.remove();
      animate();
    },undefined,()=>{
      modal.querySelector('.streetview-loader').textContent='Could not load this 360° image.';
    });

    const resize=()=>{
      if(!camera||!renderer)return;
      camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();
      renderer.setSize(stage.clientWidth,stage.clientHeight);
    };
    window.addEventListener('resize',resize);
    modal.__resize=resize;

    const look=(dx,dy)=>{
      lon-=dx*.18;lat+=dy*.12;lat=clamp(lat,-85,85);
    };
    const down=e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture?.(e.pointerId)};
    const move=e=>{if(!dragging)return;look(e.clientX-lastX,e.clientY-lastY);lastX=e.clientX;lastY=e.clientY};
    const up=()=>{dragging=false};
    renderer.domElement.addEventListener('pointerdown',down);
    renderer.domElement.addEventListener('pointermove',move);
    renderer.domElement.addEventListener('pointerup',up);
    renderer.domElement.addEventListener('pointercancel',up);
    renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();setFov(fov+(e.deltaY>0?5:-5))},{passive:false});
    modal.__cleanup=()=>{window.removeEventListener('resize',resize);renderer?.domElement?.removeEventListener('pointerdown',down);renderer?.domElement?.removeEventListener('pointermove',move);renderer?.domElement?.removeEventListener('pointerup',up);renderer?.domElement?.removeEventListener('pointercancel',up)};
  }

  function animate(){
    if(!modal||!renderer||!camera)return;
    const phi=THREE.MathUtils.degToRad(90-lat);
    const theta=THREE.MathUtils.degToRad(lon);
    camera.lookAt(
      Math.sin(phi)*Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi)*Math.sin(theta)
    );
    renderer.render(scene,camera);
    frame=requestAnimationFrame(animate);
  }

  window.openIsetStreetView=open;
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal)close()});
})();
