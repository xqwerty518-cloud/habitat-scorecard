// ---- 디지털 트윈 (three.js) ----
let twin = null; // { renderer, scene, camera, trees:[], props:[], markers:[], groundMesh, waterMesh, angle }
let twinRafId = null;
const TWIN_TREE_POOL = 26;
const TWIN_PROP_POOL = 4;

function twinLerpHex(hexA, hexB, t){
  const a = new THREE.Color(hexA), b = new THREE.Color(hexB);
  return a.lerp(b, Math.max(0, Math.min(1, t))).getHex();
}
function twinGroundHeight(x, z, amt){
  return (Math.sin(x*0.45) * Math.cos(z*0.4) * 0.55 + Math.sin(x*0.9+z*0.3)*0.2) * amt;
}
// 결정론적 의사난수(위치가 매 프레임 흔들리지 않도록 고정 시드 사용)
function twinSeeded(i){
  const x = Math.sin(i*12.9898)*43758.5453;
  return x - Math.floor(x);
}

// ---- 종별 저해상도 실루엣 생성 (구체 마커 대신 실제 개체 형태를 은유) ----
function twinMat(color, opacity){
  return new THREE.MeshStandardMaterial({ color, flatShading:false, transparent:true, opacity: opacity===undefined?1:opacity, roughness:0.65, depthWrite:false });
}
function twinMesh(geo, color, sx,sy,sz){
  const m = new THREE.Mesh(geo, twinMat(color));
  if(sx!==undefined) m.scale.set(sx, sy===undefined?sx:sy, sz===undefined?sx:sz);
  return m;
}
function twinPlace(mesh, x,y,z, rx,ry,rz){
  mesh.position.set(x,y,z);
  if(rx!==undefined) mesh.rotation.set(rx, ry||0, rz||0);
  return mesh;
}

