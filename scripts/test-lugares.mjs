import { lugaresDeMemoria, DONDE_OCURRIO } from '../src/lib/lugares.js';

let mal = 0;
const igual = (q, dio, esp) => {
  const a = JSON.stringify(dio), b = JSON.stringify(esp);
  if (a !== b) { mal++; console.error(`  ✗ ${q}\n      dio ${a}\n      esperaba ${b}`); }
};
const NOMBRES = { l1: 'escuela-normal', l2: 'plaza-libertad', l3: 'avenida-san-martin', l4: 'puente' };
const slugDe = id => NOMBRES[id] || '';
const m = { id: 'm1', lugar_id: 'l1' };
const v = (lugar_id, extra = {}) => ({ memoria_id: 'm1', lugar_id, ...extra });

/* --- el caso de todos los días: una memoria, un lugar, y ninguna tabla --- */
igual('sin vínculos, el lugar de siempre', lugaresDeMemoria(m, [], slugDe), ['escuela-normal']);
igual('sin la tabla siquiera', lugaresDeMemoria(m, undefined, slugDe), ['escuela-normal']);
igual('sin lugar no hay lugares', lugaresDeMemoria({ id: 'm1', lugar_id: null }, [], slugDe), []);
igual('memoria nula', lugaresDeMemoria(null, [], slugDe), []);

/* --- el desfile --- */
igual('el principal va primero, siempre',
      lugaresDeMemoria(m, [v('l2', { orden: 0 }), v('l3', { orden: 1 })], slugDe),
      ['escuela-normal', 'plaza-libertad', 'avenida-san-martin']);
igual('y el orden del recorrido se respeta',
      lugaresDeMemoria(m, [v('l3', { orden: 1 }), v('l2', { orden: 0 })], slugDe),
      ['escuela-normal', 'plaza-libertad', 'avenida-san-martin']);
igual('a igual orden, como vinieron (nunca alfabético)',
      lugaresDeMemoria(m, [v('l3'), v('l2')], slugDe),
      ['escuela-normal', 'avenida-san-martin', 'plaza-libertad']);

/* --- lo que se ve no es donde ocurrió --- */
igual('un lugar que apenas se ve no entra',
      lugaresDeMemoria(m, [v('l4', { relacion: 'se_ve' })], slugDe), ['escuela-normal']);
igual('ni uno al que la memoria se refiere',
      lugaresDeMemoria(m, [v('l4', { relacion: 'se_refiere_a' })], slugDe), ['escuela-normal']);
igual('sin relación escrita se asume donde ocurrió',
      lugaresDeMemoria(m, [v('l2', { relacion: null })], slugDe),
      ['escuela-normal', 'plaza-libertad']);
igual('y se mezcla bien con los que sí',
      lugaresDeMemoria(m, [v('l4', { relacion: 'se_ve', orden: 0 }), v('l2', { orden: 1 })], slugDe),
      ['escuela-normal', 'plaza-libertad']);

/* --- no se cuela nada de otra memoria --- */
igual('los vínculos de otra memoria no son de ésta',
      lugaresDeMemoria(m, [{ memoria_id: 'm2', lugar_id: 'l2' }], slugDe), ['escuela-normal']);
igual('ni una fila rota', lugaresDeMemoria(m, [null, undefined, {}], slugDe), ['escuela-normal']);

/* --- sin repetir --- */
igual('el principal repetido en la tabla no se duplica',
      lugaresDeMemoria(m, [v('l1'), v('l2')], slugDe), ['escuela-normal', 'plaza-libertad']);
igual('ni dos vínculos al mismo lugar',
      lugaresDeMemoria(m, [v('l2'), v('l2', { orden: 2 })], slugDe),
      ['escuela-normal', 'plaza-libertad']);

/* --- un lugar que el sitio no tiene (sin aprobar, de demo) no se nombra --- */
igual('un lugar que no está, no se inventa',
      lugaresDeMemoria(m, [v('desconocido')], slugDe), ['escuela-normal']);

igual('la relación por defecto es donde ocurrió', DONDE_OCURRIO, 'ocurrio_en');

if (mal) { console.error(`\n${mal} caso(s) de lugares fallaron`); process.exit(1); }
console.log('18 casos de lugares por memoria: todos pasan');
