/* Procesador de fotos del archivo.
   -------------------------------------------------------------------------
   Se corre a mano, no en cada build: las fotos cambian de a poco y procesar
   doscientos escaneos en cada deploy sería absurdo. Los derivados se
   commitean; los originales NO (pesan, y son material sin publicar).

       intake/fotos/*.{jpg,jpeg,png,tif,webp}   originales, fuera del repo
                   ↓  node scripts/procesar-imagenes.mjs
       public/memorias/<slug>-{1600,800,320}.{webp,jpg}
       intake/fotos.json                        manifiesto para la carga

   Se borran TODOS los metadatos. Un escaneo de celular trae GPS y modelo del
   aparato: publicar la foto del abuelo con las coordenadas de la casa de
   quien la escaneó sería filtrar el domicilio de un vecino sin que se entere.
   sharp los descarta por defecto y acá además no se pide conservarlos.       */

import sharp from 'sharp';
import { readdirSync, mkdirSync, writeFileSync, existsSync, statSync, copyFileSync, unlinkSync } from 'node:fs';
import { join, dirname, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRADA = join(root, 'intake', 'fotos');
const SALIDA = join(root, 'public', 'memorias');
const MANIFIESTO = join(root, 'intake', 'fotos.json');

/* 1600 para mirar de cerca una foto vieja —que es a lo que la gente viene—,
   800 para la ficha, 320 para los listados. */
const ANCHOS = [1600, 800, 320];
const CALIDAD = 80;
/* Dos anchos que se parecen no justifican dos archivos. */
const CERCA = 1.15;

const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

if (!existsSync(ENTRADA)) {
  console.error(`No existe ${ENTRADA}. Poné ahí los originales.`);
  process.exit(1);
}
mkdirSync(SALIDA, { recursive: true });

const archivos = readdirSync(ENTRADA)
  .filter(f => /\.(jpe?g|png|tiff?|webp)$/i.test(f))
  .sort();

if (!archivos.length) {
  console.error(`No hay imágenes en ${ENTRADA}.`);
  process.exit(1);
}

const manifiesto = [];
let pesoOriginal = 0, pesoFinal = 0, ahorrados = 0, sobrantes = 0;

for (const archivo of archivos) {
  const origen = join(ENTRADA, archivo);
  pesoOriginal += statSync(origen).size;
  const nombre = slug(basename(archivo, extname(archivo)));
  const img = sharp(origen).rotate();            /* respeta la orientación EXIF y la descarta */
  const meta = await img.metadata();

  /* Qué anchos vale la pena emitir.
     Nunca agrandar: un escaneo de 900px no mejora estirado a 1600. Y dos
     anchos que quedan casi iguales —350 y 320— son dos archivos para la
     misma imagen: se queda el más grande. */
  const anchos = [];
  for (const ancho of ANCHOS) {
    const w = Math.min(ancho, meta.width || ancho);
    if (anchos.some(a => a >= w && a < w * CERCA)) continue;
    if (!anchos.includes(w)) anchos.push(w);
  }
  anchos.sort((a, b) => a - b);

  const derivados = [];
  for (const w of anchos) {
    const destino = join(SALIDA, `${nombre}-${w}.webp`);
    await sharp(origen).rotate()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: CALIDAD })
      .toFile(destino);
    pesoFinal += statSync(destino).size;
    derivados.push({ ancho: w, webp: `/memorias/${nombre}-${w}.webp` });
  }

  /* Un solo respaldo jpg, en el ancho mayor, para el navegador viejo que no
     lee webp. Si reencodear sale más caro que el original —estas fotos ya
     vienen comprimidas por Facebook, así que pasa seguido— se copia el
     original tal cual en vez de inflarlo. */
  const mayor = anchos[anchos.length - 1];
  const respaldo = join(SALIDA, `${nombre}-${mayor}.jpg`);
  await sharp(origen).rotate()
    .resize({ width: mayor, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(respaldo);
  if (statSync(respaldo).size >= statSync(origen).size && mayor >= (meta.width || 0)) {
    copyFileSync(origen, respaldo);
    ahorrados++;
  }
  pesoFinal += statSync(respaldo).size;

  /* Si el webp del ancho mayor no le gana al jpg, sobra: el navegador cae al
     jpg y pesa menos. Pasa con las fotos ya muy comprimidas, donde webp no
     tiene margen para mejorar. */
  const ultimo = derivados[derivados.length - 1];
  if (ultimo) {
    const w = join(SALIDA, `${nombre}-${ultimo.ancho}.webp`);
    if (statSync(w).size >= statSync(respaldo).size) {
      pesoFinal -= statSync(w).size;
      unlinkSync(w);
      derivados.pop();
      sobrantes++;
    }
  }
  const salidas = { jpg: `/memorias/${nombre}-${mayor}.jpg`, derivados };

  manifiesto.push({
    original: archivo,
    nombre,
    ancho: meta.width ?? null,
    alto: meta.height ?? null,
    /* lo que va en memorias.foto_url */
    foto_url: salidas.jpg,
    /* anchos reales distintos, listos para el srcset */
    derivados,
  });
  console.log(`  ${archivo} → ${nombre} (${meta.width}×${meta.height})`);
}

writeFileSync(MANIFIESTO, JSON.stringify(manifiesto, null, 2) + '\n');

const mb = n => (n / 1024 / 1024).toFixed(1) + ' MB';
console.log(`\n${archivos.length} foto(s) · webp por ancho + un respaldo jpg`);
console.log(`originales ${mb(pesoOriginal)} → derivados ${mb(pesoFinal)}`);
if (ahorrados) console.log(`${ahorrados} original(es) ya venían bien comprimidos: se copiaron sin reencodear`);
if (sobrantes) console.log(`${sobrantes} webp descartado(s) por no mejorar al jpg`);
console.log(`Manifiesto en intake/fotos.json`);
