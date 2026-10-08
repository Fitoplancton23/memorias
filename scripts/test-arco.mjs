import { arco, masAfuera, dentro, apilar, encimadas, ARCO } from '../src/lib/arco.js';

let fallos = 0;
const ok = (q, bien) => { if (!bien) { fallos++; console.log('FALLA  ' + q); } };

const caja = { x0: -300, x1: 300, y0: -150, y1: 150 };
const rango = { min: 1900, max: 2000 };

/* --- el orden cronológico se lee en la posición ------------------------- */
{
  const ms = [{ id: 'a', anio: 1900 }, { id: 'b', anio: 1950 }, { id: 'c', anio: 2000 }];
  const s = arco(caja, ms, rango);
  ok('la más vieja queda a la izquierda', s.get('a').x < s.get('b').x);
  ok('y la más nueva a la derecha', s.get('b').x < s.get('c').x);
  ok('todas por encima de la familia',
     ['a','b','c'].every(k => s.get(k).y < caja.y0));
  /* Si no arquea, es un renglón y no una línea de tiempo. */
  ok('la del medio arquea por encima de las puntas',
     s.get('b').y < s.get('a').y && s.get('b').y < s.get('c').y);
  ok('ninguna encima del bloque', dentro(caja, s).length === 0);
}

/* --- LA regla: el lugar sale del año, no de quién más esté --------------- */
{
  const sola   = arco(caja, [{ id: 'b', anio: 1950 }], rango);
  const varias = arco(caja, [{ id: 'a', anio: 1912 }, { id: 'b', anio: 1950 },
                             { id: 'c', anio: 1988 }, { id: 'd', anio: 1999 }], rango);
  const p = sola.get('b'), q = varias.get('b');
  ok('una memoria no se corre porque aparezcan otras',
     Math.abs(p.x - q.x) < .001 && Math.abs(p.y - q.y) < .001);
}
{
  /* Y tampoco se corre porque cambie el foco, mientras la familia sea la misma:
     entre dos hermanos el bloque es idéntico, así que el arco también. */
  const unoU = arco(caja, [{ id: 'm', anio: 1963 }, { id: 'x', anio: 1970 }], rango);
  const otroU = arco(caja, [{ id: 'm', anio: 1963 }, { id: 'z', anio: 1930 }], rango);
  ok('ni porque cambie el foco dentro de la misma familia',
     Math.abs(unoU.get('m').x - otroU.get('m').x) < .001);
}

/* --- lo que no tiene fecha no entra al arco ----------------------------- */
{
  const s = arco(caja, [{ id: 'a', anio: 1950 }, { id: 's1', anio: null },
                        { id: 's2', anio: null }], rango);
  ok('las sin fecha van abajo', s.get('s1').y > caja.y1 && s.get('s2').y > caja.y1);
  ok('y no encima de la familia', dentro(caja, s).length === 0);
  ok('separadas entre sí',
     Math.abs(s.get('s1').x - s.get('s2').x) >= ARCO.SEPARACION - .001);
  ok('centradas sobre el bloque',
     Math.abs((s.get('s1').x + s.get('s2').x) / 2 - 0) < .001);
}

/* --- casos de borde ----------------------------------------------------- */
{
  ok('sin memorias, nada', arco(caja, [], rango).size === 0);
  ok('sin caja, nada', arco(null, [{ id: 'a', anio: 1950 }], rango).size === 0);
  const unAnio = arco(caja, [{ id: 'a', anio: 1950 }], { min: 1950, max: 1950 });
  ok('con un solo año en el archivo, no explota y queda arriba',
     unAnio.get('a').y < caja.y0);
  ok('ni con el rango al revés o ausente',
     arco(caja, [{ id: 'a', anio: 1950 }], null).size === 1
     && dentro(caja, arco(caja, [{ id: 'a', anio: 1950 }], null)).length === 0);
  const fuera = arco(caja, [{ id: 'a', anio: 1500 }, { id: 'b', anio: 2500 }], rango);
  ok('un año fuera del rango se recorta a los extremos, no se va de la banda',
     fuera.get('a').x < 0 && fuera.get('b').x > 0 && dentro(caja, fuera).length === 0);
  ok('la banda no es más ancha que la familia',
     Math.abs(fuera.get('a').x) < (caja.x1 - caja.x0) / 2
     && Math.abs(fuera.get('b').x) < (caja.x1 - caja.x0) / 2);
  /* Dos memorias del mismo año caen en el mismo punto: las separa apilar(). */
  const mismo = arco(caja, [{ id: 'a', anio: 1950 }, { id: 'b', anio: 1950 }], rango);
  ok('dos del mismo año caen en la misma columna',
     Math.abs(mismo.get('a').x - mismo.get('b').x) < .001);
}

