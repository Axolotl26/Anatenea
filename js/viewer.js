import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { segmentar } from "./segmentar.js";

export function createViewer(canvas, { onPick, onMiss, mapeo, cfg, onEstado }) {
  const R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  R.setPixelRatio(Math.min(devicePixelRatio, 1.75)); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping;
  const sc = new THREE.Scene(); sc.fog = new THREE.Fog(0x050b14, 14, 40);
  const cam = new THREE.PerspectiveCamera(40, 1, .05, 120); cam.position.set(0, 0, 22);
  const controls = new OrbitControls(cam, canvas); controls.enableDamping = true; controls.minDistance = .5; controls.maxDistance = 40;
  sc.add(new THREE.HemisphereLight(0xbfe9ff, 0x0a1220, 1.2));
  const dl = new THREE.DirectionalLight(0xffffff, 2.4); dl.position.set(5, 8, 10); sc.add(dl);
  const rim = new THREE.PointLight(0x2dd4bf, 120, 40); rim.position.set(-8, 3, -6); sc.add(rim);
  const root = new THREE.Group(); sc.add(root);
  const gltf = new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/"));

  const todas = [], piezas = []; // todas: para inspección; piezas: interactivas (con id)
  let sel = null, refs = new Set(), region = null, hover = null, fly = null, down = null;
  const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const matHueso = (id) => { const c = new THREE.Color(0xe7ddc6), h = (hash(id) % 100) / 100; c.offsetHSL((h - .5) * .02, 0, (h - .5) * .07);
    return new THREE.MeshStandardMaterial({ color: c, roughness: .58, metalness: .03, transparent: true }); };

  function registrar(mesh, id, nativo, extra = {}) {
    mesh.userData = { ...mesh.userData, id, nativo, ...extra, op: 1 };
    mesh.material = id ? (mesh.material.isMeshStandardMaterial && extra.conservar ? mesh.material.clone() : matHueso(id)) : matHueso("resto");
    mesh.material.transparent = true;
    todas.push(mesh); if (id) piezas.push(mesh); else mesh.userData.op = .5;
  }

  async function cargarModelos(urls) {
    const resumen = [];
    for (const url of urls) {
      let g; try { g = await gltf.loadAsync(url, (e) => e.total && onEstado?.(`Cargando ${Math.round((e.loaded / e.total) * 100)} %`)); }
      catch (e) { console.warn("No se pudo cargar", url, e); continue; }
      root.add(g.scene); g.scene.updateMatrixWorld(true);
      const meshes = []; g.scene.traverse((o) => o.isMesh && meshes.push(o));
      for (const m of meshes) {
        const asoc = g.parser.associations.get(m), defNombre = asoc && g.parser.json.meshes?.[asoc.meshes]?.name;
        const cadena = []; for (let x = m; x; x = x.parent) if (x.name) cadena.unshift(x.name);
        const nativo = { archivo: url.split("/").pop(), nodo: m.name, mallaGltf: defNombre, jerarquia: cadena.join(" › ") };
        let id = null; for (let x = m; x && !id; x = x.parent) id = mapeo.id(x.name);       // 1) por nombre nativo
        if (id) { registrar(m, id, nativo, { conservar: true }); resumen.push([id, "nombre", url]); continue; }
        if (cfg.segmentacion?.activar && m.geometry.index && m.geometry.attributes.position.count >= cfg.segmentacion.minVertices) { // 2) por geometría
          const r = segmentar(m, cfg.segmentacion);
          if (r) {
            for (const p of r.piezas) {
              const piece = new THREE.Mesh(p.geo, matHueso(p.id || "resto")); piece.position.copy(m.position); piece.quaternion.copy(m.quaternion); piece.scale.copy(m.scale);
              m.parent.add(piece); registrar(piece, p.id, nativo, { lado: p.lado, seg: r, conservar: false }); if (p.id) resumen.push([p.id, "segmentación", url]);
            }
            console.info("Segmentación automática:", r.orientacion, `${r.C.length} piezas sueltas`); m.parent.remove(m); todas.splice(todas.indexOf(m), 1); continue;
          }
        }
        registrar(m, null, nativo);
      }
    }
    const ids = new Set(resumen.map((r) => r[0]));
    console.table([...ids].map((id) => ({ id, mallas: piezas.filter((p) => p.userData.id === id).length })));
    framear(null);
    return { ids };
  }

  const expandir = (set) => (set.has("*") ? new Set(piezas.map((p) => p.userData.id)) : set);
  function caja(ids, cercano) {
    const b = new THREE.Box3();
    for (const id of ids) {
      const ps = piezas.filter((p) => p.userData.id === id); if (!ps.length) continue;
      if (!cercano) { ps.forEach((p) => b.expandByObject(p)); continue; }
      let best = ps[0], d = 1e9; for (const p of ps) { const dd = new THREE.Box3().setFromObject(p).getCenter(new THREE.Vector3()).distanceTo(cam.position); if (dd < d) { d = dd; best = p; } }
      b.expandByObject(best);
    }
    return b;
  }
  function framear(ids, cercano = false, desplazar = false) {
    let b = ids && ids.size ? caja(ids, cercano) : new THREE.Box3().setFromObject(root);
    if (b.isEmpty()) b = new THREE.Box3().setFromObject(root);
    const c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
    const d = Math.max(2.2, Math.max(s.y, s.x * .8) * 1.35 / Math.tan((cam.fov * Math.PI) / 360) / 2 + s.z);
    const dir = cam.position.clone().sub(controls.target).normalize(), right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const t = c.clone().add(right.multiplyScalar(desplazar && innerWidth > 900 ? d * .22 : 0)); fly = { tgt: t, pos: t.clone().add(dir.multiplyScalar(d)) };
  }

  // RAYCASTING + modo inspección en consola
  const ray = new THREE.Raycaster(), mp = new THREE.Vector2();
  const hit = (e, lista) => { const r = canvas.getBoundingClientRect(); mp.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(mp, cam); return ray.intersectObjects(lista.filter((m) => m.userData.op > .4), false)[0] ?? null; };
  function inspeccionar(h) {
    const u = h.object.userData, seg = u.seg, comp = seg ? seg.C[seg.vc[h.object.geometry.userData.orig[h.face.a]]] : null;
    console.group(`%c🦴 CLIC · nombre nativo del .glb: «${u.nativo.nodo}»`, "color:#2dd4bf;font-weight:bold");
    console.log("Archivo:", u.nativo.archivo, "| Malla glTF:", u.nativo.mallaGltf, "| Jerarquía:", u.nativo.jerarquia);
    console.table({ "id asignado": u.id ?? "(sin id)", lado: u.lado ?? "-", "vértices de la pieza": h.object.geometry.attributes.position.count,
      ...(comp ? { "isla (vértices)": comp.n, "altura rel. (0=pies,1=cabeza)": +comp.vc.toFixed(3), "|lateral| rel.": +comp.xl.toFixed(3), "profundidad frontal rel.": +comp.f.toFixed(3) } : {}) });
    console.groupEnd();
  }
  canvas.addEventListener("pointermove", (e) => { const h = hit(e, piezas); hover = h?.object ?? null; canvas.style.cursor = hover ? "pointer" : "grab"; });
  canvas.addEventListener("pointerdown", (e) => { down = [e.clientX, e.clientY]; fly = null; });
  canvas.addEventListener("pointerup", (e) => {
    if (!down) return; const mv = Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5; down = null; if (mv) return;
    const h = hit(e, todas); if (h) inspeccionar(h);
    const p = hit(e, piezas); p ? onPick(p.object.userData.id) : onMiss();
  });
  const resize = () => { R.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); };
  addEventListener("resize", resize); resize();
  (function loop() {
    requestAnimationFrame(loop);
    if (fly) { cam.position.lerp(fly.pos, .08); controls.target.lerp(fly.tgt, .08); if (cam.position.distanceTo(fly.pos) < .02) fly = null; }
    for (const m of todas) { const u = m.userData, mat = m.material, a = u.id === sel, r = refs.has(u.id), h = m === hover || (hover && hover.userData.id === u.id);
      const vis = u.id ? (!region || region.has(u.id) || a || r ? 1 : .12) : .5;
      mat.opacity += (vis - mat.opacity) * .12; u.op = mat.opacity;
      if (mat.emissive) { mat.emissive.setHex(a ? 0x2dd4bf : r ? 0x8b5cf6 : h ? 0x38bdf8 : 0); mat.emissiveIntensity = a ? .55 : r ? .4 : h ? .3 : 0; } }
    controls.update(); R.render(sc, cam);
  })();
  return {
    cargarModelos,
    setRegion(set) { region = set ? expandir(set) : null; sel = null; refs = new Set(); framear(region, false); },
    select(id, anclas = []) { sel = id; refs = expandir(new Set(anclas)); const own = piezas.some((p) => p.userData.id === id);
      framear(own ? new Set([id]) : refs.size ? refs : null, true, true); },
    reset() { sel = null; refs = new Set(); framear(region, false); },
  };
}