function buildCreature(id){
  const g = new THREE.Group();
  const bodies = [];
  function put(mesh, x,y,z, rx,ry,rz){ twinPlace(mesh,x,y,z,rx,ry,rz); g.add(mesh); bodies.push(mesh); return mesh; }
  // 원뿔/원기둥처럼 로컬 +Y축을 따라 긴 형태의 메쉬를, 실제로 보이길 원하는 방향(dx,dy,dz)으로
  // 정확히 정렬한다. z축 회전각을 손으로 추정하다 보면 부호를 반대로 잡기 쉬워서(꼬리가 몸 쪽으로
  // 가늘어지는 등) 방향벡터 기반으로 바꿨다.
  function putDir(mesh, x,y,z, dx,dy,dz){
    mesh.position.set(x,y,z);
    const dir = new THREE.Vector3(dx,dy,dz).normalize();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir);
    g.add(mesh);
    bodies.push(mesh);
    return mesh;
  }

  switch(id){
    case 'otter': {
      put(twinMesh(new THREE.SphereGeometry(0.16,10,8), 0x7A5A3A, 2.1,0.85,0.85), 0,0.16,0);
      put(twinMesh(new THREE.SphereGeometry(0.1,10,8), 0x7A5A3A), 0.28,0.17,0);
      putDir(twinMesh(new THREE.ConeGeometry(0.07,0.36,8), 0x4A3423), -0.3,0.17,0, -1,0.25,0);
      break;
    }
    case 'goral': {
      put(twinMesh(new THREE.BoxGeometry(0.32,0.16,0.15), 0x746A5C), 0,0.24,0);
      [[0.11,0.06],[0.11,-0.06],[-0.11,0.06],[-0.11,-0.06]].forEach(([x,z])=>{
        put(twinMesh(new THREE.CylinderGeometry(0.02,0.02,0.22,5), 0x5C5346), x,0.11,z);
      });
      put(twinMesh(new THREE.SphereGeometry(0.08,6,6), 0x746A5C), 0.19,0.3,0);
      putDir(twinMesh(new THREE.ConeGeometry(0.016,0.13,5), 0x2A2620), 0.21,0.36,0.035, -0.35,1,0.08);
      putDir(twinMesh(new THREE.ConeGeometry(0.016,0.13,5), 0x2A2620), 0.21,0.36,-0.035, -0.35,1,-0.08);
      break;
    }
    case 'bear': {
      put(twinMesh(new THREE.SphereGeometry(0.2,10,8), 0x1E1B18, 1.4,1.05,1.0), 0,0.24,0);
      const head = put(twinMesh(new THREE.SphereGeometry(0.11,10,8), 0x1E1B18), 0.28,0.29,0);
      put(twinMesh(new THREE.SphereGeometry(0.035,6,6), 0x1E1B18), 0.3,0.38,0.08);
      put(twinMesh(new THREE.SphereGeometry(0.035,6,6), 0x1E1B18), 0.3,0.38,-0.08);
      const patch = put(twinMesh(new THREE.PlaneGeometry(0.16,0.11), 0xE8E4D8), 0.19,0.2,0, 0,Math.PI/2,0);
      patch.material.side = THREE.DoubleSide;
      break;
    }
    case 'crane': {
      put(twinMesh(new THREE.SphereGeometry(0.13,10,8), 0xF2F0E6, 1.15,1.3,1), 0,0.42,0);
      put(twinMesh(new THREE.CylinderGeometry(0.012,0.012,0.42,5), 0x2A2620), 0.07,0.21,0.07);
      put(twinMesh(new THREE.CylinderGeometry(0.012,0.012,0.42,5), 0x2A2620), -0.07,0.21,-0.07);
      putDir(twinMesh(new THREE.CylinderGeometry(0.02,0.022,0.38,8), 0xF2F0E6), 0.17,0.64,0, 0.55,1,0);
      put(twinMesh(new THREE.SphereGeometry(0.045,6,6), 0xF2F0E6), 0.32,0.82,0);
      put(twinMesh(new THREE.SphereGeometry(0.018,5,5), 0xB23B2E), 0.33,0.87,0);
      putDir(twinMesh(new THREE.ConeGeometry(0.014,0.09,5), 0x2A2620), 0.4,0.81,0, 1,0,0);
      break;
    }
    case 'cat': {
      put(twinMesh(new THREE.SphereGeometry(0.13,10,8), 0xB68A4E, 1.7,0.8,0.8), 0,0.15,0);
      put(twinMesh(new THREE.SphereGeometry(0.075,6,6), 0xB68A4E), 0.2,0.19,0);
      put(twinMesh(new THREE.ConeGeometry(0.022,0.05,4), 0x4A3423), 0.24,0.26,0.04);
      put(twinMesh(new THREE.ConeGeometry(0.022,0.05,4), 0x4A3423), 0.24,0.26,-0.04);
      putDir(twinMesh(new THREE.ConeGeometry(0.03,0.32,8), 0xB68A4E), -0.24,0.21,0, -1,0.45,0);
      break;
    }
    case 'squirrel': {
      put(twinMesh(new THREE.SphereGeometry(0.09,10,8), 0x8C7A5E), 0,0.12,0);
      put(twinMesh(new THREE.SphereGeometry(0.055,6,6), 0x8C7A5E), 0.11,0.14,0);
      put(twinMesh(new THREE.SphereGeometry(0.012,5,5), 0x1C1C1A), 0.15,0.16,0.03);
      put(twinMesh(new THREE.SphereGeometry(0.012,5,5), 0x1C1C1A), 0.15,0.16,-0.03);
      const wingR = put(twinMesh(new THREE.BoxGeometry(0.22,0.01,0.11), 0x8C7A5E, 1,1,1), 0.02,0.1,0.13, 0,0,-0.15);
      wingR.material.opacity = 0.85;
      const wingL = put(twinMesh(new THREE.BoxGeometry(0.22,0.01,0.11), 0x8C7A5E, 1,1,1), 0.02,0.1,-0.13, 0,0,0.15);
      wingL.material.opacity = 0.85;
      putDir(twinMesh(new THREE.ConeGeometry(0.05,0.22,8), 0x8C7A5E), -0.17,0.15,0, -1,0.3,0);
      break;
    }
    case 'spoonbill': {
      put(twinMesh(new THREE.SphereGeometry(0.12,10,8), 0xF2F0E6, 1.15,1,1), 0,0.38,0);
      put(twinMesh(new THREE.CylinderGeometry(0.012,0.012,0.38,5), 0xB23B2E), 0.06,0.19,0.06);
      put(twinMesh(new THREE.CylinderGeometry(0.012,0.012,0.38,5), 0xB23B2E), -0.06,0.19,-0.06);
      putDir(twinMesh(new THREE.CylinderGeometry(0.018,0.02,0.32,8), 0xF2F0E6), 0.15,0.6,0, 0.5,1,0);
      put(twinMesh(new THREE.SphereGeometry(0.04,6,6), 0xF2F0E6), 0.28,0.76,0);
      put(twinMesh(new THREE.BoxGeometry(0.16,0.018,0.06), 0x2A2620), 0.42,0.75,0);
      break;
    }
    case 'marten': {
      put(twinMesh(new THREE.SphereGeometry(0.12,10,8), 0x4A3626, 2.0,0.72,0.72), 0,0.14,0);
      put(twinMesh(new THREE.SphereGeometry(0.065,6,6), 0x4A3626), 0.24,0.15,0);
      const throat = put(twinMesh(new THREE.PlaneGeometry(0.1,0.08), 0xE8B23A), 0.16,0.09,0, Math.PI/2,0,0);
      throat.material.side = THREE.DoubleSide;
      putDir(twinMesh(new THREE.ConeGeometry(0.06,0.34,8), 0x4A3626), -0.3,0.15,0, -1,0.15,0);
      break;
    }
    case 'fox': {
      put(twinMesh(new THREE.SphereGeometry(0.13,10,8), 0xB5552E, 1.9,0.85,0.8), 0,0.19,0);
      put(twinMesh(new THREE.SphereGeometry(0.08,10,8), 0xB5552E), 0.22,0.23,0);
      putDir(twinMesh(new THREE.ConeGeometry(0.04,0.13,6), 0xB5552E), 0.32,0.2,0, 1,0,0);
      putDir(twinMesh(new THREE.ConeGeometry(0.03,0.09,4), 0x2A2620), 0.26,0.32,0.05, 0.2,1,0.3);
      putDir(twinMesh(new THREE.ConeGeometry(0.03,0.09,4), 0x2A2620), 0.26,0.32,-0.05, 0.2,1,-0.3);
      putDir(twinMesh(new THREE.ConeGeometry(0.06,0.34,8), 0xB5552E), -0.28,0.22,0, -1,0.35,0);
      put(twinMesh(new THREE.SphereGeometry(0.032,6,6), 0xF2F0E6), -0.46,0.28,0);
      break;
    }
    case 'stork': {
      put(twinMesh(new THREE.SphereGeometry(0.13,10,8), 0xF2F0E6, 1.2,1.25,1), 0,0.42,0);
      put(twinMesh(new THREE.CylinderGeometry(0.013,0.013,0.4,8), 0xB23B2E), 0.07,0.21,0.07);
      put(twinMesh(new THREE.CylinderGeometry(0.013,0.013,0.4,8), 0xB23B2E), -0.07,0.21,-0.07);
      putDir(twinMesh(new THREE.CylinderGeometry(0.02,0.022,0.34,8), 0xF2F0E6), 0.16,0.62,0, 0.45,1,0);
      put(twinMesh(new THREE.SphereGeometry(0.042,8,6), 0xF2F0E6), 0.3,0.78,0);
      putDir(twinMesh(new THREE.ConeGeometry(0.02,0.14,5), 0x1C1C1A), 0.3,0.78,0, 1,0,0);
      put(twinMesh(new THREE.SphereGeometry(0.05,8,6), 0x2A2620, 1,0.3,0.9), 0,0.4,0.13);
      put(twinMesh(new THREE.SphereGeometry(0.05,8,6), 0x2A2620, 1,0.3,0.9), 0,0.4,-0.13);
      break;
    }
    case 'owl': {
      put(twinMesh(new THREE.SphereGeometry(0.16,10,8), 0x8C6A3E, 1.1,1.3,1.05), 0,0.24,0);
      put(twinMesh(new THREE.SphereGeometry(0.115,10,8), 0x8C6A3E), 0,0.46,0);
      put(twinMesh(new THREE.SphereGeometry(0.022,6,6), 0xE8B23A), 0.075,0.48,0.07);
      put(twinMesh(new THREE.SphereGeometry(0.022,6,6), 0xE8B23A), 0.075,0.48,-0.07);
      put(twinMesh(new THREE.SphereGeometry(0.008,5,5), 0x1C1C1A), 0.09,0.48,0.07);
      put(twinMesh(new THREE.SphereGeometry(0.008,5,5), 0x1C1C1A), 0.09,0.48,-0.07);
      putDir(twinMesh(new THREE.ConeGeometry(0.035,0.09,5), 0x8C6A3E), 0.01,0.58,0.045, 0.1,1,0.4);
      putDir(twinMesh(new THREE.ConeGeometry(0.035,0.09,5), 0x8C6A3E), 0.01,0.58,-0.045, 0.1,1,-0.4);
      putDir(twinMesh(new THREE.ConeGeometry(0.02,0.05,5), 0x2A2620), 0.11,0.43,0, 1,-0.4,0);
      break;
    }
    case 'falcon': {
      put(twinMesh(new THREE.SphereGeometry(0.1,10,8), 0xE8E4D8, 1.3,1.5,0.95), 0,0.28,0);
      put(twinMesh(new THREE.SphereGeometry(0.075,10,8), 0x2A3038), 0,0.46,0);
      putDir(twinMesh(new THREE.ConeGeometry(0.022,0.06,5), 0x1C1C1A), 0.07,0.45,0, 1,-0.25,0);
      putDir(twinMesh(new THREE.ConeGeometry(0.045,0.32,5), 0x3A4048), -0.02,0.24,0.08, -0.4,-0.1,1);
      putDir(twinMesh(new THREE.ConeGeometry(0.045,0.32,5), 0x3A4048), -0.02,0.24,-0.08, -0.4,-0.1,-1);
      break;
    }
    case 'pondturtle': {
      put(twinMesh(new THREE.SphereGeometry(0.13,10,8), 0x3E4A2E, 1.2,0.65,1.05), 0,0.1,0);
      put(twinMesh(new THREE.SphereGeometry(0.045,8,6), 0x5C6B3E), 0.17,0.04,0);
      put(twinMesh(new THREE.SphereGeometry(0.01,5,5), 0xE8D06A), 0.2,0.05,0.025);
      [[0.1,0.09],[0.1,-0.09],[-0.1,0.09],[-0.1,-0.09]].forEach(([x,z])=>{
        put(twinMesh(new THREE.CylinderGeometry(0.02,0.02,0.06,6), 0x5C6B3E), x,-0.02,z);
      });
      break;
    }
    case 'porpoise': {
      put(twinMesh(new THREE.SphereGeometry(0.14,10,8), 0x6E7472, 2.1,0.85,0.9), 0,0,0);
      put(twinMesh(new THREE.SphereGeometry(0.1,10,8), 0x6E7472, 0.9,0.85,0.85), 0.26,0,0);
      break;
    }
    case 'turtle': {
      put(twinMesh(new THREE.SphereGeometry(0.16,10,8), 0x8B4A2E, 1.25,0.55,1.05), 0,0.06,0);
      put(twinMesh(new THREE.SphereGeometry(0.055,6,6), 0x6E5A3E), 0.2,0,0);
      [[0.13,0.13],[0.13,-0.13],[-0.13,0.13],[-0.13,-0.13]].forEach(([x,z])=>{
        put(twinMesh(new THREE.BoxGeometry(0.13,0.02,0.07), 0x6E5A3E), x,-0.03,z, 0,Math.atan2(z,x),0);
      });
      break;
    }
    case 'dolphin': {
      put(twinMesh(new THREE.SphereGeometry(0.15,10,8), 0x757E82, 2.3,0.9,0.9), 0,0,0);
      put(twinMesh(new THREE.ConeGeometry(0.05,0.17,8), 0x757E82), 0.36,-0.02,0, 0,0,-Math.PI/2);
      put(twinMesh(new THREE.ConeGeometry(0.07,0.16,6), 0x5C6266), 0,0.14,0, 0,0,0, );
      break;
    }
    case 'seal': {
      const body = put(twinMesh(new THREE.SphereGeometry(0.15,10,8), 0x9C9686, 2.0,0.82,0.85), 0,0,0);
      put(twinMesh(new THREE.SphereGeometry(0.09,10,8), 0x9C9686, 0.9,0.85,0.85), 0.27,0,0);
      [[0.08,0.05,0.09],[-0.05,0.06,-0.09],[0.15,-0.02,0.1],[-0.15,0.02,-0.08],[0.0,0.07,0.0]].forEach(([x,y,z])=>{
        put(twinMesh(new THREE.SphereGeometry(0.022,5,5), 0x4A4438), x,y,z);
      });
      break;
    }
    default: {
      put(twinMesh(new THREE.IcosahedronGeometry(0.22,0), 0x5F7A5A), 0,0.2,0);
    }
  }

  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(0.4, 24),
    new THREE.MeshBasicMaterial({ color:0x5F7A5A, transparent:true, opacity:0.5, side: THREE.DoubleSide, depthWrite:false })
  );
  halo.rotateX(-Math.PI/2);

  return { group:g, bodies, halo, phase: Math.random()*Math.PI*2 };
}

