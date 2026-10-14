/* Revisar los archivos de la intro antes de publicarlos.
   -------------------------------------------------------------------------
   Un video de intro falla de maneras que no se ven abriendo el archivo: una
   pista de audio que nadie va a escuchar y que pesa, un índice al final que
   obliga a bajar todo antes del primer cuadro, o medio segundo de más que
   descoloca los tiempos del isotipo. Todo eso se pregunta y se contesta acá.

   Necesita ffprobe. Correr: node scripts/revisar-intro.mjs               */

import { execFileSync } from 'node:child_process';
import { existsSync, statSync, readdirSync, openSync, readSync, closeSync } from 'node:fs';

const DIR = 'public/intro';
/* El sitio ya no espera un largo fijo: se lo pregunta al archivo. Lo que sí
   tiene que cumplirse es que las dos versiones duren lo mismo —el navegador lee
   el largo del archivo que le tocó, así que si no coinciden el isotipo cuadra
   en escritorio y no en teléfono— y que el largo sea razonable para una puerta
   de entrada. */
const MIN = 1, MAX = 20;    /* segundos, para una intro */
const TOLERANCIA = 0.15;    /* un cuadro y pico de margen */
const PESO_AVISO = 1.5;     /* MB a partir de los cuales conviene mirar */
/* Arriba de esto no es una opinión: Cloudflare Pages no sirve archivos de más
   de 25 MB, y además un video así es bitrate de master. Diez segundos a 8 MB
   ya son 6,4 Mbps, que es cinco veces lo que necesita un fondo detrás de un
   logo. */
const PESO_FRENO = 8;

/* ffprobe contesta lo que hay adentro del archivo —duración, medidas, si trae
   audio—, y no está en todas las máquinas. Se pregunta una sola vez: sin él se
   corre igual lo que no lo necesita, en vez de acusar a los archivos de estar
   rotos, que es lo que hacía esta misma herramienta y era mentira. */
let hayProbe = true;
try { execFileSync('ffprobe', ['-version'], { stdio: 'ignore' }); } catch { hayProbe = false; }

const probe = f => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json',
  '-show_format', '-show_streams', f], { encoding: 'utf8' }));

/* ¿El índice está antes de los datos? En un MP4 los contenedores de primer
   nivel van en fila, cada uno con su largo y su nombre: alcanza con recorrer
   esa fila y ver quién llega primero, `moov` —el índice— o `mdat` —el video—.
   Se lee en Node y no con herramientas de consola, para que ande igual en
   Windows. */
function indiceAlPrincipio(f) {
  const fd = openSync(f, 'r');
  try {
    const cab = Buffer.alloc(16);
    for (let pos = 0, vueltas = 0; vueltas < 64; vueltas++) {
      if (readSync(fd, cab, 0, 16, pos) < 8) return null;
      let largo = cab.readUInt32BE(0);
      const tipo = cab.toString('latin1', 4, 8);
      if (tipo === 'moov') return true;
      if (tipo === 'mdat') return false;
      if (largo === 1) largo = Number(cab.readBigUInt64BE(8));   /* largo de 64 bits */
      if (largo === 0) return null;                              /* hasta el final */
      if (largo < 8) return null;                                /* ilegible */
      pos += largo;
    }
    return null;
  } catch { return null; } finally { closeSync(fd); }
}

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
  let d = null;
  if (hayProbe) {
    try { d = probe(f); } catch { mal(`${nombre} no se pudo leer: ¿está entero?`); continue; }
  }
  const v = d && d.streams.find(s => s.codec_type === 'video');
  const audio = d && d.streams.some(s => s.codec_type === 'audio');
  const dur = d ? +(d.format.duration || v?.duration || 0) : null;

  console.log(`  ${nombre.padEnd(16)} ${mb.toFixed(2).padStart(6)} MB` +
    (v ? `  ${v.width}x${v.height}  ${v.codec_name}` : '') +
    (dur != null && !nombre.endsWith('.webp') ? `  ${dur.toFixed(2)} s` : ''));

  if (nombre.endsWith('.webp')) continue;

  if (dur != null && (dur < MIN || dur > MAX))
    mal(`${nombre} dura ${dur.toFixed(2)} s. Para una intro conviene entre ${MIN} y ${MAX}.`);
  if (audio === true)
    ojo(`${nombre} trae pista de audio. El video arranca silenciado siempre, ` +
        `así que es peso que nadie va a escuchar: reexportar con -an.`);
  if (mb > PESO_FRENO)
    mal(`${nombre} pesa ${mb.toFixed(1)} MB, o sea ${(mb * 8 / 10).toFixed(1)} Mbps. ` +
        `Eso es bitrate de master, no de entrega — y arriba de 25 MB Cloudflare ` +
        `directamente no lo sirve. Reexportar apuntando a 1,2 Mbps.`);
  else if (mb > PESO_AVISO)
    ojo(`${nombre} pesa ${mb.toFixed(2)} MB. Entra, pero es mucho para una intro.`);

  /* El índice al principio. Sin esto el navegador se baja el archivo entero
     antes de mostrar un cuadro, que en una conexión lenta es justo el caso que
     el presupuesto de 1,8 s descarta. Sólo aplica a MP4. */
  if (nombre.endsWith('.mp4') && indiceAlPrincipio(f) === false)
    mal(`${nombre} no tiene el índice al principio. En Media Encoder es la casilla ` +
        `de inicio rápido; con ffmpeg, -movflags +faststart.`);
}

/* Las dos versiones tienen que durar lo mismo, o el isotipo cuadra en una y
   no en la otra. */
const dur = n => {
  if (!hayProbe || !existsSync(`${DIR}/${n}`)) return null;
  try { return +probe(`${DIR}/${n}`).format.duration; } catch { return null; }
};
const dw = dur('intro-web.mp4') ?? dur('intro-web.webm');
const dm = dur('intro-mob.mp4') ?? dur('intro-mob.webm');
if (dw && dm && Math.abs(dw - dm) > TOLERANCIA)
  mal(`La de escritorio dura ${dw.toFixed(2)} s y la de teléfono ${dm.toFixed(2)}. ` +
      `Tienen que durar lo mismo.`);

/* ¿Falta en el disco algo que el repo sí tiene? Pasó: una limpieza de
   archivos de prueba borró los videos de verdad, porque estaban en la misma
   carpeta y con el mismo nombre, y el commit se llevó puesto el borrado sin
   que nadie lo notara hasta dos días después. Esto lo habría dicho en el acto. */
try {
  const enRepo = execFileSync('git', ['ls-files', DIR], { encoding: 'utf8' })
    .split('\n').map(x => x.trim()).filter(Boolean);
  const borrados = enRepo.filter(f => !existsSync(f));
  for (const f of borrados)
    mal(`${f} está en el repositorio y no en el disco. Si no fue a propósito, ` +
        `vuelve con: git checkout -- ${f}`);
} catch {}

console.log('');
if (!hayProbe)
  ojo('No hay ffprobe en esta máquina, así que no se pudo mirar adentro de los '
    + 'archivos: duración, medidas y pista de audio quedaron sin revisar. Lo que '
    + 'sí se revisó: los nombres, el peso y el índice al principio.');

if (fallan) { console.error(`${fallan} problema(s) que hay que arreglar antes de publicar.`); process.exit(1); }
console.log(avisos ? `Listo, con ${avisos} aviso(s).` : 'Listo: los archivos están como tienen que estar.');
