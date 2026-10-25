// Respaldo procedural ORGÁNICO (solo si no hay .glb). Para realismo real use modelos en /models.
import * as THREE from "three";
const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: .62, metalness: .04 });
function noise(g, a = .012, f = 9) {
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * f) * Math.cos(v.y * f * 1.3) * Math.sin(v.z * f * .8);
    v.addScaledVector(v.clone().normalize(), n * a); p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
}
function longBone(len, r) {
  const pts = [], N = 48;
  for (let i = 0; i <= N; i++) { const t = i / N, e = Math.pow(Math.abs(t - .5) * 2, 5);
    pts.push(new THREE.Vector2(r * (1 + 1.2 * e + .08 * Math.sin(t * 9)), (t - .5) * len)); }
  return noise(new THREE.LatheGeometry(pts, 48), .008);
}
const M = (g, c) => new THREE.Mesh(g, mat(c));
export const BUILD = {
  clavicula() { // curva en «S» itálica con extremos ensanchados
    const c = new THREE.CatmullRomCurve3([[-.9,0,.1],[-.45,.05,.25],[0,0,0],[.5,.02,-.2],[.95,-.03,-.1]].map(a => new THREE.Vector3(...a)));
    const g = new THREE.TubeGeometry(c, 80, .055, 16); const p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 1 + .9 * Math.pow(Math.abs(v.x) / .95, 6); v.y *= k; v.z *= k; p.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals(); const o = M(noise(g, .006), 0xd9c9a3); o.position.set(.9, .95, .3); return o;
  },
  escapula() { // hoja triangular con espina, acromion y coracoides
    const s = new THREE.Shape(); s.moveTo(0,.6); s.bezierCurveTo(.5,.55,.55,.1,.35,-.5); s.bezierCurveTo(.25,-.65,.1,-.62,0,-.5); s.bezierCurveTo(-.2,-.1,-.25,.3,0,.6);
    const g = new THREE.ExtrudeGeometry(s, { depth: .05, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, curveSegments: 24 });
    const o = new THREE.Group(); o.add(M(noise(g, .006), 0xc9d6df));
    const sp = M(new THREE.BoxGeometry(.7, .05, .12), 0xc9d6df); sp.position.set(.1, .2, .12); sp.rotation.z = .15; o.add(sp);
    const co = M(new THREE.SphereGeometry(.08, 20, 20), 0xc9d6df); co.position.set(.45, .45, .15); o.add(co);
    o.position.set(1.6, .3, -.5); o.rotation.set(.1, .5, 0); return o;
  },
  humero() { // diáfisis con epífisis ensanchadas + cabeza esférica
    const o = new THREE.Group(); o.add(M(longBone(1.7, .09), 0xe8dcc0));
    const h = M(noise(new THREE.SphereGeometry(.2, 40, 40), .006), 0xe8dcc0); h.position.set(-.12, .86, 0); o.add(h);
    o.position.set(2.05, -.5, -.1); o.rotation.z = .1; return o;
  },
  esternon() { // manubrio, cuerpo y xifoides
    const s = new THREE.Shape(); s.moveTo(-.2,.9); s.lineTo(.2,.9); s.lineTo(.12,.55); s.lineTo(.13,-.5); s.lineTo(.03,-.8); s.lineTo(-.03,-.8); s.lineTo(-.13,-.5); s.lineTo(-.12,.55); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: .06, bevelEnabled: true, bevelSize: .025, bevelThickness: .02 });
    const o = M(noise(g, .004), 0xe8dcc0); o.position.set(0, .15, .5); return o;
  },
};
