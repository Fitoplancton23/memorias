import { CLASES, CLASE_ARCHIVO, ruta, identificador, identificadorDeArchivo,
         claseRiC, sirveDeIdentificador } from '../src/lib/identidad.js';

let mal = 0;
const ok = (q, c, extra = '') => { if (!c) { mal++; console.error(`  ✗ ${q} ${extra}`); } };
const igual = (q, dio, esp) => ok(q, dio === esp, `\n      dio ${JSON.stringify(dio)}\n      esperaba ${JSON.stringify(esp)}`);
const rompe = (q, f) => { try { f(); mal++; console.error(`  ✗ ${q} (no se quejó)`); } catch (e) {} };

const BASE = 'https://memorias.pages.dev';

/* ---- la ruta de cada cosa ---- */
igual('una memoria', ruta('memoria', 'doc-001'), '/memorias/doc-001/');
igual('una persona', ruta('persona', 'juan-potkova'), '/personas/juan-potkova/');
igual('un lugar', ruta('lugar', 'escuela-normal'), '/lugares/escuela-normal/');
igual('un acontecimiento', ruta('acontecimiento', 'estudiantina-1967'), '/acontecimientos/estudiantina-1967/');
igual('un año', ruta('anio', '1948'), '/anios/1948/');
igual('con espacios alrededor', ruta('memoria', '  doc-001 '), '/memorias/doc-001/');

/* ---- el identificador completo ---- */
igual('lleva el dominio', identificador('memoria', 'doc-001', BASE),
      'https://memorias.pages.dev/memorias/doc-001/');
igual('una barra de más en el dominio no duplica la barra',
      identificador('memoria', 'doc-001', BASE + '/'),
      'https://memorias.pages.dev/memorias/doc-001/');
igual('ni tres barras', identificador('memoria', 'doc-001', BASE + '///'),
      'https://memorias.pages.dev/memorias/doc-001/');

/* ---- el archivo cuelga de su memoria ---- */
igual('la portada', identificadorDeArchivo('doc-001', 0, BASE),
      'https://memorias.pages.dev/memorias/doc-001/#archivo-0');
igual('la segunda foto', identificadorDeArchivo('doc-001', 1, BASE),
      'https://memorias.pages.dev/memorias/doc-001/#archivo-1');
rompe('un orden que no es un entero', () => identificadorDeArchivo('doc-001', 'primera', BASE));
rompe('un orden negativo', () => identificadorDeArchivo('doc-001', -1, BASE));

/* ---- lo que NO puede pasar ----
   Éstas son las tres maneras de perder un identificador, y las tres pasan
   solas si nadie las frena. */
rompe('una entidad sin slug no se puede nombrar', () => ruta('persona', ''));
rompe('ni con el slug en blanco', () => ruta('persona', '   '));
rompe('ni con el slug nulo', () => ruta('persona', null));
rompe('un tipo que no existe no se inventa', () => ruta('cosa', 'x'));

/* Dos tipos distintos con el mismo slug son dos identificadores distintos:
   puede haber un lugar «la-capilla» y un acontecimiento «la-capilla». */
ok('el tipo forma parte del identificador',
   identificador('lugar', 'la-capilla', BASE) !== identificador('acontecimiento', 'la-capilla', BASE));

/* El identificador no puede salir del título, que se corrige. Dos memorias
   con el mismo título y distinto slug tienen que dar identificadores
   distintos, y la misma memoria con el título corregido, el mismo. */
igual('corregir el título no mueve el identificador',
      identificador('memoria', 'acto-escolar-1948', BASE),
      identificador('memoria', 'acto-escolar-1948', BASE));

/* ---- qué sirve de identificador permanente ---- */
for (const s of ['doc-001', 'juan-potkova', 'escuela-425-salto-encantado', '1948'])
  ok(`«${s}» sirve`, sirveDeIdentificador(s));
for (const s of ['Juan-Potkova', 'juan potkova', 'juan_potkova', 'peña', 'josé-maría',
                 'memorias/doc-001', '', '  ', '-juan', 'juan-', 'juan--potkova'])
  ok(`«${s}» NO sirve`, !sirveDeIdentificador(s));

/* ---- la clase de cada cosa ---- */
igual('una memoria es un Record', claseRiC('memoria'), 'rico:Record');
igual('una persona es un Person', claseRiC('persona'), 'rico:Person');
igual('un lugar es un Place', claseRiC('lugar'), 'rico:Place');
igual('un año es un Date', claseRiC('anio'), 'rico:Date');
igual('un archivo es una Instantiation', CLASE_ARCHIVO, 'rico:Instantiation');
igual('lo que no sabemos qué es, no se supone', claseRiC('vecino'), null);
ok('toda clase declara ruta y clase RiC',
   Object.values(CLASES).every(c => c.ruta && c.ric));

if (mal) { console.error(`\n${mal} caso(s) de identidad fallaron`); process.exit(1); }
console.log('41 casos de identidad y clases: todos pasan');
