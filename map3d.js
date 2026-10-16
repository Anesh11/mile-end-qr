import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { mergeGeometries } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/utils/BufferGeometryUtils.js';
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

export function mountMap3D(container, { interactive = true, width = container.clientWidth || 640, height = 440, pixelRatio = 1, preserveDrawingBuffer = false, mapOnly = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer });
  renderer.setPixelRatio(interactive ? Math.min(pixelRatio, 2) : 1);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(width, height);
  renderer.setClearColor('#fafaf8');
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', 'Circuit schématique du Mile End : station Laurier, Drogheria Fine, Fairmount Bagel, Café Olimpico, église Saint-Michel-Archange et Théâtre Rialto.');
  container.append(renderer.domElement);
  const scene = new THREE.Scene();
  const aspect = width / height, span = aspect < 1 ? 19 / aspect : 20;
  const camera = new THREE.OrthographicCamera(-span * aspect / 2, span * aspect / 2, span / 2, -span / 2, .1, 150);
  camera.position.set(25, 20.4, 25); camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc9c6c0, 2.8));
  const sunlight = new THREE.DirectionalLight(0xffffff, 2); sunlight.position.set(-10, 24, 12); scene.add(sunlight);
  sunlight.castShadow = true; sunlight.shadow.mapSize.setScalar(interactive ? 1024 : 4096);
  Object.assign(sunlight.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: .1, far: 70 });
  sunlight.shadow.bias = -.0005; sunlight.shadow.normalBias = .03;
  // Only the orange route core is on layer 1; scenery, pins and text never enter bloom.
  const bloomComposer = new EffectComposer(renderer);
  bloomComposer.renderToScreen = false;
  const bloomScene = new RenderPass(scene, camera);
  bloomScene.clearColor = new THREE.Color(0x000000);
  bloomScene.clearAlpha = 0;
  bloomComposer.addPass(bloomScene);
  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), .28, .5, .2);
  bloomComposer.addPass(bloom);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new ShaderPass({
    uniforms: { tDiffuse: { value: null }, bloomTexture: { value: bloomComposer.renderTarget2.texture } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D bloomTexture; varying vec2 vUv; void main(){vec4 base=texture2D(tDiffuse,vUv);gl_FragColor=vec4(base.rgb+texture2D(bloomTexture,vUv).rgb,base.a);}`
  }));
  composer.addPass(new OutputPass());
  if (interactive) bloom.setSize(width * renderer.getPixelRatio() / 2, height * renderer.getPixelRatio() / 2);
  const district = new THREE.Group(); district.rotation.y = -35 * Math.PI / 180; scene.add(district);
  const mat = color => new THREE.MeshStandardMaterial({ color, roughness: .85 });
  const cream = mat('#fafaf8'), road = mat('#e9e7e3'), orange = mat('#e2761d'), stone = mat('#d8d6d1'), dome = mat('#c9c6c0');
  function mesh(geometry, material, x, y, z) {
    const object = new THREE.Mesh(geometry, material); object.position.set(x, y, z); object.castShadow = true; object.receiveShadow = true; district.add(object); return object;
  }
  function box(w, h, d, material, x, y, z) { return mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z); }
  box(22, .12, 17, cream, 0, -.1, 0);
  const avenues = [-4, 0, 4], crosses = [-8, -5, -2, 1, 4, 7];
  avenues.forEach(z => { box(21, .025, .94, mat('#f5f5f2'), 0, -.01, z); box(21, .035, .72, road, 0, 0, z); });
  crosses.forEach(x => { box(.87, .025, 15, mat('#f5f5f2'), x, -.01, 0); box(.65, .035, 15, road, x, 0, 0); });
  function label(text, x, y, z, size = .42, color = '#1b2a4a', background = false) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = '48px "Bebas Neue", Impact, sans-serif';
    canvas.width = Math.ceil(ctx.measureText(text).width + 32); canvas.height = 80;
    ctx.font = '48px "Bebas Neue", Impact, sans-serif';
    if (background) { ctx.fillStyle = '#fafaf8'; ctx.fillRect(0, 0, canvas.width, 80); }
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, canvas.width / 2, 40);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false }));
    sprite.position.set(x, y, z); sprite.scale.set(size * canvas.width / 80, size, 1); sprite.renderOrder = 5; district.add(sprite); return sprite;
  }
  function street(text, x, z, turn = 0) {
    const sprite = label(text, x, .06, z, .38, '#c9c6c0');
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(sprite.scale.x, sprite.scale.y), new THREE.MeshBasicMaterial({ map: sprite.material.map, transparent: true, depthWrite: false }));
    plate.rotation.set(-Math.PI / 2, 0, turn); plate.position.copy(sprite.position); district.remove(sprite); sprite.material.dispose(); district.add(plate);
  }
  ['FAIRMOUNT', 'SAINT-VIATEUR', 'BERNARD'].forEach((name, i) => street(name, 8, avenues[i]));
  ['SAINT-URBAIN', 'WAVERLY', 'ESPLANADE', 'JEANNE-MANCE', 'AV. DU PARC', 'CLARK'].forEach((name, i) => street(name, crosses[i], -5.8, Math.PI / 2));
  let seed = 1970;
  function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  const bricks = ['#e9e7e3', '#dedcd7', '#e4e2de', '#d6d3ce', '#dcdad5'].map(mat);
  for (let x = -9.7; x < 10; x += .9) {
    for (let z = -6; z < 6.5; z += 1.05) {
      if (crosses.some(v => Math.abs(x - v) < .8) || avenues.some(v => Math.abs(z - v) < .85)) continue;
      if (STOPS.some(({position: [sx, sz]}) => Math.abs(x - sx) < 1.5 && Math.abs(z - sz) < 1.4)) continue;
      const h = .3 + random() * 1.1;
      box(.65, h, .72, bricks[Math.floor(random() * bricks.length)], x, h / 2, z);
      box(.69, .09, .76, mat('#e9e7e3'), x, h + .045, z);
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
      box(2, .24, .65, new THREE.MeshStandardMaterial({color:'#d6d3ce',roughness:.85}), 0, .95, -.75);
      label('RIALTO', 0, 1.35, -.8, .37, '#c9c6c0', true);
    } else if (stop.id === 'metro') {
      box(.28, 1.3, .28, stone, 0, .65, 0);
    } else {
      box(1.2, .7, .7, stone, 0, .35, 0);
      if (stop.id === 'olimpico') box(1.5, .12, .6, mat('#c9c6c0'), 0, .7, -.5);
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
  // Keep the route at street level and overlay buildings; only the core blooms.
  const overlay = color => new THREE.MeshBasicMaterial({color, depthTest:false, depthWrite:false, transparent:true});
  const routeMaterial = overlay('#ff6a00');
  const shoulder = mesh(new THREE.TubeGeometry(curve, 500, .39, 16, false), overlay('#ffffff'), 0, .18, 0);
  const route = mesh(new THREE.TubeGeometry(curve, 500, .30, 16, false), routeMaterial, 0, .37, 0);
  shoulder.renderOrder = 100; route.renderOrder = 101;
  shoulder.castShadow = route.castShadow = false;
  route.layers.enable(1);
  function chevronGeometry(width, length, thickness) {
    const shape = new THREE.Shape();
    shape.moveTo(-width/2,-length/2); shape.lineTo(0,length/2);
    shape.lineTo(width/2,-length/2); shape.lineTo(width/2-thickness,-length/2);
    shape.lineTo(0,length/2-thickness*1.6); shape.lineTo(-width/2+thickness,-length/2);
    shape.closePath();
    return new THREE.ShapeGeometry(shape).rotateX(Math.PI/2);
  }
  const arrows = Array.from({length: 14}, () => {
    const arrow = new THREE.Group();
    const outline = new THREE.Mesh(chevronGeometry(.54,.54,.19),overlay('#1b2a4a'));
    const core = new THREE.Mesh(chevronGeometry(.48,.46,.13),overlay('#ffffff'));
    outline.material.side = core.material.side = THREE.DoubleSide;
    outline.renderOrder = 102; core.renderOrder = 103;
    arrow.add(outline,core); district.add(arrow);
    return arrow;
  });
  const callouts = [];
  function card(text, number) {
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
    ctx.font = 'bold 72px "Bebas Neue", Impact, sans-serif';
    const lines = text === 'ÉGLISE SAINT-MICHEL-ARCHANGE' ? ['ÉGLISE SAINT-MICHEL-', 'ARCHANGE'] : [text];
    canvas.width = Math.ceil(Math.max(...lines.map(line => ctx.measureText(line).width)) + (number ? 150 : 70)); canvas.height = lines.length === 2 ? 210 : 130;
    ctx.font = 'bold 72px "Bebas Neue", Impact, sans-serif';
    ctx.shadowColor = '#1b2a4a44'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(12, 10, canvas.width-24, canvas.height-28, 28); ctx.fill(); ctx.shadowBlur=0; ctx.shadowOffsetY=0;
    if (number) { ctx.fillStyle='#e2761d'; ctx.beginPath(); ctx.arc(70,canvas.height/2-4,43,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(number,70,canvas.height/2); }
    ctx.fillStyle='#1b2a4a'; ctx.textAlign='left'; ctx.textBaseline='middle'; lines.forEach((line, i) => ctx.fillText(line,number ? 132 : 35,canvas.height/2 + (i-(lines.length-1)/2)*76));
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false})); sprite.renderOrder=120; scene.add(sprite);
    ctx.textBaseline = 'alphabetic';
    return {sprite, ratio:canvas.width/canvas.height, textFraction:ctx.measureText('H').actualBoundingBoxAscent/canvas.height};
  }
  const pinParts = [], pickTargets = [];
  STOPS.forEach(stop => {
    const firstPin = district.children.length;
    const [x, z] = stop.position, h = stop.pinHeight;
    const pin = mesh(new THREE.ConeGeometry(.40,1.3,16),orange,x,h-.6,z); pin.rotation.z=Math.PI;
    mesh(new THREE.SphereGeometry(.60,24,16),orange,x,h,z);
    const glyphCanvas = document.createElement('canvas');
    glyphCanvas.width = glyphCanvas.height = 256;
    const glyphContext = glyphCanvas.getContext('2d');
    glyphContext.font = '900 190px Arial, sans-serif';
    glyphContext.fillStyle = '#ffffff'; glyphContext.textAlign = 'center'; glyphContext.textBaseline = 'middle';
    glyphContext.fillText(stop.number,128,138);
    const glyphTexture = new THREE.CanvasTexture(glyphCanvas); glyphTexture.colorSpace = THREE.SRGBColorSpace;
    const glyph = new THREE.Sprite(new THREE.SpriteMaterial({map:glyphTexture,depthTest:false,depthWrite:false}));
    glyph.position.set(x,h+.02,z); glyph.scale.set(1.12,1.12,1); glyph.renderOrder=112; district.add(glyph);
    district.children.slice(firstPin).forEach(object => {
      if (object.isMesh) {
        object.material = object.material.clone();
        object.material.depthTest=false; object.material.depthWrite=false; object.material.transparent=true;
        object.renderOrder = object === pin ? 110 : 111; object.castShadow=false;
      }
    });
    if (mapOnly) district.children.slice(firstPin).forEach(object => {
      pinParts.push({object, origin: new THREE.Vector3(x,h,z), offset: object.position.clone().sub(new THREE.Vector3(x,h,z)), scale: object.scale.clone()});
    });
    if (interactive && stop.id !== 'metro') district.children.slice(firstPin).forEach(object => { object.userData.stopNumber=Number(stop.number); pickTargets.push(object); });
    // Numbers appear once on the map, on their own pins.
    const {sprite,ratio,textFraction} = card(stop.name, stop.id === 'metro' ? null : stop.number);
    if (interactive && stop.id !== 'metro') { sprite.userData.stopNumber=Number(stop.number); pickTargets.push(sprite); }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:'#e2761d',depthTest:false,transparent:true,opacity:.8}));
    line.renderOrder=109; scene.add(line);
    callouts.push({stop,sprite,ratio,textFraction,line,anchor:new THREE.Vector3(x,h,z)});
  });
  // One merged, vertex-coloured mesh per student, including articulated leg vertices.
  const students = [];
  const journey = [];
  let distance = 0, seconds = 0;
  STOPS.slice(1).forEach((stop,i) => {
    const from = STOPS[i].position, to = stop.position;
    const length = Math.abs(to[0]-from[0])+Math.abs(to[1]-from[1]);
    journey.push({start:seconds,end:seconds+length/1.35,from:distance,to:distance+length,stop});
    seconds += length/1.35;
    journey.push({start:seconds,end:seconds+1.5,from:distance+length,to:distance+length,stop});
    seconds += 1.5; distance += length;
  });
  if (interactive) ['#d35570','#5b98ca','#e8b646','#75a588'].forEach((shirt,index) => {
    const parts=[], legs=[];
    let count=0;
    function part(geometry,color,x,y,z,leg=0) {
      geometry=geometry.toNonIndexed(); geometry.translate(x,y,z);
      const colors=new Float32Array(geometry.attributes.position.count*3), c=new THREE.Color(color);
      for(let i=0;i<colors.length;i+=3){colors[i]=c.r;colors[i+1]=c.g;colors[i+2]=c.b;}
      geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
      if(leg) legs.push({start:count,end:count+geometry.attributes.position.count,sign:leg});
      count+=geometry.attributes.position.count;parts.push(geometry);
    }
    part(new THREE.CapsuleGeometry(.13,.26,3,6),shirt,0,.57,0);
    part(new THREE.SphereGeometry(.125,8,6),'#dca681',0,.91,0);
    part(new THREE.SphereGeometry(.139,8,6,0,Math.PI*2,0,Math.PI*.6),['#352a26','#49352b','#22232b','#68422c'][index],0,.94,-.015);
    part(new THREE.BoxGeometry(.22,.27,.12),'#353d58',0,.59,-.16);
    [-1,1].forEach(sign=>{
      part(new THREE.CapsuleGeometry(.045,.24,2,5),'#dca681',sign*.18,.55,0);
      part(new THREE.BoxGeometry(.085,.32,.09),'#333a52',sign*.07,.23,0,sign);
      part(new THREE.BoxGeometry(.10,.06,.17),'#faf5e8',sign*.07,.05,.035,sign);
    });
    const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());
    const figure=mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9}),0,0,0);
    figure.renderOrder=104; figure.material.depthTest=false;
    students.push({figure,legs,base:geometry.attributes.position.array.slice(),index});
  });
  let walkTime=0, lastWalkFrame=null, pausedStop=null;
  function animateStudents(time) {
    if(!interactive) return;
    if(lastWalkFrame!==null) walkTime+=Math.max(0,Math.min((time-lastWalkFrame)/1000,.1));
    lastWalkFrame=time;
    const elapsed=walkTime%seconds;
    const leg=journey.find(leg=>elapsed>=leg.start && elapsed<leg.end) || journey[0];
    pausedStop=leg.from===leg.to ? leg.stop.number : null;
    const fraction=(elapsed-leg.start)/(leg.end-leg.start);
    const progress=(leg.from+(leg.to-leg.from)*fraction)/distance;
    students.forEach(({figure,legs,base,index})=>{
      const t=Math.max(0,progress-index*.008), point=curve.getPoint(t), tangent=curve.getTangent(t);
      figure.position.copy(point);figure.position.y+=.10+(pausedStop?0:Math.sin(walkTime*9+index)*.035);
      figure.rotation.y=Math.atan2(tangent.x,tangent.z);
      const position=figure.geometry.attributes.position;
      legs.forEach(({start,end,sign})=>{
        const angle=pausedStop?0:Math.sin(walkTime*9+index)*.32*sign;
        for(let i=start;i<end;i++){
          const y=base[i*3+1]-.39,z=base[i*3+2];
          position.setXYZ(i,base[i*3],.39+y*Math.cos(angle)-z*Math.sin(angle),y*Math.sin(angle)+z*Math.cos(angle));
        }
      });position.needsUpdate=true;
    });
  }
  const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();
  let tapStart=null;
  function beginTap(event){tapStart={x:event.clientX,y:event.clientY};}
  function endTap(event){
    if(!tapStart || Math.hypot(event.clientX-tapStart.x,event.clientY-tapStart.y)>8)return;
    tapStart=null;
    const rect=renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObjects(pickTargets,false)[0];
    if(hit) window.dispatchEvent(new CustomEvent('map:stop',{detail:{n:hit.object.userData.stopNumber}}));
  }
  if(interactive){renderer.domElement.addEventListener('pointerdown',beginTap);renderer.domElement.addEventListener('pointerup',endTap);}
  const foliage=mat('#d6d3ce'), trunk=mat('#c9c6c0');
  for(let i=0;i<24;i++){const x=-9+(i%12)*1.65,z=i<12 ? -3.3 : 4.8;if(crosses.some(v=>Math.abs(x-v)<.6))continue;mesh(new THREE.CylinderGeometry(.06,.09,.5,6),trunk,x,.25,z);mesh(new THREE.IcosahedronGeometry(.34,1),foliage,x,.65,z);}
  // Transparent radial footprints give buildings soft contact shadows.
  const shadowCanvas=document.createElement('canvas'); shadowCanvas.width=shadowCanvas.height=64;
  const shadowCtx=shadowCanvas.getContext('2d'), gradient=shadowCtx.createRadialGradient(32,32,5,32,32,32); gradient.addColorStop(0,'#88888818'); gradient.addColorStop(1,'#88888800'); shadowCtx.fillStyle=gradient; shadowCtx.fillRect(0,0,64,64);
  const contactMaterial=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false});
  const buildings=district.children.filter(o=>o.geometry?.type==='BoxGeometry' && o.position.y>.1);
  buildings.forEach(o=>{const footprint=mesh(new THREE.PlaneGeometry(o.geometry.parameters.width+.5,o.geometry.parameters.depth+.5),contactMaterial,o.position.x,.025,o.position.z);footprint.rotation.x=-Math.PI/2;footprint.castShadow=false;});
  const narrowInteractive = interactive && (aspect < 1 || width < 600);
  const fittedTarget = new THREE.Vector3();
  if (narrowInteractive) {
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    // Align the route's principal axis with the portrait frame's vertical axis.
    const points = Array.from({length:250}, (_,i) => district.localToWorld(curve.getPoint(i/249)));
    const projected = points.map(p => p.clone().applyMatrix4(camera.matrixWorldInverse));
    const mean = projected.reduce((sum,p) => sum.add(p),new THREE.Vector3()).divideScalar(projected.length);
    let xx=0, xy=0, yy=0;
    projected.forEach(p => { const x=p.x-mean.x, y=p.y-mean.y; xx+=x*x; xy+=x*y; yy+=y*y; });
    const angle = .5*Math.atan2(2*xy,xx-yy);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
    camera.up.copy(right.multiplyScalar(Math.cos(angle)).add(up.multiplyScalar(Math.sin(angle))));
    camera.lookAt(fittedTarget);
    camera.updateMatrixWorld(true);
    // Fit the whole path and full pin silhouettes with 12% margin on each side.
    STOPS.forEach(stop => {
      for (const x of [-.65,.65]) for (const z of [-.65,.65]) for (const y of [0,stop.pinHeight+.65]) {
        points.push(district.localToWorld(new THREE.Vector3(stop.position[0]+x,y,stop.position[1]+z)));
      }
    });
    const bounds = new THREE.Box3().setFromPoints(points.map(p => p.clone().applyMatrix4(camera.matrixWorldInverse)));
    const center = bounds.getCenter(new THREE.Vector3());
    const offset = new THREE.Vector3(center.x,center.y,0).applyQuaternion(camera.quaternion);
    camera.position.add(offset); fittedTarget.add(offset);
    const size = bounds.getSize(new THREE.Vector3());
    camera.zoom = Math.min((camera.right-camera.left)/size.x,(camera.top-camera.bottom)/size.y)/1.24;
    camera.updateProjectionMatrix();
  }
  const controls = interactive ? new OrbitControls(camera, renderer.domElement) : null;
  if (controls) {
    controls.target.copy(fittedTarget);
    controls.enablePan = false; controls.enableDamping = false;
    controls.minPolarAngle = Math.PI / 5; controls.maxPolarAngle = Math.PI / 2.7;
    controls.minAzimuthAngle = Math.PI / 12; controls.maxAzimuthAngle = Math.PI * 5 / 12;
    controls.minZoom = narrowInteractive ? camera.zoom*.75 : .75; controls.maxZoom = narrowInteractive ? camera.zoom*2 : 2; controls.enableZoom = true;
    // Leave wheel scrolling to the itinerary; two-finger pinch still zooms.
    controls.mouseButtons.MIDDLE = null;
    controls.domElement.addEventListener('wheel', passWheel, { capture: true });
    controls.addEventListener('change', draw);
  }
  function passWheel(event) { event.stopImmediatePropagation(); }
  let disposed = false;
  function draw(time = 0, fitIteration = 0) {
    if (typeof time !== 'number') time = lastWalkFrame ?? 0;
    if (mapOnly) {
      const units = (camera.top-camera.bottom)/camera.zoom;
      const scale = units/20 * 2;
      pinParts.forEach(({object,origin,offset,scale: initial}) => {
        object.position.copy(origin).addScaledVector(offset,scale);
        object.scale.copy(initial).multiplyScalar(scale);
      });
      for (const [object, radius] of [[shoulder,.0195],[route,.015]]) {
        object.geometry.dispose();
        object.geometry = new THREE.TubeGeometry(curve,500,units*radius,16,false);
      }
      arrows.forEach(arrow => arrow.scale.setScalar(units/20));
    }
    if (disposed) return;
    animateStudents(time);
    arrows.forEach((arrow, i) => {
      const t = (i / arrows.length + (interactive ? time * .000025 : .025)) % 1;
      arrow.position.copy(curve.getPoint(t)); arrow.position.y += .73;
      const tangent = curve.getTangent(t);
      arrow.rotation.y = Math.atan2(tangent.x,tangent.z);
    });
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const viewWidth = (camera.right-camera.left)/camera.zoom;
    const viewHeight = (camera.top-camera.bottom)/camera.zoom;
    const occupied = [], projectedStops = [];
    const projectLocal = point => {
      const q = district.localToWorld(point.clone()).project(camera);
      return {x:(q.x+1)*width/2, y:(1-q.y)*height/2};
    };
    const routeSamples = Array.from({length:250}, (_,i) => projectLocal(curve.getPoint(i/249).add(new THREE.Vector3(0,.37,0))));
    const landmarks = STOPS.flatMap(stop => [0,.5,1,1.5,2].map(y => projectLocal(new THREE.Vector3(...[stop.position[0],y,stop.position[1]]))));
    // Project after the portrait rotation/fit (and on every controls/animation draw).
    // All interactive offsets and collision bounds below are in CSS pixels.
    const screenPins = callouts.map(({anchor}) => projectLocal(anchor));
    const firstPin = screenPins[1], secondPin = screenPins[2];
    const firstOnLeft = firstPin.x <= secondPin.x;
    callouts.forEach(({stop,sprite,ratio,textFraction,line,anchor}, index) => {
      const worldAnchor = district.localToWorld(anchor.clone());
      const projected = worldAnchor.clone().project(camera);
      const px = (projected.x+1)*width/2, py = (1-projected.y)*height/2;
      let h = interactive ? Math.min(height*.026/textFraction,(width-24)/ratio) : height*.03/textFraction;
      let w = h*ratio;
      const gap = Math.min(width,height)*.025;
      // Try nearby card edges; all candidates keep the leader within 12% of the frame.
      const candidates = [];
      if (interactive) {
        const margin = 8, leaderGap = 12;
        const forcedSide = stop.number === '1' ? (firstOnLeft ? -1 : 1)
          : stop.number === '2' ? (firstOnLeft ? 1 : -1) : null;
        const available = side => side === 1 ? width-margin-px-leaderGap : px-margin-leaderGap;
        const sides = forcedSide ? [forcedSide] : [1, -1];
        // Keep the entire card beside its pin, shrinking only when neither side fits.
        const room = Math.max(0, ...sides.map(available));
        if (w > room) { w = room; h = w/ratio; }
        const visible = px >= margin && px <= width-margin && py >= margin && py <= height-margin && room > 0;
        sprite.visible = line.visible = visible;
        for (const side of sides) {
          if (available(side) < w) continue;
          for (const dy of [0, -12, 12, -24, 24]) {
            const cx = px + side*(leaderGap+w/2);
            const cy = THREE.MathUtils.clamp(py+dy,h/2+margin,height-h/2-margin);
            const edgeX = px+side*leaderGap;
            const edgeY = THREE.MathUtils.clamp(py,cy-h/2,cy+h/2);
            const length = Math.hypot(edgeX-px,edgeY-py);
            if (length > 40) continue;
            const overlap = occupied.reduce((sum,r) => sum + Math.max(0,Math.min(cx+w/2,r.right)-Math.max(cx-w/2,r.left)+4)*Math.max(0,Math.min(cy+h/2,r.bottom)-Math.max(cy-h/2,r.top)+4),0);
            const pinOverlap = screenPins.reduce((sum,pin,i) => sum + (i !== index && Math.abs(cx-pin.x)<w/2+8 && Math.abs(cy-pin.y)<h/2+8 ? 1 : 0),0);
            candidates.push({cx,cy,edgeX,edgeY,length,score:overlap*10000+pinOverlap*width*height+Math.abs(cy-py)*2+(side === 1 ? 0 : 1)});
          }
        }
      }
      if (!interactive) for (const distance of [gap, gap*2, gap*3, gap*5, gap*7, gap*9]) {
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
            if (length > Math.min(width,height)*.48) continue;
            const overlap = occupied.reduce((sum,r) => sum + Math.max(0,Math.min(cx+w/2,r.right)-Math.max(cx-w/2,r.left)+8)*Math.max(0,Math.min(cy+h/2,r.bottom)-Math.max(cy-h/2,r.top)+8),0);
            const pinOverlap = callouts.reduce((sum,other) => {
              const q = district.localToWorld(other.anchor.clone()).project(camera);
              const x = (q.x+1)*width/2, y = (1-q.y)*height/2;
              return sum + (Math.abs(cx-x)<w/2+height*.018 && Math.abs(cy-y)<h/2+height*.018 ? 1 : 0);
            },0);
            const padding = height*.023;
            const hits = samples => samples.reduce((sum,q) => sum + (Math.abs(cx-q.x)<w/2+padding && Math.abs(cy-q.y)<h/2+padding ? 1 : 0),0);
            // Close neighbours 1 and 2 use opposite screen sides.
            const wrongSide = stop.number === '1' ? Math.max(0, cy-py+h) : stop.number === '2' ? Math.max(0,py-cy+h) : 0;
            candidates.push({cx,cy,edgeX,edgeY,length,score:overlap*10000+(pinOverlap+hits(landmarks)+hits(routeSamples))*width*height+wrongSide*width+length});
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
      // Keep interactive card edges fixed to their short leaders, including during pauses.
      const pulse = 1;
      sprite.scale.set(w/width*viewWidth*pulse,h/height*viewHeight*pulse,1);
      sprite.material.color.set(stop.number === pausedStop ? '#ffe0a0' : '#ffffff');
      sprite.layers.set(0);
      if (interactive && stop.number === pausedStop) sprite.layers.enable(1);
      const edge = new THREE.Vector3(edgeX/width*2-1,1-edgeY/height*2,projected.z).unproject(camera);
      line.geometry.setFromPoints([worldAnchor,edge]);
      projectedStops.push({number:stop.number,name:stop.name,pin:[px,py],label:[cx,cy],leaderFraction:length/Math.min(width,height)});
    });
    if (mapOnly) {
      // Fit the route, complete pin silhouettes and actual laid-out cards together.
      const padding = height*.035;
      const bounds = routeSamples.concat(projectedStops.map(stop => ({x:stop.pin[0],y:stop.pin[1]})));
      const left = Math.min(...bounds.map(p=>p.x-padding), ...occupied.map(r=>r.left));
      const right = Math.max(...bounds.map(p=>p.x+padding), ...occupied.map(r=>r.right));
      const top = Math.min(...bounds.map(p=>p.y-padding), ...occupied.map(r=>r.top));
      const bottom = Math.max(...bounds.map(p=>p.y+padding), ...occupied.map(r=>r.bottom));
      renderer.domElement.contentBounds = {left,right,top,bottom};
      const factor = .85 / Math.max((right-left)/width,(bottom-top)/height);
      if (fitIteration < 12 && (Math.abs(factor-1)>.005 || Math.abs((left+right)/2-width/2)>width*.005 || Math.abs((top+bottom)/2-height/2)>height*.005)) {
        const center = new THREE.Vector3((left+right)/width-1,1-(top+bottom)/height,0).unproject(camera);
        const origin = new THREE.Vector3(0,0,0).unproject(camera);
        camera.position.add(center.sub(origin));
        camera.zoom *= factor;
        camera.updateProjectionMatrix();
        return draw(time,fitIteration+1);
      }
    }
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
    renderer.domElement.removeEventListener('pointerdown',beginTap);
    renderer.domElement.removeEventListener('pointerup',endTap);
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
