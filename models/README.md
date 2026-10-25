# Modelos 3D (.glb)

Coloca aquí un .glb por región con el nombre indicado en `data/regiones.json`
(p. ej. `miembro-superior.glb`). Si falta, la app usa el respaldo procedural.

## Convención crítica
El **nombre de cada malla** debe ser el `id` de la estructura (`humero`, `n-axilar`…).
Sufijos de Blender como `.001` o `.L` se ignoran.

## Fuentes recomendadas (verifica la licencia antes de publicar)
- Z-Anatomy (atlas abierto basado en Blender, CC BY-SA) · BodyParts3D (CC BY-SA)

## Optimización
npx @gltf-transform/cli optimize entrada.glb salida.glb --compress draco --texture-compress webp
Objetivo: < 150 000 triángulos y < 10 MB por región.

## Servir
python3 -m http.server 8080   # los módulos ES no funcionan abriendo con doble clic
