import { S, save, cardKey, grade, ret, vencida } from "./srs.js";
const $ = (q) => document.querySelector(q);
const NOT = [["Otra vez", "#e11d48", 0], ["Difícil", "#d97706", 1], ["Bien", "#0891b2", 2], ["Fácil", "#059669", 3]];

export function createUI({ viewer, regiones, E }) {
  let region = null, sel = null, verR = false, con3d = new Set(), q = "";
  const lista = (r) => [...E.values()].filter((e) => e.region === r.id);
  const dom = (e) => Math.round(100 * e.k.reduce((a, _, j) => a + ret(S.cards[cardKey(e.id, j)]), 0) / e.k.length);

  function rail() {
    const f = q.toLowerCase(); let h = "";
    if (f) { const r = [...E.values()].filter((e) => (e.n + " " + e.r).toLowerCase().includes(f)); h = `<h4>Resultados (${r.length})</h4>` + r.map((e) => `<button data-e="${e.id}">${e.n}</button>`).join(""); }
    else for (const l of [1, 2, 3]) { h += `<h4>Lapso ${l}</h4>`;
      for (const r of regiones.filter((x) => x.lapso === l)) { const n = lista(r).length, on = region?.id === r.id;
        h += `<button data-r="${r.id}" class="${on ? "on" : ""}"><i class="dot ${n ? (r.completo ? "ok" : "part") : ""}"></i>${r.nombre}<span class="mu" style="margin-left:auto">${n || "—"}</span></button>`;
        if (on) { const gs = new Map(); lista(r).forEach((e) => { const g = e.g || "General"; if (!gs.has(g)) gs.set(g, []); gs.get(g).push(e); });
          h += `<div class="sub">${[...gs].map(([g, a]) => `<h4>${g}</h4>` + a.map((e) => `<button data-e="${e.id}" class="${sel === e.id ? "on" : ""}">${e.n}</button>`).join("")).join("")}</div>`; } } }
    $("#rail").innerHTML = h;
    $("#rail").querySelectorAll("[data-r]").forEach((b) => b.onclick = () => irRegion(regiones.find((r) => r.id === b.dataset.r)));
    $("#rail").querySelectorAll("[data-e]").forEach((b) => b.onclick = () => { abrir(b.dataset.e); $("#rail").classList.remove("open"); });
  }
  async function irRegion(r) {
    cerrar(); region = r; $("#status").textContent = "Cargando modelo…";
    const info = await viewer.loadRegion(r, new Set(lista(r).map((e) => e.id))); con3d = info.con3d;
    $("#status").textContent = { glb: "MODELO ANATÓMICO .GLB", proc: "VISTA PROCEDURAL · AÑADE .GLB EN /models PARA REALISMO", ninguno: "SIN MALLA 3D · USA LA LISTA" }[info.modo] + " · " + r.nombre.toUpperCase();
    rail(); contar();
  }
  async function abrir(id) {
    const e = E.get(id); if (region?.id !== e.region) await irRegion(regiones.find((r) => r.id === e.region));
    sel = id; verR = false; if (!S.seen.includes(id)) { S.seen.push(id); save(); } viewer.select(id); panel(); rail();
  }
  function cerrar() { sel = null; $("#panel").classList.remove("open"); viewer.reset(); }
  function panel() {
    const e = E.get(sel); if (!e) return; const j = e.k.findIndex((_, x) => vencida(S.cards[cardKey(e.id, x)])), pd = dom(e);
    $("#panel").innerHTML = `<button class="x" id="cx">✕</button><div class="kick">Lapso ${region.lapso} · ${e.t}</div><h2>${e.n}</h2>
    <div class="bar"><i style="width:${pd}%"></i></div><div class="mu">Retención estimada: ${pd}%${con3d.has(e.id) ? "" : " · ficha sin malla 3D aún"}</div>
    <p>${e.r}</p><ul>${e.p.map((x) => `<li>${x}</li>`).join("")}</ul>
    ${e.m ? `<div class="box nem">💡 ${e.m}</div>` : ""}${e.h ? `<div class="box his">🔬 ${e.h}</div>` : ""}${e.c ? `<div class="box cli">🩺 ${e.c}</div>` : ""}
    <div class="rev"><div class="mu" style="letter-spacing:.15em">REPASO ACTIVO</div>${j < 0 ? "<p>Sin tarjetas vencidas aquí ✨</p>" :
      `<p><b>${e.k[j][0]}</b></p>${verR ? `<p style="color:#a7f3d0">${e.k[j][1]}</p><div class="g">${NOT.map((n) => `<button style="background:${n[1]}" data-c="${cardKey(e.id, j)}" data-n="${n[2]}">${n[0]}</button>`).join("")}</div>` : `<button class="btn" id="ver">Mostrar respuesta</button>`}`}</div>
    <p class="mu">Fuente: ${e.f}</p>`;
    $("#panel").classList.add("open"); $("#cx").onclick = cerrar; const v = $("#ver"); if (v) v.onclick = () => { verR = true; panel(); };
    $("#panel").querySelectorAll("[data-c]").forEach((b) => b.onclick = () => { S.cards[b.dataset.c] = grade(S.cards[b.dataset.c], +b.dataset.n); save(); verR = false; panel(); contar(); });
  }
  const todas = () => [...E.values()].flatMap((e) => e.k.map((k, j) => ({ e, k, key: cardKey(e.id, j), s: S.cards[cardKey(e.id, j)] })));
  const cola = () => todas().filter((c) => vencida(c.s)).sort((a, b) => ret(a.s) - ret(b.s));
  function contar() { const n = cola().length; $("#due").textContent = n ? `(${n})` : ""; }
  function repaso() {
    const T = todas(), qq = cola(), c = qq[0], ok = T.filter((x) => ret(x.s) >= .8).length, prox = T.filter((x) => x.s && x.s.v > Date.now()).sort((a, b) => a.s.v - b.s.v)[0];
    $("#repc").innerHTML = `<div class="kick">Repetición espaciada</div><h2>Repaso del día</h2>
    <div class="stats"><div><b>${qq.length}</b><span class="mu">pendientes</span></div><div><b>${ok}/${T.length}</b><span class="mu">bien retenidas</span></div><div><b>${S.seen.length}/${E.size}</b><span class="mu">exploradas</span></div></div>` +
      (c ? `<span class="chip">${c.e.n}</span><div class="q">${c.k[0]}</div>${verR ? `<p style="color:#a7f3d0">${c.k[1]}</p><div class="g">${NOT.map((n) => `<button style="background:${n[1]}" data-n="${n[2]}">${n[0]}</button>`).join("")}</div>` : `<button class="btn" id="ver2">Mostrar respuesta</button>`}`
        : `<p>🎉 Todo al día. ${prox ? "Próximo repaso: " + new Date(prox.s.v).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" }) : ""}</p>`);
    const v = $("#ver2"); if (v) v.onclick = () => { verR = true; repaso(); };
    $("#repc").querySelectorAll("[data-n]").forEach((b) => b.onclick = () => { S.cards[c.key] = grade(c.s, +b.dataset.n); save(); verR = false; repaso(); contar(); });
  }
  $("#tabs").onclick = (ev) => { const b = ev.target.closest("[data-v]"); if (!b) return; document.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("on", x === b)); const r = b.dataset.v === "rep"; $("#rep").classList.toggle("on", r); verR = false; if (r) repaso(); };
  $("#q").oninput = (ev) => { q = ev.target.value; rail(); };
  $("#menu").onclick = () => $("#rail").classList.toggle("open");
  return { irRegion, abrir, cerrar, rail, contar };
}
