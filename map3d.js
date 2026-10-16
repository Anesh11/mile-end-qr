import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js';

export function mountMap3D(container, { interactive = true, width = container.clientWidth || 640, height = 440, pixelRatio = 1, preserveDrawingBuffer = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer });
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height);
  renderer.setClearColor('#fdf3e3');
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', 'Circuit schématique du Mile End : station Laurier, Fairmount Bagel, Drogheria Fine, Café Olimpico, église Saint-Michel-Archange et Théâtre Rialto.');
  container.append(renderer.domElement);
  const scene = new THREE.Scene();
  const aspect = width / height, span = aspect < 1 ? 19 / aspect : 23;
  const camera = new THREE.OrthographicCamera(-span * aspect / 2, span * aspect / 2, span / 2, -span / 2, .1, 150);
  camera.position.set(25, 25, 25); camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xfff5df, 0x877568, 2.8));
  const sunlight = new THREE.DirectionalLight(0xffffff, 3); sunlight.position.set(-10, 24, 12); scene.add(sunlight);
  const district = new THREE.Group(); district.rotation.y = -35 * Math.PI / 180; scene.add(district);
  const mat = color => new THREE.MeshStandardMaterial({ color, roughness: .85 });
  const cream = mat('#fdf3e3'), road = mat('#dedbd5'), orange = mat('#e2761d'), stone = mat('#dcc9a7'), dome = mat('#819d94');
  function mesh(geometry, material, x, y, z) {
    const object = new THREE.Mesh(geometry, material); object.position.set(x, y, z); district.add(object); return object;
  }
  function box(w, h, d, material, x, y, z) { return mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z); }
  box(22, .12, 17, cream, 0, -.1, 0);
  const avenues = [-4, 0, 4], crosses = [-8, -5, -2, 1, 4, 7];
  avenues.forEach(z => box(21, .035, .72, road, 0, 0, z));
  crosses.forEach(x => box(.65, .035, 15, road, x, 0, 0));
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
  ['FAIRMOUNT', 'SAINT-VIATEUR', 'BERNARD'].forEach((name, i) => label(name, -9, .18, avenues[i], .3));
  ['SAINT-URBAIN', 'WAVERLY', 'ESPLANADE', 'JEANNE-MANCE', 'AV. DU PARC', 'CLARK'].forEach((name, i) => label(name, crosses[i], .16, -6.8, .23));
  let seed = 1970;
  function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  const bricks = ['#bc806c', '#d1b391', '#ead5b7', '#c49b7d', '#b96d59'].map(mat);
  for (let x = -9.7; x < 10; x += .9) {
    for (let z = -6; z < 6.5; z += 1.05) {
      if (crosses.some(v => Math.abs(x - v) < .8) || avenues.some(v => Math.abs(z - v) < .85)) continue;
      // Reserve space for the church and the theatre.
      if ((Math.abs(x + 8) < 1.8 && Math.abs(z - 1.4) < 1.6) || (Math.abs(x - 4) < 1.6 && Math.abs(z - 5.4) < 1.3)) continue;
      const h = .3 + random() * 1.1;
      box(.65, h, .72, bricks[Math.floor(random() * bricks.length)], x, h / 2, z);
    }
  }
  // Byzantine church: drum, hemisphere and twin towers.
  box(2.1, 1, 1.6, stone, -7.1, .5, 1.4);
  mesh(new THREE.CylinderGeometry(.8, .8, .6, 24), stone, -7.1, 1.3, 1.4);
  mesh(new THREE.SphereGeometry(.83, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), dome, -7.1, 1.6, 1.4);
  [-8, -6.2].forEach(x => {
    box(.4, 1.8, .4, stone, x, .9, .7);
    mesh(new THREE.ConeGeometry(.32, .5, 8), dome, x, 2.05, .7);
  });
  box(1.8, 1.7, 1.2, stone, 4.8, .85, 5.3);
  box(2, .24, .65, orange, 4.8, .95, 4.55);
  label('RIALTO', 4.8, 1.35, 4.5, .37, '#f0625a', true);
  const points = [[7,-6],[7,-4],[-1,-4],[-2,-4],[-5,-4],[-5,0],[-8,0],[4,0],[4,4]];
  const curve = new THREE.CatmullRomCurve3(points.map(([x,z]) => new THREE.Vector3(x,.18,z)), false, 'catmullrom', .02);
  const purple = new THREE.MeshStandardMaterial({ color: '#4a1fe0', emissive: '#4a1fe0', emissiveIntensity: 1.6 });
  mesh(new THREE.TubeGeometry(curve, 300, .075, 8, false), purple, 0, 0, 0);
  mesh(new THREE.TubeGeometry(curve, 300, .19, 8, false), new THREE.MeshBasicMaterial({ color: '#4a1fe0', transparent: true, opacity: .17, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0, 0);
  const pulse = mesh(new THREE.SphereGeometry(.15, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff1ff' }), 0, 0, 0);
  const stops = [
    [-1,-4,'1','FAIRMOUNT BAGEL',2.9], [-2,-4,'2','DROGHERIA FINE',1.8],
    [-5,0,'3','CAFÉ OLIMPICO',2.5], [-8,0,'4','ÉGLISE SAINT-MICHEL-ARCHANGE',3.5],
    [4,4,'5','THÉÂTRE RIALTO',2.9]
  ];
  stops.forEach(([x,z,n,name,h]) => {
    const pin = mesh(new THREE.ConeGeometry(.22, .9, 12), orange, x, h - .6, z); pin.rotation.z = Math.PI;
    mesh(new THREE.SphereGeometry(.32, 16, 12), orange, x, h, z);
    label(n, x, h + .02, z, .43, '#ffffff');
    label(`${n} ${name}`, x, h + .65, z, .44, '#1b2a4a', true);
  });
  mesh(new THREE.CylinderGeometry(.4,.4,.15,24), orange, 7,.18,-6);
  label('M',7,1,-6,.65,'#e2761d',true);
  label('POINT DE DÉPART — Station Laurier (ligne orange)',5,1.9,-6,.43,'#1b2a4a',true);
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
    renderer.render(scene, camera);
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
    renderer.dispose(); renderer.domElement.remove();
  } };
}
