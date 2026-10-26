// Segmentación automática de UNA malla fusionada: separa islas conectadas (huesos) y las clasifica
// con las reglas declarativas de data/mapeo.json (posición relativa al cuerpo, tamaño, simetría).
import * as THREE from "three";
const KEY = /^(.+?)(Min|Max)$/;
const med = (a) => { if (!a.length) return 0; a.sort((x, y) => x - y); return a[a.length >> 1]; };

export function segmentar(mesh, cfg) {
  const g = mesh.geometry, pos = g.attributes.position, nor = g.attributes.normal, I = g.index?.array;
  if (!I || !cfg?.reglas) return null;
  mesh.updateWorldMatrix(true, false);
  const n = pos.count, W = [new Float32Array(n), new Float32Array(n), new Float32Array(n)], v = new THREE.Vector3();
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    [v.x, v.y, v.z].forEach((t, a) => { W[a][i] = t; if (t < mn[a]) mn[a] = t; if (t > mx[a]) mx[a] = t; });
  }
  // Orientación automática: arriba = eje más largo; lateral = el mayor de los otros dos (brazos abiertos)
  const ext = mx.map((m, i) => m - mn[i]), up = ext.indexOf(Math.max(...ext));
  const rest = [0, 1, 2].filter((a) => a !== up), lat = ext[rest[0]] >= ext[rest[1]] ? rest[0] : rest[1], dep = rest.find((a) => a !== lat);
  const H = ext[up], mid = (mn[lat] + mx[lat]) / 2;
  // Islas conectadas (union-find sobre los triángulos)
  const par = new Int32Array(n); for (let i = 0; i < n; i++) par[i] = i;
  const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let t = 0; t < I.length; t += 3) { const a = find(I[t]); par[find(I[t + 1])] = a; par[find(I[t + 2])] = a; }
  const rc = new Int32Array(n).fill(-1), vc = new Int32Array(n), C = [], ref = [], low = [];
  for (let i = 0; i < n; i++) {
    const r = find(i); if (rc[r] < 0) { rc[r] = C.length; C.push({ n: 0, su: 0, sl: 0, sd: 0, v0: 1e9, v1: -1e9, x0: 1e9, x1: -1e9 }); }
    const k = rc[r], c = C[k]; vc[i] = k;
    const u = (W[up][i] - mn[up]) / H, l = (W[lat][i] - mid) / H, al = Math.abs(l);
    c.n++; c.su += u; c.sl += l; c.sd += W[dep][i];
    if (u < c.v0) c.v0 = u; if (u > c.v1) c.v1 = u; if (al < c.x0) c.x0 = al; if (al > c.x1) c.x1 = al;
    if (u > .05 && u < .25) ref.push(W[dep][i]); if (u < .012) low.push(W[dep][i]);
  }
  const mRef = med(ref), front = Math.sign(med(low) - mRef) || -1; // delante = hacia donde apuntan los dedos del pie
  C.forEach((c) => { c.vc = c.su / c.n; c.vspan = c.v1 - c.v0; c.sgn = Math.sign(c.sl); c.xl = Math.abs(c.sl / c.n); c.xmin = c.x0; c.xmax = c.x1; c.xspan = c.x1 - c.x0; c.f = ((c.sd / c.n) - mRef) * front / H; });
  const cumple = (c, cond) => Object.entries(cond).every(([k, val]) => { const [, ft, op] = KEY.exec(k); return op === "Min" ? c[ft] >= val : c[ft] <= val; });
  C.forEach((c) => { c.id = null; for (const r of cfg.reglas) if (cumple(c, r.c)) { c.id = r.id; break; } });
  for (const [tok, tramos] of Object.entries(cfg.series || {})) {   // p. ej. 24 vértebras → C7, T12, L5
    const seq = tramos.flatMap(([id, k]) => Array(k).fill(id)), ix = C.filter((c) => c.id === tok).sort((a, b) => b.vc - a.vc);
    if (ix.length !== seq.length) console.warn(`Serie ${tok}: ${ix.length} piezas, se esperaban ${seq.length}`);
    ix.forEach((c, j) => (c.id = seq[Math.min(j, seq.length - 1)]));
  }
  for (const [tok, [a, b]] of Object.entries(cfg.parejas || {})) // dos huesos paralelos: el más medial primero
    for (const s of [-1, 1]) C.filter((c) => c.id === tok && c.sgn === s).sort((p, q) => p.xl - q.xl).forEach((c, j) => (c.id = j ? b : a));
  C.forEach((c) => { c.lado = c.xl < .006 ? "M" : c.sgn > 0 ? "+" : "-"; c.key = (c.id || "_resto") + "|" + c.lado; });
  // Una malla por (id, lado), con vértices compactados
  const tris = new Map();
  for (let t = 0; t < I.length; t += 3) { const k = C[vc[I[t]]].key; if (!tris.has(k)) tris.set(k, []); tris.get(k).push(t); }
  const piezas = [];
  for (const [key, ts] of tris) {
    const remap = new Map(), orig = [], idx = new Uint32Array(ts.length * 3);
    ts.forEach((t, j) => { for (let q = 0; q < 3; q++) { const o = I[t + q]; let m = remap.get(o); if (m === undefined) { m = orig.length; remap.set(o, m); orig.push(o); } idx[j * 3 + q] = m; } });
    const P = new Float32Array(orig.length * 3), N = new Float32Array(orig.length * 3);
    orig.forEach((o, m) => { P.set([pos.getX(o), pos.getY(o), pos.getZ(o)], m * 3); if (nor) N.set([nor.getX(o), nor.getY(o), nor.getZ(o)], m * 3); });
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(P, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(N, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.userData.orig = Uint32Array.from(orig);
    const [id, lado] = key.split("|"); piezas.push({ id: id === "_resto" ? null : id, lado, geo });
  }
  return { piezas, vc, C, orientacion: { arriba: "xyz"[up], lateral: "xyz"[lat], profundidad: "xyz"[dep], frente: front } };
}