function initTwin(){
  if(twin || typeof THREE === 'undefined') return;
  const canvas = document.getElementById('twin-canvas');
  const holder = document.getElementById('twin-canvas-holder') || canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  if(THREE.PCFSoftShadowMap) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if(THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
  if(THREE.ACESFilmicToneMapping !== undefined) renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 5.5, 10);

  const ambient = new THREE.AmbientLight(0xffffff, 0.28);
  const hemi = new THREE.HemisphereLight(0xBFD9E8, 0x5F7A5A, 0.55);
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(6, 10, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left = -12; sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 30;
  sun.shadow.bias = -0.0015;
  scene.add(ambient, hemi, sun);

  const groundGeo = new THREE.PlaneGeometry(20, 20, 24, 24);
  groundGeo.rotateX(-Math.PI/2);
  const groundMat = new THREE.MeshStandardMaterial({ color:0x5F7A5A, roughness:0.95, flatShading:true });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  const waterGeo = new THREE.CircleGeometry(1, 40);
  waterGeo.rotateX(-Math.PI/2);
  const waterMat = new THREE.MeshStandardMaterial({ color:0x5C88A0, roughness:0.12, metalness:0.15, transparent:true, opacity:0.85, depthWrite:false });
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.y = 0.03;
  scene.add(waterMesh);

  const trees = [];
  for(let i=0;i<TWIN_TREE_POOL;i++){
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.07,0.4,6), new THREE.MeshStandardMaterial({ color:0x6B5A3E, flatShading:true }));
    trunk.castShadow = true;
    trunk.position.y = 0.2;
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.32,0.7,7), new THREE.MeshStandardMaterial({ color:0x3E5A3E, flatShading:true }));
    canopy.castShadow = true;
    canopy.position.y = 0.65;
    g.add(trunk, canopy);
    const rx = (twinSeeded(i*3+1)-0.5) * 16;
    const rz = (twinSeeded(i*3+2)-0.5) * 16;
    g.userData = { rx, rz, canopy, hueJitter: (twinSeeded(i*7+3)-0.5) };
    scene.add(g);
    trees.push(g);
  }

  const props = [];
  for(let i=0;i<TWIN_PROP_POOL;i++){
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.4,0.5), new THREE.MeshStandardMaterial({ color:0x8B8672, flatShading:true }));
    box.castShadow = true;
    const angle = (i/TWIN_PROP_POOL) * Math.PI*2 + 0.4;
    const rx = Math.cos(angle) * 8.5, rz = Math.sin(angle) * 8.5;
    box.position.set(rx, 0.2, rz);
    box.userData = { rx, rz };
    box.visible = false;
    scene.add(box);
    props.push(box);
  }

  const creatures = {};
  [...LAND_SPECIES, ...MARINE_SPECIES].forEach(sp=>{
    const c = buildCreature(sp.id);
    c.group.visible = false;
    c.halo.visible = false;
    c.group.userData = { targetY:0, targetScale:1, baseX:0, baseZ:0 };
    c.bodies.forEach(m=>{ m.userData.speciesId = sp.id; m.castShadow = true; });
    scene.add(c.group, c.halo);
    creatures[sp.id] = c;
  });

  twin = { renderer, scene, camera, groundMesh, waterMesh, trees, props, creatures, angle:0, clock:0 };
  resizeTwin();
  document.getElementById('twin-loading').style.display = 'none';
  canvas.addEventListener('click', onTwinCanvasClick);
}

