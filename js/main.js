import { createViewer } from "./viewer.js";
import { createUI } from "./ui.js";
import { crearMapeo } from "./mapeo.js";

const json = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u); return r.json(); });
const [regiones, cfg, A, manifest] = await Promise.all([json("data/regiones.json"), json("data/mapeo.json"), json("data/anclajes.json"), json("models/manifest.json").catch(() => ({ modelos: [] }))]);
const E = new Map();
await Promise.all(regiones.map(async (r) => {
  try { for (const e of await json(r.datos)) E.set(e.id, { ...e, region: r.id }); } catch (err) { console.warn("Sin datos:", r.datos); }
}));
const status = (t) => (document.getElementById("status").textContent = t);
let ui;
const viewer = createViewer(document.getElementById("cv"), { mapeo: crearMapeo(cfg), cfg, onEstado: status, onPick: (id) => ui.abrir(id), onMiss: () => ui.cerrar() });
const { ids: meshIds } = await viewer.cargarModelos(manifest.modelos.map((m) => "models/" + m));
// Verificación de cobertura: cada estructura debe tener malla propia o anclaje a huesos existentes
const sin = [...E.keys()].filter((id) => !meshIds.has(id) && !(A[id] || []).some((x) => x === "*" || meshIds.has(x)));
console.log(`%c✅ Cobertura 3D: ${E.size - sin.length}/${E.size} estructuras conectadas al visor`, "color:#34d399;font-weight:bold");
if (sin.length) console.warn("Sin malla ni anclaje:", sin);
ui = createUI({ viewer, regiones, E, A, meshIds });
ui.rail(); ui.contar(); ui.irRegion(regiones[1]);
