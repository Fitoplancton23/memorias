/* Genera un juego de datos de DESARROLLO en data/demo/.
   No toca data/ — ahí viven los datos reales del pueblo.

   Los apellidos son los de la colonización real de la zona (alemanes del Volga,
   polacos, ucranianos, brasileños, criollos) y varios salen del propio
   OpenStreetMap de Aristóbulo. Las PERSONAS Y LOS PARENTESCOS SON INVENTADOS.
   Por eso el snapshot queda marcado como demo y el sitio muestra un aviso
   permanente: una genealogía falsa de un pueblo real, sin avisar, sería
   desinformación sobre familias que existen.                                */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const SAL = join(raiz, 'data', 'demo');
mkdirSync(SAL, { recursive: true });

let semilla = 20260929;
const rnd = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648;
const elegir = a => a[Math.floor(rnd() * a.length)];
const entre = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = v => /[",\n]/.test(v) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);

const APELLIDOS = ['Silveira','Hermann','Kaiser','Muller','Lang','Roth','Weber','Nicklas',
  'Prytuluk','Lizoski','Semeniuk','Kowalczuk','Duarte','Pereira','Machado','Paz','Ramirez',
  'Ferreyra','Ojeda','Benitez','Jhansson','Wagner','Melnyk','Schmidt'];
const VARON = ['Luis','Gerardo','Oscar','Roberto','Antonio','Juan','Pedro','Otto','Julio','Raul',
  'Hector','Jose','Alberto','Miguel','Ernesto','Rodolfo','Anibal','Ramon','Eduardo','Walter','Osvaldo','Tito'];
const MUJER = ['Clementina','Celina','Susana','Ana','Marta','Eva','Rosa','Ida','Norma','Berta',
  'Hilda','Mirta','Ramona','Elsa','Lucia','Olga','Nelida','Irma','Dora','Teresa','Blanca','Amalia'];

const personas = new Map();   // slug -> ficha
const grupos = [];            // { padre, madre, hijos: [] }
const emparejados = new Set();

function alta(nombre, apellido, sexo, anioNac, lugar) {
  const completo = `${nombre} ${apellido}`;
  let s = slug(completo), n = 2;
  while (personas.has(s) && personas.get(s).nac !== anioNac) s = slug(completo) + '-' + n++;
  if (!personas.has(s)) {
    const vive = anioNac >= 1955 && rnd() < .75;
    personas.set(s, {
      slug: s, nombre, apellido, sexo, nac: anioNac,
      def: vive ? null : anioNac + entre(58, 92), vive, lugar, completo
    });
  }
  return personas.get(s);
}

/* --- fundadores: 12 parejas que llegan entre 1890 y 1915 --- */
const LUGARES = ['plaza-libertad','escuela-406','capilla-vieja','secadero-grande','salto-encantado',
  'paraje-cerro-moreno','barrio-teforito','loteo-lizoski','ruta-14-km-1209','arroyo-cunapiru'];

const raices = [];
for (let i = 0; i < 12; i++) {
  const apH = APELLIDOS[i % APELLIDOS.length];
  const apM = elegir(APELLIDOS.filter(a => a !== apH));
  const anio = entre(1888, 1912);
  const p = alta(elegir(VARON), apH, 'M', anio, elegir(LUGARES));
  const m = alta(elegir(MUJER), apM, 'F', anio + entre(-4, 6), elegir(LUGARES));
  raices.push({ padre: p, madre: m, apellido: apH, gen: 0 });
}

/* --- tres generaciones; los hijos se casan con OTRAS familias, que es lo que
       convierte el bosque en una red --- */
let camada = raices;
for (const gen of [1, 2, 3]) {
  const siguiente = [];
  for (const g of camada) {
    const n = gen === 3 ? entre(0, 2) : entre(2, 5);
    const hijos = [];
    for (let i = 0; i < n; i++) {
      const sexo = rnd() < .5 ? 'M' : 'F';
      const nac = Math.max(g.padre.nac + 22, 1890) + gen * 26 + entre(-4, 7);
      if (nac > 2012) continue;
      const h = alta(elegir(sexo === 'M' ? VARON : MUJER), g.apellido, sexo, nac, elegir(LUGARES));
      hijos.push(h);
    }
    /* Se registra el grupo aunque no haya hijos cargados: si no, el matrimonio
       se pierde y el cónyuge queda suelto como si no fuera de nadie. */
    grupos.push({ padre: g.padre, madre: g.madre, hijos });

    /* Segundas nupcias: en un pueblo del siglo XX se enviudaba joven, y es el
       caso que obliga a que una persona pertenezca a más de una unión. */
    if (gen < 3 && rnd() < .12) {
      const viudo = rnd() < .5 ? g.padre : g.madre;
      const sexoPar = viudo.sexo === 'M' ? 'F' : 'M';
      const segunda = alta(elegir(sexoPar === 'M' ? VARON : MUJER),
        elegir(APELLIDOS.filter(a => a !== viudo.apellido)), sexoPar,
        viudo.nac + entre(0, 12), elegir(LUGARES));
      const hijos2 = [];
      for (let i = 0; i < entre(1, 3); i++) {
        const sx = rnd() < .5 ? 'M' : 'F';
        const nac = viudo.nac + 34 + entre(0, 8);
        if (nac > 2012) continue;
        hijos2.push(alta(elegir(sx === 'M' ? VARON : MUJER), viudo.apellido, sx, nac, elegir(LUGARES)));
      }
      grupos.push({
        padre: viudo.sexo === 'M' ? viudo : segunda,
        madre: viudo.sexo === 'M' ? segunda : viudo,
        hijos: hijos2, segundas: true
      });
    }

    for (const h of hijos) {
      if (gen === 3 || rnd() > .7) continue;
      const sexoPar = h.sexo === 'M' ? 'F' : 'M';
      /* En un pueblo chico buena parte de los casamientos son entre familias que
         YA están en el archivo. Reusar una persona existente es lo que funde dos
         grupos en uno; inventar siempre un cónyuge nuevo deja el bosque astillado. */
      const disponibles = [...personas.values()].filter(x =>
        x.sexo === sexoPar && !emparejados.has(x.slug) && x.apellido !== g.apellido &&
        Math.abs(x.nac - h.nac) <= 8 && x !== h);
      const par = (rnd() < 0.30 && disponibles.length)
        ? elegir(disponibles)
        : alta(elegir(sexoPar === 'M' ? VARON : MUJER),
               elegir(APELLIDOS.filter(a => a !== g.apellido)), sexoPar,
               h.nac + entre(-5, 5), elegir(LUGARES));
      emparejados.add(h.slug); emparejados.add(par.slug);
      siguiente.push({
        padre: h.sexo === 'M' ? h : par,
        madre: h.sexo === 'M' ? par : h,
        apellido: h.sexo === 'M' ? g.apellido : par.apellido,
        gen
      });
    }
  }
  camada = siguiente;
}

/* --- gente aportada suelta: todavía sin linaje conocido --- */
for (let i = 0; i < 7; i++)
  alta(elegir(rnd() < .5 ? VARON : MUJER), elegir(APELLIDOS), rnd() < .5 ? 'M' : 'F', entre(1900, 1960), elegir(LUGARES));

/* --- escritura --- */
const fechaTexto = a => {
  const r = rnd();
  return r < .55 ? String(a) : r < .78 ? `${a} aprox` : r < .92 ? `dec. ${Math.floor(a / 10) * 10}` : '';
};

const filasP = ['slug,nombre,apellido,apodo,sexo,nacimiento,defuncion,lugar_origen,vive,notas'];
for (const p of personas.values())
  filasP.push([p.slug, p.nombre, p.apellido, '', p.sexo, fechaTexto(p.nac),
    p.def ? fechaTexto(p.def) : '', p.lugar, p.vive ? 'si' : 'no',
    'DATOS DE DEMOSTRACION - persona inventada'].map(esc).join(','));
writeFileSync(join(SAL, 'personas.csv'), filasP.join('\n') + '\n');

const lineas = ['# DATOS DE DEMOSTRACION - generados por scripts/generar-demo.mjs',
                '# Las personas y los parentescos son inventados.'];
for (const g of grupos) {
  /* A veces el aportante sólo recuerda a uno de los dos: el formato lo admite
     y el sistema tiene que saber dibujarlo. */
  const solo = !g.segundas && g.hijos.length && rnd() < .18;   // en desarrollo conviene que el caso esté siempre presente
  const adultos = solo ? (rnd() < .5 ? g.padre : g.madre).completo
                       : `${g.padre.completo} y ${g.madre.completo}`;
  lineas.push(g.hijos.length
    ? `${adultos}. Hijos: ${g.hijos.map(h => h.completo).join(', ')}`
    : adultos);
}
writeFileSync(join(SAL, 'linajes.txt'), lineas.join('\n') + '\n');

const NOM = { 'plaza-libertad':['Plaza Libertad','plaza'], 'escuela-406':['Escuela 406','escuela'],
  'capilla-vieja':['Capilla Vieja','iglesia'], 'secadero-grande':['Secadero Grande','comercio'],
  'salto-encantado':['Salto Encantado','paraje'], 'paraje-cerro-moreno':['Paraje Cerro Moreno','paraje'],
  'barrio-teforito':['Barrio Teforito','barrio'], 'loteo-lizoski':['Loteo Lizoski','barrio'],
  'ruta-14-km-1209':['Ruta 14, km viejo 1209','ruta'], 'arroyo-cunapiru':['Arroyo Cuñapirú','curso de agua'] };
const filasL = ['slug,nombre,tipo,x,y,lat,lng,vigencia,alias,notas'];
for (const [s, [n, t]] of Object.entries(NOM))
  filasL.push([s, n, t, '', '', '', '', '', '', 'DATOS DE DEMOSTRACION'].map(esc).join(','));
writeFileSync(join(SAL, 'lugares.csv'), filasL.join('\n') + '\n');

const ACT = [['fundacion','Fundacion del pueblo',1920],['primera-escuela','Primera escuela',1935],
  ['llegada-luz','Llegada de la luz electrica',1948],['gran-creciente','Gran creciente del Cuñapirú',1957],
  ['inauguracion-hospital','Inauguracion del hospital',1966],['fiesta-inmigrante','Primera Fiesta del Inmigrante',1972],
  ['pavimentacion','Pavimentacion de la avenida',1984]];
const filasA = ['slug,titulo,tipo,fecha,lugares,descripcion'];
for (const [s, t, a] of ACT)
  filasA.push([s, t, 'hito', String(a), elegir(Object.keys(NOM)), 'DATOS DE DEMOSTRACION'].map(esc).join(','));
writeFileSync(join(SAL, 'acontecimientos.csv'), filasA.join('\n') + '\n');

const TIPOS = ['foto','foto','foto','relato','recorte'];
const gente = [...personas.values()];
const filasD = ['slug,tipo,titulo,fecha,descripcion,transcripcion,personas,lugares,acontecimientos,aportante,fuente_url,archivo,licencia,estado'];
for (let i = 1; i <= 140; i++) {
  const anio = entre(1915, 1995);
  /* se etiqueta gente que ya vivía en ese año: si no, el archivo se contradice */
  const candidatos = gente.filter(p => p.nac <= anio - 3 && (!p.def || p.def >= anio));
  if (!candidatos.length) continue;
  /* Una foto sale de un grupo familiar concreto: una pareja y sus hijos. De vez
     en cuando aparece alguien de afuera — y ESE es el puente que vale la pena
     mirar. Si se etiqueta al azar, todo es puente y el puente no significa nada. */
  const vivosEn = x => x.nac <= anio - 3 && (!x.def || x.def >= anio);
  let sel = new Set();
  for (let intento = 0; intento < 12 && !sel.size; intento++) {
    const g = elegir(grupos);
    const miembros = [g.padre, g.madre, ...g.hijos].filter(vivosEn);
    if (miembros.length) sel = new Set(miembros.slice(0, entre(1, Math.min(4, miembros.length))).map(x => x.slug));
  }
  if (!sel.size) sel = new Set([elegir(candidatos).slug]);
  if (rnd() < .22) sel.add(elegir(candidatos).slug);

  const tipo = elegir(TIPOS);
  filasD.push([`demo-${String(i).padStart(3, '0')}`, tipo,
    elegir(['Grupo familiar','Acto escolar','Frente del comercio','Cuadrilla de trabajo','Casamiento',
            'Procesion','Baile del club','Cosecha de yerba','Frente de la casa','Retrato']) + ` (${i})`,
    fechaTexto(anio) || 'pendiente', 'DATOS DE DEMOSTRACION',
    tipo === 'relato' ? 'Texto de demostracion del relato aportado por el vecino.' : '',
    [...sel].join(';'), elegir(Object.keys(NOM)),
    rnd() < .18 ? elegir(ACT)[0] : '', 'Vecino de demostracion', '', '', 'demo', 'publicado'].map(esc).join(','));
}
writeFileSync(join(SAL, 'documentos.csv'), filasD.join('\n') + '\n');
writeFileSync(join(SAL, 'familia.csv'), 'persona,padre,madre,conyuges,notas\n');

console.log(`demo generada en data/demo/`);
console.log(`  personas ${personas.size} · grupos familiares ${grupos.length} · documentos ${filasD.length - 1}`);