/* --- el lugar cuelga de la memoria, un paso más afuera ------------------ */
{
  const s = arco(caja, [{ id: 'a', anio: 1950 }], rango);
  const m = s.get('a');
  const l = masAfuera(caja, m);
  ok('el lugar queda más afuera que su memoria', l.y < m.y);
  ok('y en la misma columna, para que se lea que cuelga de ella',
     Math.abs(l.x - m.x) < .001);
}

/* --- el invariante, con cajas y archivos al azar ------------------------ */
{
  let encima = 0, inestables = 0;
  for (let v = 0; v < 500; v++) {
    const c = { x0: -600 + Math.random() * 400, x1: 100 + Math.random() * 600,
                y0: -400 + Math.random() * 300, y1: 100 + Math.random() * 400 };
    const r = { min: 1880 + Math.floor(Math.random() * 40),
                max: 1980 + Math.floor(Math.random() * 50) };
    const ms = Array.from({ length: 1 + Math.floor(Math.random() * 12) }, (_, i) => ({
      id: i,
      anio: Math.random() < .2 ? null
        : r.min + Math.floor(Math.random() * (r.max - r.min + 1)),
    }));
    const s = arco(c, ms, r);
    if (dentro(c, s).length) encima++;
    /* Sacar una memoria no corre a las del arco. Las de abajo sí se recentran
       —están centradas sobre el bloque— y por eso se miran aparte. */
    const conFecha = new Set(ms.filter(m => m.anio != null).map(m => m.id));
    const menos = arco(c, ms.slice(1), r);
    for (const [k, p] of menos)
      if (conFecha.has(k) && Math.abs(p.x - s.get(k).x) > .001) { inestables++; break; }
  }
  ok(`ninguna queda encima de la familia (${encima} fallas en 500)`, encima === 0);
  ok(`las del arco no se mueven al sacar otra (${inestables} fallas en 500)`, inestables === 0);
}

/* --- apilar: ninguna pastilla debajo de otra ---------------------------- */
{
  const ms = [{ id: 'a', anio: 1950 }, { id: 'b', anio: 1950 }, { id: 'c', anio: 1951 }];
  const s = arco(caja, ms, rango);
  const anchos = new Map([['a', 200], ['b', 200], ['c', 200]]);
  const xs = new Map([...s].map(([k, p]) => [k, p.x]));
  ok('antes de apilar hay encimadas', encimadas(s, anchos).length > 0);
  const filas = apilar(s, anchos);
  ok('sube a alguna de renglón', filas > 0);
  ok('después no queda ninguna encimada', encimadas(s, anchos).length === 0);
  ok('y ninguna cambió de columna: la X es el año',
     [...xs].every(([k, x]) => Math.abs(s.get(k).x - x) < .001));
}
{
  const s = arco(caja, [{ id: 'sola', anio: 1950 }], rango);
  const antes = s.get('sola').y;
  apilar(s, new Map([['sola', 200]]));
  ok('una sola no se mueve de renglón', s.get('sola').y === antes);
}
{
  /* Determinístico: el mismo conjunto da siempre el mismo dibujo. */
  const arma = () => {
    const ms = [{ id: 'x', anio: 1930 }, { id: 'y', anio: 1932 }, { id: 'z', anio: 1934 },
                { id: 'w', anio: 1970 }];
    const s = arco(caja, ms, rango);
    apilar(s, new Map(ms.map(m => [m.id, 180])));
    return [...s].map(([k, p]) => `${k}:${p.x.toFixed(2)},${p.y.toFixed(2)}`).join('|');
  };
  ok('el apilado es determinístico', arma() === arma());
}
{
  /* Con muchas y anchas, igual no queda ninguna tapada. */
  let mal = 0;
  for (let v = 0; v < 300; v++) {
    const ms = Array.from({ length: 2 + Math.floor(Math.random() * 10) }, (_, i) => ({
      id: i, anio: rango.min + Math.floor(Math.random() * (rango.max - rango.min + 1)),
    }));
    const s = arco(caja, ms, rango);
    const anchos = new Map(ms.map(m => [m.id, 120 + Math.floor(Math.random() * 160)]));
    apilar(s, anchos);
    if (encimadas(s, anchos).length) mal++;
  }
  ok(`nunca queda una pastilla debajo de otra (${mal} fallas en 300)`, mal === 0);
}

if (fallos) { console.log(`${fallos} caso(s) fallan`); process.exit(1); }
console.log('29 casos de banda cronológica + 800 al azar: todos pasan');
