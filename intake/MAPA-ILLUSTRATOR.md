# Cómo exportar el mapa desde Illustrator

El mapa ilustrado es el sistema de coordenadas de todo el proyecto. Vale la pena
exportarlo bien una vez, porque rehacerlo después obliga a reubicar cada marcador.

## Lo único imprescindible

**El SVG tiene que tener `viewBox`.** Sin `viewBox` no hay sistema de coordenadas
estable y las marcas se corren cuando cambie el tamaño del dibujo. En Illustrator
sale solo si en el export está tildado **Responsive**.

## Ajustes de exportación

`Archivo → Exportar → Exportar como… → SVG`, y en el cuadro:

| Opción | Valor | Por qué |
|---|---|---|
| Styling | **Presentation Attributes** | Con "Internal CSS" el SVG trae reglas propias que chocan con las de la página. |
| Font | **Convert to outline** (o SVG si querés texto vivo) | Ver la nota de abajo. |
| Images | **Embed** — pero mejor: ninguna | Una imagen incrustada infla el archivo muchísimo. |
| Object IDs | **Layer Names** | Los nombres de capa pasan a ser `id` del SVG: es lo que permite después iluminar el río, las manzanas o una calle. |
| Decimal | **2** | Con 3+ el archivo crece sin que se note la diferencia. |
| Minify | destildado | Para poder leerlo y corregirlo a mano. |
| Responsive | **tildado** | Es lo que genera el `viewBox`. |

## Cómo conviene organizar las capas

Nombrá las capas así, porque esos nombres se convierten en los `id`:

```
#fondo        relleno general
#agua         arroyos, río
#manzanas     las manzanas urbanas
#calles       trazado de calles
#rutas        ruta 14, ruta provincial 220
#hitos        plaza, iglesia, escuelas — lo que se dibuje aparte
#etiquetas    TODO el texto, junto y en su propia capa
```

Que el texto esté en su propia capa importa: nos deja apagar las etiquetas cuando
haya muchos marcadores encima, sin tocar el dibujo.

**No aplanes todo a un solo trazado.** Si el mapa entero queda como un `<path>`
gigante, no se puede resaltar nada y perdemos la mitad de lo que hace interesante
tener un mapa propio.

## Tamaño

Apuntá a menos de **500 KB**. Si se va muy por encima, casi siempre es por
demasiados puntos de ancla: `Objeto → Trazado → Simplificar` sobre las curvas del
río y las rutas resuelve la mayor parte.

## Las bases ya están generadas

En `public/mapa/` hay dos bases hechas desde los `.osm`, con la geografía real:

| Archivo | Qué cubre | Tamaño real | viewBox |
|---|---|---|---|
| `ejido.svg` | Aristóbulo + Salto Encantado + Cerro Moreno y los parajes | 20,1 × 16,8 km | 2000 × 1686 |
| `casco.svg` | sólo el casco urbano de Aristóbulo | 4,4 × 4,5 km | 2000 × 2035 |

Vienen con las capas ya nombradas: `#verde`, `#agua`, `#cursos`, `#manzanas`,
`#edificios`, `#caminos`, `#calles`, `#rutas`, `#hitos`, `#etiquetas`.

**Se dibuja encima, no desde cero.** Abrí la base en Illustrator, bloqueá esas
capas, y dibujá arriba con tu estilo. Después borrás o apagás las capas de OSM
y queda tu ilustración con la geometría verdadera debajo.

**No muevas ni escales el lienzo, y no cambies el `viewBox`.** Ahí está todo el
valor: como las bases salieron de una proyección conocida (Web Mercator) con
límites anotados en `public/mapa/mapa.json`, cada punto del dibujo tiene también
su latitud y longitud reales. Verificado: la ida y vuelta entre coordenadas
reales y coordenadas del dibujo da menos de 1 metro de error.

Eso significa que el marcador que el profe pone a mano queda además
geolocalizado de verdad, sin que él tenga que saberlo. Si algún día la
municipalidad quiere los datos en un SIG, ya están.

**`ejido.svg` pesa 763 KB**, casi todo por los 1.413 edificios. Si te molesta,
borrá la capa `#edificios`: para el mapa del ejido no aporta nada y baja el
archivo a menos de la mitad. `casco.svg` pesa 174 KB.

## Por qué dos mapas y no uno

Con números: el casco urbano mide 4,4 km de ancho y el territorio completo 20,1 km.
**El casco entra en el 22% del ancho del territorio.** En un solo mapa amplio, las
408 manzanas de Aristóbulo quedan en una mancha de un quinto del dibujo y no se
distingue ninguna. Por eso cada lugar declara en qué mapa está, y hay una columna
`mapa` en la planilla con valor `casco` o `ejido`.

## Hallazgo sobre tus archivos

**El `mapa_general.osm` no contiene Cerro Moreno.** Corta en la latitud -27,0422
y el Paraje Cerro Moreno está en -27,0128: quedan afuera 4,6 km por el norte,
incluido el paraje entero. Si hubiéramos usado sólo ese archivo, Cerro Moreno no
existía. Las bases están hechas fusionando los cuatro extractos, así que el
problema ya está resuelto.

También aparecieron núcleos que no estaban en la conversación y que son
justamente los colonos rurales de los que hablás: Colonia del Carril, Paraje
Kilómetro 198, Paraje Kilómetro 218, Paraje Tamanduá, Paraje Salto Piedras
Blancas, y dos comunidades aborígenes — Kapi'i Poty y Ka'aguy Miri Rupa.

## Atribución obligatoria

Los datos son de OpenStreetMap, bajo licencia ODbL. El sitio tiene que decir
**"© colaboradores de OpenStreetMap"** en algún lugar visible, incluso si el
dibujo final es tuyo, porque la geometría deriva de ellos.

## Cómo se ubican los marcadores

Con `admin/ubicar-lugares.html`: se abre haciendo doble clic, se carga el `.svg` y
`data/lugares.csv`, se elige un lugar de la lista y se hace clic en el mapa. Al
terminar, descarga el `lugares.csv` actualizado. No sube nada a ningún lado: todo
pasa en el navegador.

Las coordenadas se guardan **normalizadas** (`x` e `y` entre 0 y 1, relativas al
`viewBox`), no en píxeles. Así, si más adelante redibujás el mapa con otro tamaño o
más detalle, los marcadores siguen cayendo donde corresponde mientras la geografía
no se mueva.

---

## OBSOLETO desde 2026-10-01

Este documento describía el export de un mapa dibujado en Illustrator. Esa vía
se reemplazó por los extractos `.osm`, que son más precisos y permiten trabajo
generativo sobre el dibujo.

Con base de OpenStreetMap los marcadores se ubican solos desde su latitud y
longitud: no hace falta colocarlos a mano. Quedan sin uso:

- `admin/ubicar-lugares.html`
- las columnas `lugares.x` y `lugares.y` (se dejan en el esquema, vacías)

Se conserva por si alguna vez se quiere una capa ilustrada **encima** de la
base cartográfica.
