import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { BUILD } from "./proc.js";

export function createViewer(canvas, { onPick, onMiss, onProgress }) {
  const R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  R.setPixelRatio(Math.min(devicePixelRatio, 1.75)); R.outputColorSpace = THREE.SRGBColorSpace;
  R.toneMapping = THREE.ACESFilmicToneMapping;
  const sc = new THREE.Scene(); sc.fog = new THREE.Fog(0x050b14, 8, 20);
  const cam = new THREE.PerspectiveCamera(40, 1, .05, 80); cam.position.set(1, .7, 5.8);
  const controls = new OrbitControls(cam, canvas); controls.target.set(1, .1, 0); controls.enableDamping = true; controls.minDistance = .4; controls.maxDistance = 14;
  sc.add(new THREE.HemisphereLight(0xbfe9ff, 0x0a1220, 1.1));
  const dl = new THREE.DirectionalLight(0xffffff, 2.2); dl.position.set(3, 4, 3); sc.add(dl);
  const rim = new THREE.PointLight(0x2dd4bf, 25, 14); rim.position.set(-3, 1, -2); sc.add(rim);
  const root = new THREE.Group(); sc.add(root);
  const draco = new DRACOLoader().setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
  const gltf = new GLTFLoader().setDRACOLoader(draco);

  let pick = [], ids = new Set(), sel = null, hover = null, fly = null, down = null;
  const idOf = (o) => { for (let x = o; x; x = x.parent) { const n = x.name.replace(/\.[A-Za-z0-9]+$/, "").toLowerCase(); if (ids.has(n)) return n; } return null; };
  function tag(obj) { obj.traverse((m) => { if (m.isMesh) { const id = idOf(m); if (id) { m.userData.id = id; m.material = m.material.clone(); pick.push(m); } } }); }
  function clear() { root.clear(); pick = []; sel = hover = null; }

  async function loadRegion(region, idSet) {
    clear(); ids = new Set([...idSet].map((s) => s.toLowerCase())); let modo = "ninguno";
    if (region.modelo) {
      try {
        const g = await gltf.loadAsync(region.modelo, (e) => e.total && onProgress?.(e.loaded / e.total));
        root.add(g.scene); tag(g.scene); modo = "glb";
      } catch (e) { console.warn("Sin modelo .glb:", region.modelo); }
    }
    if (modo === "ninguno") for (const id of ids) if (BUILD[id]) { const o = BUILD[id](); o.name = id; root.add(o); tag(o); modo = "proc"; }
    const b = new THREE.Box3().setFromObject(root);
    if (!b.isEmpty()) frame(b);
    return { modo, con3d: new Set(pick.map((m) => m.userData.id)) };
  }
  function frame(b) {
    const c = b.getCenter(new THREE.Vector3()), d = Math.max(2.5, b.getSize(new THREE.Vector3()).length() * 1.2);
    fly = { tgt: c, pos: c.clone().add(new THREE.Vector3(0, .15, 1).normalize().multiplyScalar(d)) };
  }
  function enfocar(id) {
    const b = new THREE.Box3(); pick.filter((m) => m.userData.id === id).forEach((m) => b.expandByObject(m));
    if (b.isEmpty()) return;
    const c = b.getCenter(new THREE.Vector3()), d = Math.max(1.2, b.getSize(new THREE.Vector3()).length() * 1.5);
    const dir = cam.position.clone().sub(controls.target).normalize(), right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const t = c.clone().add(right.multiplyScalar(innerWidth > 900 ? d * .25 : 0)); fly = { tgt: t, pos: t.clone().add(dir.multiplyScalar(d)) };
  }
  // RAYCASTING
  const ray = new THREE.Raycaster(), mp = new THREE.Vector2();
  const hit = (e) => { const r = canvas.getBoundingClientRect(); mp.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(mp, cam); return ray.intersectObjects(pick, false)[0]?.object ?? null; };
  canvas.addEventListener("pointermove", (e) => { hover = hit(e); canvas.style.cursor = hover ? "pointer" : "grab"; });
  canvas.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; fly = null; });
  canvas.addEventListener("pointerup", (e) => { if (!down) return; const mv = Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5; down = null; if (mv) return; const m = hit(e); m ? onPick(m.userData.id) : onMiss(); });
  const resize = () => { R.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); };
  addEventListener("resize", resize); resize();
  (function loop() {
    requestAnimationFrame(loop);
    if (fly) { cam.position.lerp(fly.pos, .08); controls.target.lerp(fly.tgt, .08); if (cam.position.distanceTo(fly.pos) < .01) fly = null; }
    for (const m of pick) { const a = m.userData.id === sel, h = hover && m.userData.id === hover.userData.id;
      if (m.material.emissive) { m.material.emissive.setHex(a ? 0x2dd4bf : h ? 0x38bdf8 : 0); m.material.emissiveIntensity = a ? .5 : h ? .3 : 0; } }
    controls.update(); R.render(sc, cam);
  })();
  return { loadRegion, select(id) { sel = id; if (id) enfocar(id); }, reset() { sel = null; const b = new THREE.Box3().setFromObject(root); if (!b.isEmpty()) frame(b); } };
}
