# Modelos 3D (.glb)

1. Copia tus .glb en esta carpeta.
2. Añade su nombre a `manifest.json` (el navegador no puede listar carpetas).
3. Abre la app. No hay que editar el modelo.

## Cómo se conecta cada modelo (data/mapeo.json)
- **Mallas con nombre** (p. ej. Z-Anatomy: "Humerus.L"): `patrones` traduce el nombre nativo a un id.
- **Una sola malla fusionada** (como el esqueleto de ZBrush): se segmenta sola por geometría
  (piezas sueltas + posición en el cuerpo) con las `reglas` de `segmentacion`.
- Estructuras sin hueso propio (nervios, vasos, músculos, órganos) se vinculan a huesos en `data/anclajes.json`.

## Consola (F12)
Cada clic imprime el nombre nativo del .glb, la pieza detectada y el id asignado.
