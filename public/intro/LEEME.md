# La intro en video

Dejá acá los archivos y la intro se enciende sola en el próximo build:

    intro-web.mp4     la pieza para pantallas anchas       OBLIGATORIO
    intro-mob.mp4     la pieza para teléfonos              recomendado
    intro-web.webp    primer fotograma de la de escritorio recomendado
    intro-mob.webp    primer fotograma de la de teléfono   recomendado
    intro-web.webm    la misma pieza, más liviana          opcional
    intro-mob.webm    ídem                                 opcional

**El WebM es opcional.** El MP4 se reproduce en todos lados; el WebM existe
sólo para pesar menos, entre un 30 y un 50 % según el material. Si el MP4 ya
queda abajo del megabyte, no vale la pena. Si queda en dos o tres, sí.

**La de teléfono también es opcional, y conviene.** Un apaisado de 1280
estirado para cubrir una pantalla de 390 de ancho tira casi todos sus píxeles
afuera del cuadro y encima pesa de más. Si no está, en el teléfono se usa la de
escritorio. El corte lo hace el navegador a los 46 rem de ancho, el mismo que
usa el resto del sitio, y se decide una sola vez: girar el teléfono a mitad de
la intro no reinicia nada.

Sin `intro-web` no hay intro. Es la que cubre el caso general, y encenderla
sólo en teléfonos sería una sorpresa, no una decisión.

Si no hay nada, no pasa nada: la pantalla de carga es la de siempre, dos
segundos con el isotipo dibujándose, y el HTML ni siquiera menciona una
etiqueta de video. Para apagar la intro, se borran los archivos y se vuelve a
construir.

**Las dos versiones tienen que durar lo mismo**, diez segundos, o los tiempos
del isotipo dejan de cuadrar en una de las dos.

**Van commiteados al repo.** Cloudflare Pages sirve lo que está en el repo; un
video en .gitignore no existe para el sitio publicado. El límite de Pages es 25
MB por archivo, así que no hay problema de tamaño, pero sí de sentido: apuntá a
que el .webm quede abajo del megabyte.

## Cómo se arma, desde After Effects

Exportá un master y transcodificá acá; el H.264 de After Effects a bitrate bajo
es flojo. Master en ProRes 422, sin audio, 1280×720 — es un fondo detrás de un
logo, 1920 duplica el peso para nada.

    ffmpeg -i intrweb.mov -an -vf scale=1280:-2 -c:v libx264 -profile:v high \
      -crf 26 -preset slow -pix_fmt yuv420p -movflags +faststart intro-web.mp4

    ffmpeg -i intrmob.mov -an -vf scale=-2:1280 -c:v libx264 -profile:v high \
      -crf 26 -preset slow -pix_fmt yuv420p -movflags +faststart intro-mob.mp4

    ffmpeg -i intrweb.mov -vf "select=eq(n\,0),scale=1280:-2" -frames:v 1 -q:v 80 intro-web.webp
    ffmpeg -i intrmob.mov -vf "select=eq(n\,0),scale=-2:1280" -frames:v 1 -q:v 80 intro-mob.webp

Y los WebM, si hacen falta:

    ffmpeg -i intrweb.mov -an -vf scale=1280:-2 -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 intro-web.webm
    ffmpeg -i intrmob.mov -an -vf scale=-2:1280 -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 intro-mob.webm

Media Encoder sirve perfectamente para los MP4 —H.264, sin audio, y buscá la
casilla de inicio rápido o «fast start»—. Para los WebM no: su exportador de
VP9 es lento y rinde peor que ffmpeg, así que si los querés, salen de los dos
comandos de arriba.

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
