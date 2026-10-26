// Diccionario flexible: traduce el nombre NATIVO de una malla del .glb a un id de nuestros JSON.
export function crearMapeo(cfg) {
  const pats = (cfg.patrones || []).map(([re, id]) => [new RegExp(re, "i"), id]);
  const exacto = cfg.exacto || {};
  return {
    id(nombre) {
      if (!nombre) return null;
      const n = nombre.replace(/\.\d+$/, "");
      if (n in exacto) return exacto[n];
      for (const [re, id] of pats) if (re.test(n)) return id;
      return null;
    },
  };
}