function resizeTwin(){
  if(!twin) return;
  const holder = document.getElementById('twin-canvas').parentElement;
  const w = holder.clientWidth, h = holder.clientHeight;
  if(w===0||h===0) return;
  twin.renderer.setSize(w, h, false);
  twin.camera.aspect = w/h;
  twin.camera.updateProjectionMatrix();
}

// ---- 개체 클릭 식별 ----
function onTwinCanvasClick(e){
  if(!twin) return;
  const canvas = e.target;
  const rect = canvas.getBoundingClientRect();
  if(rect.width===0 || rect.height===0) return;
  const mouse = new THREE.Vector2(
    ((e.clientX-rect.left)/rect.width)*2 - 1,
    -((e.clientY-rect.top)/rect.height)*2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, twin.camera);
  const meshes = [];
  Object.values(twin.creatures).forEach(c=>{
    if(c.group.visible) meshes.push(...c.bodies);
  });
  const hits = raycaster.intersectObjects(meshes, false);
  if(hits.length){
    showTwinInfo(hits[0].object.userData.speciesId);
  } else {
    hideTwinInfo();
  }
}

function showTwinInfo(id){
  const sp = [...LAND_SPECIES, ...MARINE_SPECIES].find(s=>s.id===id);
  if(!sp) return;
  const r = scoreSpecies(sp, readInputs());
  const v = verdict(r.total);
  document.getElementById('twin-info-badge').textContent = sp.name.slice(0,1);
  document.getElementById('twin-info-name').textContent = sp.name;
  document.getElementById('twin-info-latin').textContent = sp.latin;
  document.getElementById('twin-info-status').textContent = sp.status || '';
  document.getElementById('twin-info-num').textContent = r.total;
  document.getElementById('twin-info-num').style.color = barColor(r.total);
  document.getElementById('twin-info-verdict').textContent = v.text;
  document.getElementById('twin-info').style.display = 'flex';
}
function hideTwinInfo(){
  const el = document.getElementById('twin-info');
  if(el) el.style.display = 'none';
}
window.addEventListener('resize', ()=>{ if(currentMode==='twin') resizeTwin(); });

