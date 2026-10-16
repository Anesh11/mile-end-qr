import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js';

import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/OutputPass.js';

// Route order and district-local landmark positions are shared by every representation.
export const STOPS = [
  { id: 'metro', number: 'M', name: 'DÉPART · MÉTRO LAURIER', position: [7, -6], pinHeight: 1.5 },
  { id: 'drogheria', number: '1', name: 'DROGHERIA FINE', position: [-2.5, -4.9], pinHeight: 1.5, description: "l'épicerie italienne du quartier" },
  { id: 'fairmount', number: '2', name: 'FAIRMOUNT BAGEL', position: [-1, -4.9], pinHeight: 1.5, description: 'la célèbre boulangerie de bagels' },
  { id: 'olimpico', number: '3', name: 'CAFÉ OLIMPICO', position: [-5, 1], pinHeight: 1.7, description: 'le café célèbre depuis 1970' },
  { id: 'church', number: '4', name: 'ÉGLISE SAINT-MICHEL-ARCHANGE', position: [-7.1, 1.4], pinHeight: 3.6, description: 'la belle église du quartier' },
  { id: 'rialto', number: '5', name: 'THÉÂTRE RIALTO', position: [4.8, 5.3], pinHeight: 2.4, description: 'le vieux cinéma des années 1920,', extra: "point d'arrivée" }
];

