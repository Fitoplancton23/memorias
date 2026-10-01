# Cómo cargar el material

Este es el único documento que hace falta leer para cargar contenido al archivo.
Todo se hace en **cuatro planillas**. El sitio se arma solo a partir de ellas.

## Regla de oro

Cada cosa tiene un **código corto** (lo llamamos *slug*): sin mayúsculas, sin acentos,
sin espacios, con guiones. `plaza-libertad`, `juan-schmidt`, `doc-001`.
Ese código es el que se usa para conectar una foto con una persona o con un lugar.
Una vez que un código se usó, **no se cambia nunca**.

## Las fechas se escriben como salen

No hace falta aprender un formato ni inventar precisión. El sistema entiende
cómo se escribe normalmente:

| Se escribe | Se interpreta como |
|---|---|
| `1966` | ese año exacto |
| `1960 aprox` · `1967 Aprox` · `c.1920` | alrededor de ese año |
| `1985/1986` · `1985/86` · `1966-1968` · `1975 a 1977` | entre esos dos años |
| `07/10/2025` | ese día (día/mes/año) |
| `década del 60` · `déc. 1950` · `años 60` | esa década entera |
| `pendiente` · `sin fecha` · *(vacío)* | no se sabe |

**Dejar `pendiente` es una respuesta válida y correcta.** Es mucho mejor que
poner un año inventado: el sitio muestra la incertidumbre en vez de esconderla,
y una fecha aproximada bien marcada vale más que una exacta que es mentira.

Si escribís algo que el sistema no entiende, no lo adivina: avisa al cargar,
con la fila exacta, para que se corrija.

## Planilla 1 — `lugares`

`slug, nombre, tipo, lat, lng, vigencia, alias, notas`

- **tipo**: plaza, escuela, iglesia, comercio, chacra, calle, puente, curso de agua…
- **lat / lng**: se pueden dejar vacías al principio; se completan después con el mapa.
- **vigencia**: `1940-1978` si el lugar existió entre esas fechas. `1935-` si sigue existiendo.
- **alias**: nombres anteriores separados por `;` (la Plaza Libertad antes se llamó de otra manera).

## Planilla 2 — `personas`

`slug, nombre, apellido, apodo, sexo, nacimiento, defuncion, lugar_origen, vive, notas`

- **vive**: `si` si la persona está viva. **Importante**: el sistema le oculta automáticamente
  las fechas y las notas en el sitio público. Ante la duda, poner `si`.
- **lugar_origen**: el slug de un lugar de la Planilla 1.

## Planilla 3 — `acontecimientos`

`slug, titulo, tipo, fecha, lugares, descripcion`

- **lugares**: uno o varios slugs separados por `;`.

## Planilla 4 — `documentos` (la más importante)

`slug, tipo, titulo, fecha, descripcion, transcripcion, personas, lugares, acontecimientos, aportante, fuente_url, archivo, licencia, estado`

- **tipo**: foto, relato, recorte, audio, video, documento.
- **transcripcion**: si es un relato, el texto completo va acá. Es lo que hace que el buscador lo encuentre.
- **personas / lugares / acontecimientos**: slugs separados por `;`. Esto es lo que teje la red.
- **aportante**: quién lo mandó. Va con crédito en el sitio; no se saltea.
- **fuente_url**: link al posteo original de Facebook, si lo hay.
- **estado**: `borrador` mientras se trabaja, `publicado` cuando puede salir al sitio.
  **Lo que dice `borrador` no aparece en el sitio.** Ese es todo el sistema de moderación.

## Planilla 5 (opcional) — `familia`

`persona, padre, madre, conyuges, notas`

Una fila por persona. Solo lo que se sabe. El sistema arma el árbol a partir de esto:
no hay que cargar la relación dos veces ni pensar en el sentido.

## Qué conviene priorizar

No busques cargar todo. Buscá **anclar**: 20 lugares y 15 acontecimientos bien elegidos,
y después colgar documentos de ellos. 300 documentos bien conectados cuentan una historia;
3.000 sueltos son el grupo de Facebook otra vez.
