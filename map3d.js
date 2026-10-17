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
  { id: 'drogheria', number: '1', name: 'DROGHERIA FINE', position: [-3.6, -4.9], pinHeight: 1.5, description: "l'épicerie italienne du quartier" },
  { id: 'fairmount', number: '2', name: 'FAIRMOUNT BAGEL', position: [-1, -4.9], pinHeight: 1.5, description: 'la célèbre boulangerie de bagels' },
  { id: 'olimpico', number: '3', name: 'CAFÉ OLIMPICO', position: [-5, 1], pinHeight: 1.7, description: 'le café célèbre depuis 1970' },
  { id: 'church', number: '4', name: 'ÉGLISE SAINT-MICHEL-ARCHANGE', position: [-7.1, 1.4], pinHeight: 3.6, description: 'la belle église du quartier' },
  { id: 'rialto', number: '5', name: 'THÉÂTRE RIALTO', position: [4.8, 5.3], pinHeight: 2.4, description: 'le vieux cinéma des années 1920,', extra: "point d'arrivée" }
];

export function mountMap3D(container, { interactive = true, width = container.clientWidth || 640, height = 440, pixelRatio = 1, preserveDrawingBuffer = false, mapOnly = false, posterMode = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer });
  renderer.setPixelRatio(interactive ? Math.min(pixelRatio, 2) : 1);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(width, height);
  renderer.setClearColor(posterMode ? '#ece9e4' : '#fafaf8');
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
    arrow.add(outline,core); arrow.scale.setScalar(interactive?2:2.7); district.add(arrow);
    return arrow;
  });
  const callouts = [];
  let labelOverlay = null, labelStyle = null, leaderSvg = null;
  const originalPosition = container.style.position;
  if (interactive) {
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    labelStyle = document.createElement('style');
    labelStyle.textContent = `
      .map3d-labels{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2}
      .map3d-labels svg{position:absolute;inset:0;width:100%;height:100%}
      .map3d-label{position:absolute;box-sizing:border-box;display:flex;align-items:center;gap:6px;padding:5px 8px;background:white;color:#1b2a4a;border:0;border-radius:18px;box-shadow:0 2px 8px #1b2a4a44;font:bold clamp(13px,3.6vw,18px)/1.05 "Bebas Neue",Impact,sans-serif;pointer-events:auto;transform-origin:center;transition:transform .2s,box-shadow .2s}
      .map3d-label span{overflow-wrap:anywhere;text-align:left}
      .map3d-label b{display:grid;place-items:center;flex-shrink:0;width:1.45em;height:1.45em;border-radius:50%;background:#e2761d;color:white}
      .map3d-label.active{transform:scale(1.12);box-shadow:0 0 14px 4px #ff8a26aa}
    `;
    if (posterMode) labelStyle.textContent += `
      .map3d-labels .map3d-label{font:bold 26px/1.05 "Bebas Neue",Impact,sans-serif;color:white;background:#1b2a4a;padding:6px 12px;box-shadow:0 3px 10px #0006;transition:none;border-radius:24px}
      .map3d-labels .map3d-label b{width:1.5em;height:1.5em}
      .map3d-labels .map3d-label span{min-width:0;overflow-wrap:normal}
    `;
    container.append(labelStyle);
    labelOverlay = document.createElement('div'); labelOverlay.className = 'map3d-labels';
    leaderSvg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    labelOverlay.append(leaderSvg); container.append(labelOverlay);
  }
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
    district.children.slice(firstPin).forEach(object => {
      pinParts.push({object, origin: new THREE.Vector3(x,h,z), offset: object.position.clone().sub(new THREE.Vector3(x,h,z)), scale: object.scale.clone()});
    });
    if (interactive && stop.id !== 'metro') district.children.slice(firstPin).forEach(object => { object.userData.stopNumber=Number(stop.number); pickTargets.push(object); });
    const cardData = interactive ? {} : card(stop.name, stop.id === 'metro' ? null : stop.number);
    let element, domLine, line;
    if (interactive) {
      element = document.createElement('button'); element.className = 'map3d-label';
      const badge = document.createElement('b'); badge.textContent = stop.number;
      const name = document.createElement('span'); name.textContent = stop.name;
      element.append(badge,name); labelOverlay.append(element);
      element.addEventListener('click', () => {
        if (stop.id !== 'metro') window.dispatchEvent(new CustomEvent('map:stop',{detail:{n:Number(stop.number)}}));
      });
      domLine = document.createElementNS('http://www.w3.org/2000/svg','line');
      domLine.setAttribute('stroke',posterMode ? '#1b2a4a' : '#e2761d'); domLine.setAttribute('stroke-width',posterMode ? '3' : '1.5'); leaderSvg.append(domLine);
    } else {
      line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:'#e2761d',depthTest:false,transparent:true,opacity:.8}));
      line.renderOrder=119; scene.add(line);
    }
    callouts.push({stop,...cardData,element,domLine,line,anchor:new THREE.Vector3(x,h,z)});
  });
  // One merged, vertex-coloured mesh per student, including articulated leg vertices.
  const students = [];
  const journey = [];
  let distance = 0, seconds = 0;
  const TOTAL_LEN = STOPS.slice(1).reduce((a,st,i)=>a+Math.abs(st.position[0]-STOPS[i].position[0])+Math.abs(st.position[1]-STOPS[i].position[1]),0);
  const SPEED = TOTAL_LEN/(15-1.5*(STOPS.length-1)); // loop ≈ 15 s incl. 1.5 s pauses
  STOPS.slice(1).forEach((stop,i) => {
    const from = STOPS[i].position, to = stop.position;
    const length = Math.abs(to[0]-from[0])+Math.abs(to[1]-from[1]);
    journey.push({start:seconds,end:seconds+length/SPEED,from:distance,to:distance+length,stop});
    seconds += length/SPEED;
    journey.push({start:seconds,end:seconds+1.5,from:distance+length,to:distance+length,stop});
    seconds += 1.5; distance += length;
  });
  if (interactive && !posterMode) ['#ff3d7f','#3dd6ff','#ffd23d','#8a5cff'].forEach((shirt,index) => {
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
    figure.scale.set(1.4,2.2,1.4);
    const outline = new THREE.Mesh(geometry.clone(),new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.BackSide,depthTest:false,depthWrite:false}));
    // Expand along vertex normals rather than scaling the whole body from its feet.
    const vertices = outline.geometry.attributes.position, normals = outline.geometry.attributes.normal;
    for (let i=0;i<vertices.count;i++) vertices.setXYZ(i,vertices.getX(i)+normals.getX(i)*.035,vertices.getY(i)+normals.getY(i)*.035,vertices.getZ(i)+normals.getZ(i)*.035);
    outline.renderOrder=104; figure.renderOrder=105; figure.add(outline);
    students.push({figure,outline,legs,base:geometry.attributes.position.array.slice(),outlineBase:vertices.array.slice(),index});
  });
  let walkTime=0, lastWalkFrame=null, pausedStop=null;
  function animateStudents(time) {
    if(!interactive || posterMode) return;
    if(lastWalkFrame!==null) walkTime+=Math.max(0,Math.min((time-lastWalkFrame)/1000,.1));
    lastWalkFrame=time;
    const elapsed=walkTime%seconds;
    const leg=journey.find(leg=>elapsed>=leg.start && elapsed<leg.end) || journey[0];
    pausedStop=leg.from===leg.to ? leg.stop.number : null;
    const fraction=(elapsed-leg.start)/(leg.end-leg.start);
    const progress=(leg.from+(leg.to-leg.from)*fraction)/distance;
    students.forEach(({figure,outline,legs,base,outlineBase,index})=>{
      const t=((progress-index*.6/distance)%1+1)%1, point=curve.getPoint(t), tangent=curve.getTangent(t);
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
      const hull=outline.geometry.attributes.position;
      legs.forEach(({start,end,sign})=>{
        const angle=pausedStop?0:Math.sin(walkTime*9+index)*.32*sign;
        for(let i=start;i<end;i++){
          const y=outlineBase[i*3+1]-.39,z=outlineBase[i*3+2];
          hull.setXYZ(i,outlineBase[i*3],.39+y*Math.cos(angle)-z*Math.sin(angle),y*Math.sin(angle)+z*Math.cos(angle));
        }
      }); hull.needsUpdate=true;
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
  }
  function fitCamera() {
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const samples = points.map(([x,z]) => district.localToWorld(new THREE.Vector3(x,.55,z)));
    STOPS.forEach(stop => {
      for (const dx of [-.65,.65]) for (const dy of [-.65,.65]) {
        samples.push(district.localToWorld(new THREE.Vector3(stop.position[0]+dx,stop.pinHeight+dy,stop.position[1])));
      }
    });
    samples.push(district.localToWorld(new THREE.Vector3(-7.1,3.1,1.4)));
    const bounds = new THREE.Box3().setFromPoints(samples.map(p=>p.applyMatrix4(camera.matrixWorldInverse)));
    const center=bounds.getCenter(new THREE.Vector3()), size=bounds.getSize(new THREE.Vector3());
    const offset=new THREE.Vector3(center.x,center.y,0).applyQuaternion(camera.quaternion);
    camera.position.add(offset); fittedTarget.add(offset);
    const portrait=width<height, padding=posterMode ? .075 : portrait ? .14 : .10;
    const roomX=Math.max(40,width*(1-2*padding)-(posterMode?0:portrait?120:60));
    camera.zoom=Math.min(roomX/width*(camera.right-camera.left)/size.x,(1-2*(posterMode ? .085 : portrait ? .12 : .10))*(camera.top-camera.bottom)/size.y);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  }
  fitCamera();
  const controls = interactive && !posterMode ? new OrbitControls(camera, renderer.domElement) : null;
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
    if (disposed) return;
    animateStudents(time);
    arrows.forEach((arrow, i) => {
      const t = (i / arrows.length + (interactive && !posterMode ? time * .000025 : .025)) % 1;
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
    // Lean heads along the camera's horizontal axis, with stems to the true stop.
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
    const localRight=right.clone().applyQuaternion(district.quaternion.clone().invert());
    localRight.y=0;
    // Preserve a horizontal screen displacement while keeping the lean on the ground axes.
    const screenRight=localRight.clone().applyQuaternion(district.quaternion);
    localRight.divideScalar(Math.max(.01,screenRight.dot(right)));
    callouts.forEach(({stop,anchor})=>{
      anchor.set(stop.position[0],stop.pinHeight,stop.position[1]);
      if(stop.number==='1' || stop.number==='2') anchor.addScaledVector(localRight,(stop.number==='1'?-1:1)*22/width*viewWidth);
    });
    pinParts.forEach(({object,origin,offset,scale})=>{
      const entry=callouts.find(c=>c.stop.position[0]===origin.x && c.stop.position[1]===origin.z);
      object.position.copy(entry.anchor).add(offset); object.scale.copy(scale);
    });
    callouts.forEach(entry=>{
      if (!entry.stem) {
        entry.stem=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#e2761d',depthTest:false}));
        entry.stem.renderOrder=110; district.add(entry.stem);
      }
      entry.stem.geometry.setFromPoints([new THREE.Vector3(entry.stop.position[0],.2,entry.stop.position[1]),entry.anchor]);
    });
    const screenPins=callouts.map(c=>projectLocal(c.anchor));
    const routeSamples=points.map(([x,z])=>projectLocal(new THREE.Vector3(x,.55,z)));
    callouts.forEach(({stop,sprite,ratio,line,anchor,element,domLine},index)=>{
      const {x:px,y:py}=screenPins[index];
      const worldAnchor=district.localToWorld(anchor.clone()), projected=worldAnchor.clone().project(camera);
      let w,h;
      const margin=interactive?8:height*.015, gap=interactive?10:height*.05;
      if(interactive){
        element.classList.toggle('active',stop.number===pausedStop);
        element.style.maxWidth=posterMode ? `${stop.id === 'church' ? Math.min(width*.46,width-2*margin) : width-2*margin}px` : `${Math.max(40,width-2*margin)/1.12}px`;
        w=element.offsetWidth; h=element.offsetHeight;
      } else { h=height*.065; w=h*ratio; if(w>width*.48){w=width*.48;h=w/ratio;} }
      // Reserve the active scale envelope, so pulsing pills also remain inside.
      const envelope=interactive&&!posterMode?1.12:1, ew=w*envelope, eh=h*envelope;
      const forced=stop.number==='1'?-1:stop.number==='2'?1:null;
      const side=forced ?? (px+gap+ew>width-margin?-1:1);
      const cx=THREE.MathUtils.clamp(px+side*(gap+ew/2),margin+ew/2,width-margin-ew/2);
      const candidates=[];
      for(let step=0;step<Math.ceil(height/(eh+6));step++){
        for(const sign of (step?[ -1,1 ]:[1])){
          const cy=THREE.MathUtils.clamp(py+sign*step*(eh+6),margin+eh/2,height-margin-eh/2);
          const overlap=occupied.reduce((sum,r)=>sum+Math.max(0,Math.min(cx+ew/2,r.right)-Math.max(cx-ew/2,r.left)+4)*Math.max(0,Math.min(cy+eh/2,r.bottom)-Math.max(cy-eh/2,r.top)+4),0);
          candidates.push({cy,score:overlap*10000+Math.abs(cy-py)});
        }
      }
      let cy=candidates.sort((a,b)=>a.score-b.score)[0].cy, labelX=cx;
      if (posterMode) {
        // Search both sides and every free boundary using the actual DOM dimensions.
        const pinRadius=.65/viewWidth*width+4;
        const obstacles=occupied.concat(screenPins.map(p=>({left:p.x-pinRadius,right:p.x+pinRadius,top:p.y-pinRadius,bottom:p.y+pinRadius})));
        const clampX=x=>THREE.MathUtils.clamp(x,margin+ew/2,width-margin-ew/2);
        const clampY=y=>THREE.MathUtils.clamp(y,margin+eh/2,height-margin-eh/2);
        const xs=[cx,clampX(px-gap-ew/2),clampX(px+gap+ew/2),margin+ew/2,width-margin-ew/2];
        const ys=[clampY(py),margin+eh/2,height-margin-eh/2];
        obstacles.forEach(r=>{xs.push(clampX(r.left-ew/2-6),clampX(r.right+ew/2+6));ys.push(clampY(r.top-eh/2-6),clampY(r.bottom+eh/2+6));});
        let best=Infinity;
        for(const x of xs) for(const y of ys){
          const overlap=obstacles.reduce((sum,r)=>sum+Math.max(0,Math.min(x+ew/2,r.right)-Math.max(x-ew/2,r.left)+4)*Math.max(0,Math.min(y+eh/2,r.bottom)-Math.max(y-eh/2,r.top)+4),0);
          const score=overlap*1e6+Math.hypot(x-px,y-py);
          if(score<best){best=score;labelX=x;cy=y;}
        }
      }
      const placedX=labelX;
      occupied.push({left:placedX-ew/2,right:placedX+ew/2,top:cy-eh/2,bottom:cy+eh/2});
      const edgeX=THREE.MathUtils.clamp(px,placedX-w/2,placedX+w/2),edgeY=THREE.MathUtils.clamp(py,cy-h/2,cy+h/2);
      if(interactive){
        element.style.left=`${placedX-w/2}px`; element.style.top=`${cy-h/2}px`;
        domLine.setAttribute('x1',px);domLine.setAttribute('y1',py);domLine.setAttribute('x2',edgeX);domLine.setAttribute('y2',edgeY);
      } else {
        sprite.position.set(placedX/width*2-1,1-cy/height*2,projected.z).unproject(camera);
        sprite.scale.set(w/width*viewWidth,h/height*viewHeight,1);
        line.geometry.setFromPoints([worldAnchor,new THREE.Vector3(edgeX/width*2-1,1-edgeY/height*2,projected.z).unproject(camera)]);
      }
      projectedStops.push({number:stop.number,name:stop.name,pin:[px,py],label:[placedX,cy],leaderFraction:Math.hypot(edgeX-px,edgeY-py)/Math.min(width,height)});
    });
    scene.updateMatrixWorld(true);
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
  const debug = () => {
    const rect=container.getBoundingClientRect();
    const project=point=>{const q=point.project(camera);return {x:(q.x+1)*width/2,y:(1-q.y)*height/2};};
    return {pins:callouts.map(c=>({n:c.stop.number,...project(district.localToWorld(c.anchor.clone()))})),
      labels:callouts.map(c=>{const r=c.element?.getBoundingClientRect();return {n:c.stop.number,left:r?.left-rect.left,top:r?.top-rect.top,right:r?.right-rect.left,bottom:r?.bottom-rect.top};}),
      container:{w:width,h:height},figuresOnScreen:students.map(({figure})=>project(figure.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.9,0)))).filter(p=>p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height)};
  };
  if(interactive) window.__map3dDebug=debug;
  const resizeObserver=interactive?new ResizeObserver(()=>{
    const w=container.clientWidth,h=container.clientHeight;
    if(!w||!h||(w===width&&h===height))return;
    width=w;height=h;
    camera.left=-span*(w/h)/2;camera.right=span*(w/h)/2;
    renderer.setSize(w,h);bloomComposer.setSize(w,h);composer.setSize(w,h);
    fitCamera(); if(controls){controls.target.copy(fittedTarget);controls.minZoom=camera.zoom*.75;controls.maxZoom=camera.zoom*2;}
    draw(lastWalkFrame??0);
  }):null;
  resizeObserver?.observe(container);
  render();
  if(interactive && !posterMode) renderer.setAnimationLoop(t=>draw(t));
  return { renderer, render, dispose() {
    disposed = true;
    renderer.setAnimationLoop(null); resizeObserver?.disconnect(); labelOverlay?.remove(); labelStyle?.remove();
    if(interactive){container.style.position=originalPosition;if(window.__map3dDebug===debug)delete window.__map3dDebug;}
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