function updateTwin(inputs){
  if(!twin) return;
  const isLand = currentHabitat === 'land';

  // 하늘·안개
  let skyColor, fogColor, fogDensity;
  if(isLand){
    const t = Math.max(0, Math.min(1, (inputs.temp+10)/45));
    skyColor = twinLerpHex(0x8FB6D9, 0xE9C08A, t);
    fogColor = skyColor;
    fogDensity = 0.008 + (inputs.hum/100)*0.05;
  } else {
    const t = Math.max(0, Math.min(1, (inputs.wtemp+2)/32));
    skyColor = twinLerpHex(0x1E3A4C, 0x4E93A6, t);
    fogColor = twinLerpHex(0x2C4A55, 0x8FB2AE, inputs.turb/10);
    fogDensity = 0.02 + (inputs.turb/10)*0.09;
  }
  twin.scene.background = new THREE.Color(skyColor);
  twin.scene.fog = new THREE.FogExp2(fogColor, fogDensity);

  // 지형
  const elevAmt = isLand ? (inputs.elev/10)*2.2 : 0.15;
  const posAttr = twin.groundMesh.geometry.attributes.position;
  for(let i=0;i<posAttr.count;i++){
    const x = posAttr.getX(i), z = posAttr.getZ(i);
    posAttr.setY(i, twinGroundHeight(x, z, elevAmt));
  }
  posAttr.needsUpdate = true;
  twin.groundMesh.geometry.computeVertexNormals();

  if(isLand){
    const vegT = inputs.veg/10;
    let gCol = twinLerpHex(0xC9BE93, 0x3E5A3E, vegT);
    gCol = twinLerpHex(gCol, 0x8B8672, (inputs.elev/10)*0.55);
    twin.groundMesh.material.color.setHex(gCol);
  } else {
    const gCol = twinLerpHex(0xC9BE93, 0x5A6B5E, 1 - inputs.turb/10);
    twin.groundMesh.material.color.setHex(gCol);
  }

  // 물
  if(isLand){
    const r = inputs.water/10;
    twin.waterMesh.visible = r > 0.03;
    twin.waterMesh.scale.setScalar(0.4 + r*3.4);
    twin.waterMesh.material.color.setHex(0x5C88A0);
    twin.waterMesh.material.opacity = 0.85;
    twin.waterMesh.position.y = twin.waterMesh.userData.baseY = twinGroundHeight(0,0,elevAmt) + 0.04;
  } else {
    twin.waterMesh.visible = true;
    twin.waterMesh.scale.setScalar(9.5);
    twin.waterMesh.material.color.setHex(twinLerpHex(0x2E5A66, 0x6FA9BC, 1 - inputs.turb/10));
    twin.waterMesh.material.opacity = 0.35 + (inputs.turb/10)*0.35;
    twin.waterMesh.position.y = twin.waterMesh.userData.baseY = 0.5 + (1 - inputs.depth/10)*1.6;
  }

  // 나무 (육상 전용)
  const vegCount = isLand ? Math.round((inputs.veg/10) * TWIN_TREE_POOL) : 0;
  twin.trees.forEach((g,i)=>{
    g.visible = i < vegCount;
    if(!g.visible) return;
    const { rx, rz, canopy } = g.userData;
    const gy = twinGroundHeight(rx, rz, elevAmt);
    g.position.set(rx, gy, rz);
    const scale = 0.7 + (inputs.veg/10)*0.6;
    g.scale.setScalar(scale);
    const baseGreen = twinLerpHex(0x7FA378, 0x2B3A28, inputs.veg/10);
    const jitterTarget = g.userData.hueJitter > 0 ? 0xA8C79A : 0x24301F;
    canopy.material.color.setHex(twinLerpHex(baseGreen, jitterTarget, Math.abs(g.userData.hueJitter)*0.5));
  });

  // 인간 시설물 (교란 지수)
  const distVal = isLand ? inputs.dist : inputs.mdist;
  const propCount = Math.round((distVal/10) * TWIN_PROP_POOL);
  twin.props.forEach((box,i)=>{
    box.visible = i < propCount;
    if(!box.visible) return;
    const { rx, rz } = box.userData;
    const gy = isLand ? twinGroundHeight(rx, rz, elevAmt) : 0.6;
    box.position.y = gy + 0.2;
  });

  // 종 실루엣
  const results = activeSpecies().map(sp=>({ sp, ...scoreSpecies(sp, inputs) })).sort((a,b)=>b.total-a.total);
  const activeIds = new Set(results.map(r=>r.sp.id));

  const filterWrap = document.getElementById('twin-filters');
  if(filterWrap.dataset.habitat !== currentHabitat){
    const classes = [...new Set(activeSpecies().map(sp=>sp.cls))];
    twinClassFilter = new Set(classes);
    filterWrap.innerHTML = classes.map(c=>`<button class="twin-chip active" data-cls="${c}" onclick="toggleTwinClass('${c}')">${c}</button>`).join('');
    filterWrap.dataset.habitat = currentHabitat;
  }

  Object.keys(twin.creatures).forEach(id=>{
    if(!activeIds.has(id)){ twin.creatures[id].group.visible = false; twin.creatures[id].halo.visible = false; }
  });
  const legendEl = document.getElementById('twin-legend');
  let legendHtml = '';
  results.forEach((r,i)=>{
    const c = twin.creatures[r.sp.id];
    if(!c) return;
    const show = r.total >= 30 && twinClassFilter.has(r.sp.cls);
    c.group.visible = show;
    c.halo.visible = show;
    if(!show) return;
    const angle = (i/results.length) * Math.PI*2;
    const radius = 3.6;
    const rx = Math.cos(angle)*radius, rz = Math.sin(angle)*radius;
    const gy = isLand ? twinGroundHeight(rx, rz, elevAmt) : 0;
    c.group.userData.baseX = rx; c.group.userData.baseZ = rz;
    c.group.userData.targetY = gy + (isLand ? (1.5 - (r.total/100)*1.15) : (0.25 + (1 - r.total/100)*2.1));
    c.group.userData.targetScale = 0.8 + (r.total/100)*0.9;
    c.bodies.forEach(mesh=>{ mesh.material.opacity = 0.45 + (r.total/100)*0.55; });
    c.halo.position.set(rx, gy + 0.02, rz);
    c.halo.material.color.setHex(barColorHex(r.total));
    c.halo.material.opacity = 0.25 + (r.total/100)*0.35;
    c.halo.scale.setScalar(0.7 + (r.total/100)*0.6);
  });
  activeSpecies().forEach((sp,i)=>{
    const r = results.find(x=>x.sp.id===sp.id);
    const filteredOut = !twinClassFilter.has(sp.cls);
    const dim = filteredOut ? 'opacity:.35' : '';
    legendHtml += `<div class="twin-legend-item" style="${dim}"><span class="twin-dot" style="background:${barColor(r.total)}"></span><span class="twin-legend-name">${sp.name}</span><span class="twin-legend-score">${r.total}점${filteredOut ? ' · 숨김':''}</span></div>`;
  });
  legendEl.innerHTML = legendHtml;

  document.getElementById('twin-caption').textContent = interpret(inputs);
}

