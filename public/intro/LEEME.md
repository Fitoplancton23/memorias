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

## Antes de publicar

    node scripts/revisar-intro.mjs

Contesta lo que no se ve abriendo el archivo: si dura los diez segundos, si las
dos versiones duran lo mismo, si quedó una pista de audio adentro, si el índice
está al principio —sin eso el navegador se baja el archivo entero antes de
mostrar un cuadro— y cuánto pesa cada uno. Sale con 1 si hay algo que arreglar.

## Los tiempos

**No hay nada que configurar.** El sitio le pregunta al archivo cuánto dura y
despeja todo lo demás de ahí: cuándo empieza a dibujarse el isotipo, cuándo
cierra el relleno y cuándo se abre la cortina. Cambiar la pieza de diez
segundos a tres no pide tocar una línea.

La regla es siempre la misma: **el isotipo queda completo justo cuando empieza
a abrirse la cortina**, que tarda 0,6 s. Lo que cambia es cuánto antes arranca
el trazo.

| Si la pieza dura | el trazo arranca en | el relleno cierra en | la puerta termina en |
|---|---|---|---|
| 3 s | 0,25 s | 2,4 s | 3,0 s |
| 10 s | 5,6 s | 9,4 s | 10,0 s |

**Las dos versiones tienen que durar lo mismo.** Si no, el isotipo cuadra en
escritorio y no en teléfono: el navegador lee el largo del archivo que le tocó.

**La salida visible aparece recién a partir de los 5 segundos.** En una pieza
de tres, el botón aparece y se va antes de que nadie lo registre —es ruido
encima de la animación— y lo que protegía, quedarse encerrado, ya no puede
pasar porque el reloj la cierra igual. Escape funciona siempre, dure lo que
dure.

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
