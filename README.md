# Piano Barroco 3D

Piano web interactivo modelado en 3D con Three.js y sintetizador polifonico hecho con Web Audio. Se puede tocar con click, touch o teclado fisico, cambiar de timbre y alternar el rango con `Alt` izquierdo.

## Como ejecutarlo

Este proyecto es estatico y no necesita build.

```bash
python -m http.server 5174 --bind 127.0.0.1
```

Abre:

```text
http://127.0.0.1:5174/
```

Tambien puede usarse otro puerto si `5174` esta ocupado.

## Controles

- Click o touch sobre una tecla del piano: toca esa nota.
- Teclado fisico: usa las letras que aparecen encima de las teclas.
- `Alt` izquierdo: cambia entre los rangos `I` y `II`.
- Selector `Sonido`: cambia el sintetizador.
- Slider `Volumen`: ajusta la salida general.

## Mapa del teclado

Rango `I`:

```text
Z S X D C V G B H N J M  -> C3 a B3
Q 2 W 3 E R 5 T 6 Y 7 U  -> C4 a B4
```

Rango `II`:

```text
Z S X D C V G B H N J M  -> C4 a B4
Q 2 W 3 E R 5 T 6 Y 7 U  -> C5 a B5
```

## Sonidos incluidos

- `Clavecin`
- `Organo barroco`
- `Cristal`
- `Bronce`
- `Analogico`

## Archivos

- `index.html`: estructura de la experiencia y carga de Three.js por CDN.
- `styles.css`: estetica barroca moderna, layout responsivo y etiquetas.
- `app.js`: escena 3D, interaccion, mapeo de teclado y sintetizador Web Audio.

## Verificacion hecha

Se probo con Playwright en desktop y movil:

- El canvas WebGL renderiza contenido no vacio.
- Hay 24 etiquetas de teclado activas por rango.
- Una tecla fisica activa la animacion de tecla presionada.
- `Alt` izquierdo cambia de `I` a `II`.
- El selector de sonido cambia el preset activo.