function animateTwinFrame(){
  if(!twin || currentMode !== 'twin'){ twinRafId = null; return; }
  twin.angle += 0.0022;
  twin.clock += 0.016;
  const r = 11;
  twin.camera.position.set(Math.sin(twin.angle)*r, 5.2, Math.cos(twin.angle)*r);
  twin.camera.lookAt(0, 0.6, 0);

  Object.values(twin.creatures).forEach(c=>{
    if(!c.group.visible) return;
    const ud = c.group.userData;
    c.group.position.x = ud.baseX;
    c.group.position.z = ud.baseZ;
    const bob = Math.sin(twin.clock*1.4 + c.phase) * 0.035;
    c.group.position.y += (ud.targetY + bob - c.group.position.y) * 0.07;
    const s = c.group.scale.x + (ud.targetScale - c.group.scale.x) * 0.07;
    c.group.scale.setScalar(s);
    c.group.rotation.y += 0.006;
  });

  if(twin.waterMesh.visible && twin.waterMesh.userData.baseY !== undefined){
    twin.waterMesh.position.y = twin.waterMesh.userData.baseY + Math.sin(twin.clock*1.1)*0.02;
  }

  twin.renderer.render(twin.scene, twin.camera);
  twinRafId = requestAnimationFrame(animateTwinFrame);
}

function startTwin(){
  if(typeof THREE === 'undefined'){
    document.getElementById('twin-loading').textContent = '3D 라이브러리를 불러오지 못했어요. 발행된 링크에서 다시 열어보세요.';
    return;
  }
  initTwin();
  resizeTwin();
  updateTwin(readInputs());
  if(!twinRafId) animateTwinFrame();
}
function stopTwin(){
  if(twinRafId){ cancelAnimationFrame(twinRafId); twinRafId = null; }
}
