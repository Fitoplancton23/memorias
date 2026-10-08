import { despejar, tapados, MARGEN } from '../src/lib/despejar.js';

let fallos = 0;
const ok = (q, bien) => { if (!bien) { fallos++; console.log('FALLA  ' + q); } };

const caja = { x0: -200, x1: 200, y0: -100, y1: 100 };

/* --- lo que está afuera no se toca --------------------------------------- */
{
  const fuera = [
    { id: 'a', x: -1000, y: 0 }, { id: 'b', x: 1000, y: 0 },
    { id: 'c', x: 0, y: -1000 }, { id: 'd', x: 0, y: 1000 },
    { id: 'e', x: 0, y: -(100 + MARGEN) },   /* justo en el borde: afuera */
  ];
  const copia = fuera.map(n => ({ ...n }));
  ok('no mueve a los que ya estaban afuera', despejar(caja, fuera) === 0);
  ok('y quedan idénticos', fuera.every((n, i) => n.x === copia[i].x && n.y === copia[i].y));
}

/* --- lo tapado sale, y sale lo mínimo ------------------------------------ */
{
  const dentro = [{ id: 'arriba', x: 0, y: -50 }, { id: 'abajo', x: 0, y: 60 }];
  ok('mueve a los dos tapados', despejar(caja, dentro) === 2);
  ok('el de arriba sale por arriba', dentro[0].y === caja.y0 - MARGEN);
  ok('el de abajo sale por abajo', dentro[1].y === caja.y1 + MARGEN);
  ok('ninguno cambia de columna', dentro.every(n => n.x === 0));
  ok('no queda nadie tapado', tapados(caja, dentro).length === 0);
}

/* --- la gente de la grilla está fija y no se corre ------------------------ */
{
  const g = [{ id: 'p', x: 0, y: 0, fijo: true }];
  ok('no toca a quien está en la grilla', despejar(caja, g) === 0 && g[0].y === 0);
  ok('ni lo cuenta como tapado', tapados(caja, g).length === 0);
}

/* --- el invariante, con mil configuraciones al azar ---------------------- */
{
  let peor = 0, movidosTotal = 0, quietos = 0;
  for (let v = 0; v < 1000; v++) {
    const c = { x0: -300 + Math.random() * 100, x1: 100 + Math.random() * 400,
                y0: -200 + Math.random() * 80, y1: 80 + Math.random() * 300 };
    const ns = Array.from({ length: 60 }, (_, i) => ({
      id: i, x: (Math.random() - .5) * 1600, y: (Math.random() - .5) * 1200,
    }));
    const antes = ns.map(n => ({ ...n }));
    const m = despejar(c, ns);
    movidosTotal += m;
    if (tapados(c, ns).length) peor++;
    /* Nadie que ya estaba afuera se movió. */
    for (let i = 0; i < ns.length; i++) {
      const a = antes[i];
      const fuera = a.x <= c.x0 - MARGEN || a.x >= c.x1 + MARGEN
                 || a.y <= c.y0 - MARGEN || a.y >= c.y1 + MARGEN;
      if (fuera && (ns[i].x !== a.x || ns[i].y !== a.y)) quietos++;
    }
  }
  ok(`nunca queda nadie tapado (${peor} fallas en 1000)`, peor === 0);
  ok(`nadie que estaba afuera se movió (${quietos} movidos de más)`, quietos === 0);
  ok('y hubo trabajo que hacer', movidosTotal > 0);
}

if (fallos) { console.log(`${fallos} caso(s) fallan`); process.exit(1); }
console.log('12 casos de despeje + 1000 al azar: todos pasan');
