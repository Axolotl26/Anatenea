import { createViewer } from "./viewer.js";
import { createUI } from "./ui.js";

const json = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u); return r.json(); });
const regiones = await json("data/regiones.json");
const E = new Map();
await Promise.all(regiones.map(async (r) => {
  try { for (const e of await json(r.datos)) E.set(e.id, { ...e, region: r.id }); } catch (err) { console.warn("Sin datos:", r.datos); }
}));
let ui;
const viewer = createViewer(document.getElementById("cv"), {
  onPick: (id) => ui.abrir(id), onMiss: () => ui.cerrar(),
  onProgress: (p) => (document.getElementById("status").textContent = `Cargando modelo ${Math.round(p * 100)} %`),
});
ui = createUI({ viewer, regiones, E });
ui.rail(); ui.contar();
ui.irRegion(regiones[1]);