export function mountMap3D(container, { interactive = true, width = container.clientWidth || 640, height = 440, pixelRatio = 1, preserveDrawingBuffer = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer });
  renderer.setPixelRatio(interactive ? Math.min(pixelRatio, 2) : 1);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(width, height);
  renderer.setClearColor('#fdf3e3');
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', 'Circuit schématique du Mile End : station Laurier, Drogheria Fine, Fairmount Bagel, Café Olimpico, église Saint-Michel-Archange et Théâtre Rialto.');
  container.append(renderer.domElement);
  const scene = new THREE.Scene();
  const aspect = width / height, span = aspect < 1 ? 19 / aspect : 20;
  const camera = new THREE.OrthographicCamera(-span * aspect / 2, span * aspect / 2, span / 2, -span / 2, .1, 150);
  camera.position.set(25, 20.4, 25); camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xfff5df, 0x877568, 2.8));
  const sunlight = new THREE.DirectionalLight(0xffd5a0, 3); sunlight.position.set(-10, 24, 12); scene.add(sunlight);
  sunlight.castShadow = true; sunlight.shadow.mapSize.setScalar(interactive ? 1024 : 4096);
  Object.assign(sunlight.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: .1, far: 70 });
  sunlight.shadow.bias = -.0005; sunlight.shadow.normalBias = .03;
  // Only route objects are on layer 1; cream surfaces, pins and text never enter bloom.
  const bloomComposer = new EffectComposer(renderer);
  bloomComposer.renderToScreen = false;
  const bloomScene = new RenderPass(scene, camera);
  bloomScene.clearColor = new THREE.Color(0x000000);
  bloomScene.clearAlpha = 0;
  bloomComposer.addPass(bloomScene);
  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), .65, .4, .9);
  bloomComposer.addPass(bloom);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new ShaderPass({
    uniforms: { tDiffuse: { value: null }, bloomTexture: { value: bloomComposer.renderTarget2.texture } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D bloomTexture; varying vec2 vUv; void main(){vec4 base=texture2D(tDiffuse,vUv);gl_FragColor=vec4(base.rgb+texture2D(bloomTexture,vUv).rgb,base.a);}`
  }));
  const finish = new ShaderPass({ uniforms: { tDiffuse: { value: null }, texel: { value: new THREE.Vector2(1 / width, 1 / height) } }, vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`, fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 texel; varying vec2 vUv; void main(){float edge=smoothstep(.24,.5,abs(vUv.y-.5));vec4 c=texture2D(tDiffuse,vUv)*.4;for(int i=1;i<=3;i++){vec2 d=texel*float(i)*edge*2.;c+=(texture2D(tDiffuse,vUv+d)+texture2D(tDiffuse,vUv-d))*.1;}float vignette=1.-.18*smoothstep(.25,.7,length(vUv-.5));gl_FragColor=vec4(c.rgb*vignette,c.a);}` });
  composer.addPass(finish); composer.addPass(new OutputPass());
  if (interactive) bloom.setSize(width * renderer.getPixelRatio() / 2, height * renderer.getPixelRatio() / 2);
  const district = new THREE.Group(); district.rotation.y = -35 * Math.PI / 180; scene.add(district);
  const mat = color => new THREE.MeshStandardMaterial({ color, roughness: .85 });
  const cream = mat('#fdf3e3'), road = mat('#dedbd5'), orange = mat('#e2761d'), stone = mat('#dcc9a7'), dome = mat('#819d94');
  function mesh(geometry, material, x, y, z) {
    const object = new THREE.Mesh(geometry, material); object.position.set(x, y, z); object.castShadow = true; object.receiveShadow = true; district.add(object); return object;
  }
  function box(w, h, d, material, x, y, z) { return mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z); }
  box(22, .12, 17, cream, 0, -.1, 0);
  const avenues = [-4, 0, 4], crosses = [-8, -5, -2, 1, 4, 7];
  avenues.forEach(z => { box(21, .025, .94, mat('#fffaf0'), 0, -.01, z); box(21, .035, .72, road, 0, 0, z); });
  crosses.forEach(x => { box(.87, .025, 15, mat('#fffaf0'), x, -.01, 0); box(.65, .035, 15, road, x, 0, 0); });
  function label(text, x, y, z, size = .42, color = '#1b2a4a', background = false) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = '48px "Bebas Neue", Impact, sans-serif';
    canvas.width = Math.ceil(ctx.measureText(text).width + 32); canvas.height = 80;
    ctx.font = '48px "Bebas Neue", Impact, sans-serif';
    if (background) { ctx.fillStyle = '#fdf3e3'; ctx.fillRect(0, 0, canvas.width, 80); }
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, canvas.width / 2, 40);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false }));
    sprite.position.set(x, y, z); sprite.scale.set(size * canvas.width / 80, size, 1); sprite.renderOrder = 5; district.add(sprite); return sprite;
  }
  function street(text, x, z, turn = 0) {
    const sprite = label(text, x, .06, z, .38);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(sprite.scale.x, sprite.scale.y), new THREE.MeshBasicMaterial({ map: sprite.material.map, transparent: true, depthWrite: false }));
    plate.rotation.set(-Math.PI / 2, 0, turn); plate.position.copy(sprite.position); district.remove(sprite); sprite.material.dispose(); district.add(plate);
  }
  ['FAIRMOUNT', 'SAINT-VIATEUR', 'BERNARD'].forEach((name, i) => street(name, 8, avenues[i]));
  ['SAINT-URBAIN', 'WAVERLY', 'ESPLANADE', 'JEANNE-MANCE', 'AV. DU PARC', 'CLARK'].forEach((name, i) => street(name, crosses[i], -5.8, Math.PI / 2));
  let seed = 1970;
  function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  const bricks = ['#bc806c', '#d1b391', '#ead5b7', '#c49b7d', '#b96d59'].map(mat);
  for (let x = -9.7; x < 10; x += .9) {
    for (let z = -6; z < 6.5; z += 1.05) {
      if (crosses.some(v => Math.abs(x - v) < .8) || avenues.some(v => Math.abs(z - v) < .85)) continue;
      if (STOPS.some(({position: [sx, sz]}) => Math.abs(x - sx) < 1.5 && Math.abs(z - sz) < 1.4)) continue;
      const h = .3 + random() * 1.1;
      box(.65, h, .72, bricks[Math.floor(random() * bricks.length)], x, h / 2, z);
      box(.69, .09, .76, mat('#efddc3'), x, h + .045, z);
    }
  }
  // Build landmark geometry relative to its stop, never a second world position.
  STOPS.forEach(stop => {
    const first = district.children.length;
    if (stop.id === 'church') {
      box(2.1, 1, 1.6, stone, 0, .5, 0);
      mesh(new THREE.CylinderGeometry(.8, .8, .6, 24), stone, 0, 1.3, 0);
      mesh(new THREE.SphereGeometry(.83, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), dome, 0, 1.6, 0);
      [-.9, .9].forEach(x => {
        box(.4, 1.8, .4, stone, x, .9, -.7);
        mesh(new THREE.ConeGeometry(.32, .5, 8), dome, x, 2.05, -.7);
      });
      box(.08, .7, .08, stone, 0, 2.75, 0); box(.42, .08, .08, stone, 0, 2.85, 0);
    } else if (stop.id === 'rialto') {
      box(1.8, 1.7, 1.2, stone, 0, .85, 0);
      box(2, .24, .65, new THREE.MeshStandardMaterial({color:'#ffcf7c',emissive:'#ff982c',emissiveIntensity:2}), 0, .95, -.75);
      label('RIALTO', 0, 1.35, -.8, .37, '#f0625a', true);
    } else if (stop.id === 'metro') {
      box(.28, 1.3, .28, orange, 0, .65, 0);
    } else {
      box(1.2, .7, .7, stone, 0, .35, 0);
      if (stop.id === 'olimpico') box(1.5, .12, .6, mat('#28614f'), 0, .7, -.5);
    }
    district.children.slice(first).forEach(object => {
      object.position.x += stop.position[0]; object.position.z += stop.position[1];
    });
  });
  // Each leg reaches the next landmark, with an orthogonal bend derived from its endpoints.
  const points = [STOPS[0].position];
  STOPS.slice(1).forEach((stop, i) => {
    const previous = STOPS[i].position;
    if (previous[0] !== stop.position[0] && previous[1] !== stop.position[1]) points.push([stop.position[0], previous[1]]);
    points.push(stop.position);
  });
  const curve = new THREE.CurvePath();
  points.slice(1).forEach(([x,z], i) => curve.add(new THREE.LineCurve3(new THREE.Vector3(points[i][0], .18, points[i][1]), new THREE.Vector3(x, .18, z))));
  const purple = new THREE.MeshStandardMaterial({ color: '#5b2cff', emissive: '#5b2cff', emissiveIntensity: 5 });
  mesh(new THREE.TubeGeometry(curve, 300, .10, 8, false), purple, 0, 0, 0).layers.enable(1);
  mesh(new THREE.TubeGeometry(curve, 300, .28, 8, false), new THREE.MeshBasicMaterial({ color: '#5b2cff', transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0, 0).layers.enable(1);
  const pulse = mesh(new THREE.SphereGeometry(.15, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff1ff').multiplyScalar(3) }), 0, 0, 0);
  pulse.layers.enable(1);
  const callouts = [];
  function card(text, number) {
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
    ctx.font = 'bold 64px "Bebas Neue", Impact, sans-serif';
    canvas.width = Math.ceil(ctx.measureText(text).width + (number ? 140 : 70)); canvas.height = 130;
    ctx.font = 'bold 64px "Bebas Neue", Impact, sans-serif';
    ctx.shadowColor = '#1b2a4a44'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(12, 10, canvas.width-24, 102, 48); ctx.fill(); ctx.shadowBlur=0; ctx.shadowOffsetY=0;
    if (number) { ctx.fillStyle='#e2761d'; ctx.beginPath(); ctx.arc(64,61,39,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(number,64,64); }
    ctx.fillStyle='#1b2a4a'; ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.fillText(text,number ? 118 : 35,64);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false})); sprite.renderOrder=10; scene.add(sprite);
    return {sprite, ratio:canvas.width/canvas.height};
  }
  STOPS.forEach(stop => {
    const [x, z] = stop.position, h = stop.pinHeight;
    const pin = mesh(new THREE.ConeGeometry(.22,.9,12),orange,x,h-.6,z); pin.rotation.z=Math.PI;
    mesh(new THREE.SphereGeometry(.32,16,12),orange,x,h,z);
    label(stop.number,x,h+.02,z,stop.id === 'metro' ? .65 : .43,stop.id === 'metro' ? '#e2761d' : '#ffffff',stop.id === 'metro');
    // Numbers appear once on the map, on their own pins.
    const {sprite,ratio} = card(stop.name, null);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:'#e2761d',depthTest:false,transparent:true,opacity:.8}));
    line.renderOrder=9; scene.add(line);
    callouts.push({stop,sprite,ratio,line,anchor:new THREE.Vector3(x,h,z)});
  });
  const foliage=mat('#829767'), trunk=mat('#927052');
  for(let i=0;i<24;i++){const x=-9+(i%12)*1.65,z=i<12 ? -3.3 : 4.8;if(crosses.some(v=>Math.abs(x-v)<.6))continue;mesh(new THREE.CylinderGeometry(.06,.09,.5,6),trunk,x,.25,z);mesh(new THREE.IcosahedronGeometry(.34,1),foliage,x,.65,z);}
  // Transparent radial footprints give buildings soft contact shadows.
  const shadowCanvas=document.createElement('canvas'); shadowCanvas.width=shadowCanvas.height=64;
  const shadowCtx=shadowCanvas.getContext('2d'), gradient=shadowCtx.createRadialGradient(32,32,5,32,32,32); gradient.addColorStop(0,'#49332455'); gradient.addColorStop(1,'#49332400'); shadowCtx.fillStyle=gradient; shadowCtx.fillRect(0,0,64,64);
  const contactMaterial=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false});
  const buildings=district.children.filter(o=>o.geometry?.type==='BoxGeometry' && o.position.y>.1);
  buildings.forEach(o=>{const footprint=mesh(new THREE.PlaneGeometry(o.geometry.parameters.width+.5,o.geometry.parameters.depth+.5),contactMaterial,o.position.x,.025,o.position.z);footprint.rotation.x=-Math.PI/2;footprint.castShadow=false;});
  const controls = interactive ? new OrbitControls(camera, renderer.domElement) : null;
  if (controls) {
    controls.enablePan = false; controls.enableDamping = false;
    controls.minPolarAngle = Math.PI / 5; controls.maxPolarAngle = Math.PI / 2.7;
    controls.minAzimuthAngle = Math.PI / 12; controls.maxAzimuthAngle = Math.PI * 5 / 12;
    controls.minZoom = .75; controls.maxZoom = 2; controls.enableZoom = true;
    // Leave wheel scrolling to the itinerary; two-finger pinch still zooms.
    controls.mouseButtons.MIDDLE = null;
    controls.domElement.addEventListener('wheel', passWheel, { capture: true });
    controls.addEventListener('change', draw);
  }
  function passWheel(event) { event.stopImmediatePropagation(); }
  let disposed = false;
  function draw(time = 0) {
    if (disposed) return;
    pulse.position.copy(curve.getPoint((time * .00008) % 1));
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const viewWidth = (camera.right-camera.left)/camera.zoom;
    const viewHeight = (camera.top-camera.bottom)/camera.zoom;
    const occupied = [], projectedStops = [];
    callouts.forEach(({stop,sprite,ratio,line,anchor}) => {
      const worldAnchor = district.localToWorld(anchor.clone());
      const projected = worldAnchor.clone().project(camera);
      const px = (projected.x+1)*width/2, py = (1-projected.y)*height/2;
      const h = Math.min(height*.035, width*.29/ratio), w = h*ratio;
      const gap = Math.min(width,height)*.025;
      // Try nearby card edges; all candidates keep the leader within 12% of the frame.
      const candidates = [];
      for (const distance of [gap, gap*2, gap*3]) {
        // Keep Olimpico below and right of its pin, away from the church dome.
        const offsets = stop.id === 'olimpico'
          ? [[w/2+distance,h/2+distance]]
          : [[0,-h/2-distance],[0,h/2+distance],[-w/2-distance,0],[w/2+distance,0]];
        for (const [dx,dy] of offsets) {
          for (const nudge of (stop.id === 'olimpico' ? [0,h] : [0,-h,h])) {
            const cx = THREE.MathUtils.clamp(px+dx+(dx===0 ? nudge : 0),w/2+8,width-w/2-8);
            const cy = THREE.MathUtils.clamp(py+dy+(dx!==0 ? nudge : 0),h/2+8,height-h/2-8);
            const edgeX = THREE.MathUtils.clamp(px,cx-w/2,cx+w/2);
            const edgeY = THREE.MathUtils.clamp(py,cy-h/2,cy+h/2);
            const length = Math.hypot(edgeX-px,edgeY-py);
            if (length > Math.min(width,height)*.12) continue;
            const overlap = occupied.reduce((sum,r) => sum + Math.max(0,Math.min(cx+w/2,r.right)-Math.max(cx-w/2,r.left)+8)*Math.max(0,Math.min(cy+h/2,r.bottom)-Math.max(cy-h/2,r.top)+8),0);
            const pinOverlap = callouts.reduce((sum,other) => {
              const q = district.localToWorld(other.anchor.clone()).project(camera);
              const x = (q.x+1)*width/2, y = (1-q.y)*height/2;
              return sum + (Math.abs(cx-x)<w/2+height*.018 && Math.abs(cy-y)<h/2+height*.018 ? 1 : 0);
            },0);
            candidates.push({cx,cy,edgeX,edgeY,length,score:overlap*100+pinOverlap*width*height+length});
          }
        }
      }
      // A zoomed or rotated anchor can leave no short leader candidate. Keep its label.
      const fallbackX = THREE.MathUtils.clamp(px, w/2+8, width-w/2-8);
      const fallbackY = THREE.MathUtils.clamp(py-h/2-gap, h/2+8, height-h/2-8);
      const fallbackEdgeX = THREE.MathUtils.clamp(px, fallbackX-w/2, fallbackX+w/2);
      const fallbackEdgeY = THREE.MathUtils.clamp(py, fallbackY-h/2, fallbackY+h/2);
      const best = candidates.sort((a,b)=>a.score-b.score)[0] ?? {
        cx: fallbackX, cy: fallbackY, edgeX: fallbackEdgeX, edgeY: fallbackEdgeY,
        length: Math.hypot(fallbackEdgeX-px, fallbackEdgeY-py)
      };
      const {cx,cy,edgeX,edgeY,length} = best;
      occupied.push({left:cx-w/2,right:cx+w/2,top:cy-h/2,bottom:cy+h/2});
      sprite.position.set(cx/width*2-1,1-cy/height*2,projected.z).unproject(camera);
      sprite.scale.set(w/width*viewWidth,h/height*viewHeight,1);
      const edge = new THREE.Vector3(edgeX/width*2-1,1-edgeY/height*2,projected.z).unproject(camera);
      line.geometry.setFromPoints([worldAnchor,edge]);
      projectedStops.push({number:stop.number,name:stop.name,pin:[px,py],label:[cx,cy],leaderFraction:length/Math.min(width,height)});
    });
    renderer.domElement.projectedStops = projectedStops;
    const cameraLayers = camera.layers.mask;
    camera.layers.set(1);
    try { bloomComposer.render(); }
    finally { camera.layers.mask = cameraLayers; }
    composer.render();
  }
  function render(time = 0) { draw(time); }
  render();
  return { renderer, render, dispose() {
    disposed = true;
    controls?.domElement.removeEventListener('wheel', passWheel, true);
    controls?.dispose();
    const geometries = new Set(), materials = new Set(), textures = new Set();
    scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) for (const material of [object.material].flat()) { materials.add(material); if (material.map) textures.add(material.map); }
    });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
    for (const pipeline of [bloomComposer, composer]) {
      pipeline.passes.forEach(pass => pass.dispose?.()); pipeline.dispose();
    }
    renderer.dispose(); renderer.domElement.remove();
  } };
}
