/* Revisar los archivos de la intro antes de publicarlos.
   -------------------------------------------------------------------------
   Un video de intro falla de maneras que no se ven abriendo el archivo: una
   pista de audio que nadie va a escuchar y que pesa, un índice al final que
   obliga a bajar todo antes del primer cuadro, o medio segundo de más que
   descoloca los tiempos del isotipo. Todo eso se pregunta y se contesta acá.

   Necesita ffprobe. Correr: node scripts/revisar-intro.mjs               */

import { execFileSync } from 'node:child_process';
import { existsSync, statSync, readdirSync } from 'node:fs';

const DIR = 'public/intro';
const DURACION = 10;        /* lo que el sitio espera, en segundos */
const TOLERANCIA = 0.15;    /* un cuadro y pico de margen */
const PESO_AVISO = 1.5;     /* MB a partir de los cuales conviene mirar */

const probe = f => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json',
  '-show_format', '-show_streams', f], { encoding: 'utf8' }));

let fallan = 0, avisos = 0;
const mal = m => { fallan++; console.error('  ✗ ' + m); };
const ojo = m => { avisos++; console.warn('  ! ' + m); };

const esperados = [
  ['intro-web.mp4',  true],
  ['intro-mob.mp4',  false],
  ['intro-web.webm', false],
  ['intro-mob.webm', false],
  ['intro-web.webp', false],
  ['intro-mob.webp', false],
];

/* Lo que está en la carpeta y el sitio no mira. Casi siempre es el master sin
   transcodificar —un .mov salido de After Effects— puesto con el nombre
   correcto pero con la extensión equivocada. Es el error más fácil de cometer
   y el más difícil de notar, porque no rompe nada: la intro simplemente no se
   enciende, y no hay ningún mensaje que lo diga. */
const conocidos = new Set([...esperados.map(([n]) => n), 'LEEME.md']);
const colados = existsSync(DIR)
  ? readdirSync(DIR).filter(f => !conocidos.has(f)) : [];
for (const f of colados) {
  const mb = (statSync(`${DIR}/${f}`).size / 1048576).toFixed(1);
  const base = f.replace(/\.[^.]+$/, '');
  const sugerencia = /^intro-(web|mob)$/.test(base)
    ? ` Parece el master de ${base}: hay que transcodificarlo a ${base}.mp4 ` +
      `(ver los comandos en ${DIR}/LEEME.md). El sitio sólo mira .mp4, .webm y .webp.`
    : ' El sitio no lo mira.';
  mal(`${f} (${mb} MB) está en la carpeta y no se usa.${sugerencia}`);
}

/* Ninguna intro no es un error: es el estado normal del sitio. El archivo
   obligatorio sólo se exige cuando ya hay algo puesto, porque ahí sí alguien
   quiso una intro y le falta la pieza que la enciende. */
const hayAlguno = esperados.some(([n]) => existsSync(`${DIR}/${n}`));
if (!hayAlguno) {
  console.log('No hay ningún archivo que el sitio mire en ' + DIR + ': la intro '
    + 'está apagada y la portada es la de siempre.');
  process.exit(fallan ? 1 : 0);
}

console.log('Archivos en ' + DIR + '\n');

for (const [nombre, obligatorio] of esperados) {
  const f = `${DIR}/${nombre}`;
  if (!existsSync(f)) {
    if (obligatorio) mal(`${nombre} no está, y sin él no hay intro.`);
    else console.log(`  · ${nombre} — no está (opcional)`);
    continue;
  }
  const mb = statSync(f).size / 1048576;
  let d;
  try { d = probe(f); } catch { mal(`${nombre} no se pudo leer: ¿está entero?`); continue; }
  const v = d.streams.find(s => s.codec_type === 'video');
  const audio = d.streams.some(s => s.codec_type === 'audio');
  const dur = +(d.format.duration || v?.duration || 0);

  console.log(`  ${nombre.padEnd(16)} ${mb.toFixed(2).padStart(6)} MB  ` +
    `${v ? v.width + 'x' + v.height : '?'}  ${v?.codec_name || '?'}` +
    (nombre.endsWith('.webp') ? '' : `  ${dur.toFixed(2)} s`));

  if (nombre.endsWith('.webp')) continue;

  if (Math.abs(dur - DURACION) > TOLERANCIA)
    mal(`${nombre} dura ${dur.toFixed(2)} s y el sitio está armado para ${DURACION}. ` +
        `O se reexporta, o se mueven DURACION en Base.astro y los dos retrasos del isotipo.`);
  if (audio)
    ojo(`${nombre} trae pista de audio. El video arranca silenciado siempre, ` +
        `así que es peso que nadie va a escuchar: reexportar con -an.`);
  if (mb > PESO_AVISO)
    ojo(`${nombre} pesa ${mb.toFixed(2)} MB. Entra, pero es mucho para una intro.`);

  /* El índice al principio. Sin esto el navegador se baja el archivo entero
     antes de mostrar un cuadro, que en una conexión lenta es justo el caso que
     el presupuesto de 1,8 s descarta. Sólo aplica a MP4. */
  if (nombre.endsWith('.mp4')) {
    const cab = execFileSync('sh', ['-c',
      `head -c 64 ${JSON.stringify(f)} | tr -c '[:alnum:]' ' '`], { encoding: 'utf8' });
    if (!/moov/.test(cab))
      mal(`${nombre} no tiene el índice al principio. En Media Encoder es la casilla ` +
          `de inicio rápido; con ffmpeg, -movflags +faststart.`);
  }
}

/* Las dos versiones tienen que durar lo mismo, o el isotipo cuadra en una y
   no en la otra. */
const dur = n => existsSync(`${DIR}/${n}`) ? +probe(`${DIR}/${n}`).format.duration : null;
const dw = dur('intro-web.mp4') ?? dur('intro-web.webm');
const dm = dur('intro-mob.mp4') ?? dur('intro-mob.webm');
if (dw && dm && Math.abs(dw - dm) > TOLERANCIA)
  mal(`La de escritorio dura ${dw.toFixed(2)} s y la de teléfono ${dm.toFixed(2)}. ` +
      `Tienen que durar lo mismo.`);

console.log('');
if (fallan) { console.error(`${fallan} problema(s) que hay que arreglar antes de publicar.`); process.exit(1); }
console.log(avisos ? `Listo, con ${avisos} aviso(s).` : 'Listo: los archivos están como tienen que estar.');
