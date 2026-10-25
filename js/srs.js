// Curva del olvido: SM-2 simplificado + retención estimada de Ebbinghaus. Persistencia en localStorage.
const KEY = "anatenea-v1", OLD = "anatomia-viva-pro-v1", DIA = 864e5;
export let S = { cards: {}, seen: [] };
try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || localStorage.getItem(OLD) || "{}")); } catch (e) {} // migra el progreso previo
export const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
export const cardKey = (id, j) => `${id}#${j}`;
export function grade(s, n, t = Date.now()) {
  s = s || { f: 2.5, i: 0, r: 0, u: 0, v: t };
  let { f, i, r } = s;
  if (n === 0) return { f: Math.max(1.3, f - .2), i: 0, r: 0, u: t, v: t + 6e5 };
  r++;
  i = r === 1 ? 1 : r === 2 ? (n === 1 ? 3 : 6) : Math.max(1, Math.round(i * f * (n === 1 ? .8 : n === 3 ? 1.3 : 1)));
  f = Math.max(1.3, f + (n === 1 ? -.15 : n === 3 ? .15 : 0));
  return { f, i, r, u: t, v: t + i * DIA };
}
// R = e^(-t/S), con S calibrada para R = 90 % en la fecha de vencimiento
export const ret = (s) => s && s.u ? Math.exp(-((Date.now() - s.u) / DIA) / (Math.max(s.i, .5) / -Math.log(.9))) : 0;
export const vencida = (s) => !s || s.v <= Date.now();
