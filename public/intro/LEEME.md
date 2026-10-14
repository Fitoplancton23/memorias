# La intro en video

Dejá acá tres archivos y la intro se enciende sola en el próximo build:

    intro.webm    la pieza, primera opción (más chica)
    intro.mp4     la misma pieza, respaldo
    intro.webp    el primer fotograma, lo que se ve mientras el video no está

Si no están, no pasa nada: la pantalla de carga es la de siempre, dos segundos
con el isotipo dibujándose. El HTML ni siquiera menciona una etiqueta de video.
Para apagar la intro, se borran los archivos y se vuelve a construir.

**Van commiteados al repo.** Cloudflare Pages sirve lo que está en el repo; un
video en .gitignore no existe para el sitio publicado. El límite de Pages es 25
MB por archivo, así que no hay problema de tamaño, pero sí de sentido: apuntá a
que el .webm quede abajo del megabyte.

## Cómo se arma, desde After Effects

Exportá un master y transcodificá acá; el H.264 de After Effects a bitrate bajo
es flojo. Master en ProRes 422, sin audio, 1280×720 — es un fondo detrás de un
logo, 1920 duplica el peso para nada.

    ffmpeg -i master.mov -an -vf scale=1280:-2 -c:v libx264 -profile:v high \
      -crf 26 -preset slow -pix_fmt yuv420p -movflags +faststart intro.mp4

    ffmpeg -i master.mov -an -vf scale=1280:-2 -c:v libvpx-vp9 \
      -crf 34 -b:v 0 -row-mt 1 intro.webm

    ffmpeg -i master.mov -vf "select=eq(n\,0),scale=1280:-2" -frames:v 1 -q:v 80 intro.webp

`-an` saca la pista de audio entera: el video arranca silenciado de todos modos
—es la condición para que un navegador lo deje reproducirse solo— así que el
audio sería peso que nadie va a escuchar. `+faststart` mueve el índice al
principio del archivo; sin eso el navegador se baja el archivo completo antes
de mostrar un fotograma.

## Los tiempos

La puerta entera dura 10 segundos y está repartida así:

| Momento | Qué pasa |
|---|---|
| 0,0 s | arranca el video, aparece «Saltar intro» |
| 5,7 s | el isotipo empieza a dibujarse (trazo de 3,5 s) |
| 8,9 s | empieza el relleno (0,5 s) |
| 9,4 s | el isotipo está completo y la cortina empieza a abrirse |
| 10,0 s | la portada ya no está |

Si la pieza cambia de largo, se tocan tres números y tienen que seguir cuadrando:
`DURACION` en el script de `src/layouts/Base.astro`, y los dos retrasos de
`.cargando.con-intro .cargando-marca` en `src/styles/tokens.css`. La cuenta es:
el relleno tiene que terminar en `DURACION - 600 ms`, y el trazo empieza 3,7 s
antes de eso.

## Lo que la intro no hace nunca

No retrasa el sitio. Si el video no empezó a correr en 1,8 segundos, se descarta
y la portada se comporta como siempre — nadie se queda mirando un rectángulo
negro esperando algo que no va a llegar.

No aparece con `prefers-reduced-motion`, ni con el ahorro de datos del
navegador encendido, ni en conexiones que se declaran 2g o 3g.

No se puede quedar cerrada: el reloj la cierra aunque el video se trabe, y hay
botón de saltar y tecla Escape desde el primer segundo. Una intro de diez
segundos sin salida es una pared, y buena parte de quien entra viene de un
enlace de WhatsApp a buscar una foto.

Una sola vez por visita, como el resto de la pantalla de carga. Recargar la
vuelve a mostrar, que es lo que hace falta mientras se la ajusta.
