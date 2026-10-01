# Memorias de mi pueblo — Aristóbulo del Valle

Archivo histórico interactivo construido con el material que aportan los vecinos.

## Cómo funciona

```
data/*.csv            fuente de verdad (bajada de las planillas del admin)
   ↓  scripts/build-snapshot.mjs
src/data/snapshot.json  un solo archivo con todo el grafo
   ↓  Astro
dist/                 sitio estático, sin backend
```

No hay base de datos ni servidor. El sitio se reconstruye entero en segundos.
`db/schema.sql` tiene el esquema Postgres de destino para cuando el volumen lo justifique.

## Arrancar

```bash
npm install     # correr en Windows, no desde otra máquina
npm run dev     # regenera los datos y levanta el sitio
```

Otros comandos:

```bash
npm run datos   # solo regenera snapshot.json (muestra avisos de validación)
npm run build   # sitio de producción en dist/
```

## Los datos

`data/` viene con **datos de ejemplo** para que el sitio renderice.
Están marcados con `DATO DE EJEMPLO` y hay que borrarlos apenas entre el material real.

El contrato de carga con el admin está en `intake/INSTRUCCIONES-ADMIN.md`.
Las columnas de las planillas no se cambian sin avisar: son la interfaz entre las dos pistas de trabajo.

## Validación

`npm run datos` avisa de: slugs rotos, fechas que no entiende, documentos sin fecha
y personas marcadas como vivas que tienen datos sensibles cargados.
Los avisos también se ven en la home cuando se corre en modo desarrollo.

## Privacidad

- `vive = si` en la planilla de personas oculta fechas y notas en el sitio público.
- `estado = borrador` en documentos mantiene el material fuera del sitio.
- Cada documento guarda `aportante` y `fuente_url`: el crédito al vecino no es opcional.
