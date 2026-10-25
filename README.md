# Anatenea

Aplicación web de anatomía humana de primer año: visor 3D con clic sobre estructuras,
fichas clínicas y repaso espaciado (curva del olvido).

## Correr
python3 -m http.server 8080   # y abrir http://localhost:8080

## Contenido
- data/regiones.json  → lapsos y regiones
- data/lapso1|2|3/    → un .json por región
- models/             → modelos .glb (ver models/README.md)
