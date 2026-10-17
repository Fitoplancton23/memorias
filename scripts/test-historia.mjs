import { componer, bloque, renglones, comoSeLeeLaFecha, ANCHO, ALTO, ZONA_SEGURA, CAJA }
  from '../src/lib/historia.js';

/* La zona que tapa Instagram se escribe ACÁ con su número, y no se importa
   del módulo. Importándola, achicar la constante hacía pasar la prueba: el
   test medía contra la misma decisión que estaba verificando. Pasó de verdad,
   rompiendo el módulo a propósito. 250 px sobre 1920 es lo que indica la guía
   de Instagram; el módulo puede reservar más, nunca menos. */
const TAPADO = 250;

let mal = 0;
const ok = (q, cond, extra = '') => { if (!cond) { mal++; console.error(`  ✗ ${q} ${extra}`); } };
const igual = (q, dio, esp) => ok(q, JSON.stringify(dio) === JSON.stringify(esp),
  `\n      dio ${JSON.stringify(dio)}\n      esperaba ${JSON.stringify(esp)}`);

/* Una medición sintética: ancho proporcional al largo. No imita a ninguna
   tipografía y no hace falta que lo haga — lo que se prueba es la
   composición, no la métrica de Figtree. */
const medir = (t, tam) => t.length * tam * 0.52;
const comp = (m, o) => componer(m, medir, { parajes: 'Aristóbulo del Valle · Salto Encantado',
                                            enlace: 'memorias.pages.dev', ...o });

const COMPLETA = { titulo: 'Acto escolar en la Escuela Normal',
                   fecha: { ref: 1948, precision: 'anio' },
                   lugar: 'Escuela Normal', foto: { ancho: 1600, alto: 1100 } };

/* ---------- 1. nada queda donde Instagram dibuja su interfaz ---------- */
const casos = [
  ['completa', COMPLETA],
  ['sin fecha', { ...COMPLETA, fecha: null }],
  ['sin lugar', { ...COMPLETA, lugar: '' }],
  ['sin foto', { ...COMPLETA, foto: null }],
  ['pelada', { titulo: 'Grupo familiar' }],
  ['foto vertical', { ...COMPLETA, foto: { ancho: 900, alto: 1600 } }],
  ['foto cuadrada', { ...COMPLETA, foto: { ancho: 1200, alto: 1200 } }],
  ['foto panorámica', { ...COMPLETA, foto: { ancho: 2400, alto: 700 } }],
  ['título largo', { ...COMPLETA, titulo: 'Inauguración del puente sobre el arroyo Cuña Pirú con la presencia de autoridades provinciales y vecinos de los parajes' }],
  ['título larguísimo', { ...COMPLETA, titulo: 'x '.repeat(400) }],
  ['lugar largo', { ...COMPLETA, lugar: 'Paraje Cerro Moreno, camino viejo a Salto Encantado, a la altura del kilómetro doce' }],
];
for (const [q, m] of casos) {
  const c = comp(m);
  for (const b of c.bloques) {
    ok(`${q}: «${b.tipo}» no entra en la zona de arriba`, b.y >= TAPADO, `(y=${Math.round(b.y)})`);
    ok(`${q}: «${b.tipo}» no entra en la zona de abajo`, b.y + b.alto <= ALTO - TAPADO,
       `(fondo=${Math.round(b.y + b.alto)})`);
    ok(`${q}: «${b.tipo}» no se sale de costado`,
       b.x >= CAJA.x - 1 && b.x + b.ancho <= CAJA.x + CAJA.ancho + 1);
  }
  /* ---------- 2. nada se encima con nada ---------- */
  const bs = [...c.bloques].sort((a, b) => a.y - b.y);
  for (let i = 1; i < bs.length; i++)
    ok(`${q}: «${bs[i].tipo}» se encima con «${bs[i - 1].tipo}»`,
       bs[i].y >= bs[i - 1].y + bs[i - 1].alto - 1,
       `(${Math.round(bs[i - 1].y + bs[i - 1].alto)} > ${Math.round(bs[i].y)})`);
}

/* ---------- 3. la foto nunca se deforma ---------- */
for (const [q, m] of casos) {
  const f = bloque(comp(m), 'foto');
  if (!f || !m.foto) continue;
  const original = m.foto.ancho / m.foto.alto, dibujada = f.ancho / f.alto;
  ok(`${q}: la foto conserva su proporción`, Math.abs(original - dibujada) / original < 0.01,
     `(${original.toFixed(3)} → ${dibujada.toFixed(3)})`);
  ok(`${q}: la foto entra entera`, f.ancho <= CAJA.ancho + 1);
}

/* ---------- 4. lo que falta no ocupa lugar, y no se inventa ---------- */
{
  const c = comp({ ...COMPLETA, fecha: null });
  ok('sin fecha no hay sobretítulo', !bloque(c, 'sobretitulo'));
  const c2 = comp({ ...COMPLETA, lugar: '   ' });
  ok('un lugar en blanco no es un lugar', !bloque(c2, 'lugar'));
  const c3 = comp({ ...COMPLETA, foto: null });
  ok('sin foto no hay bloque de foto', !bloque(c3, 'foto'));
  const texto = JSON.stringify(comp({ titulo: 'Grupo familiar' })).toLowerCase();
  for (const palabra of ['pendiente', 'sin fecha', 'desconocid', 'null', 'undefined'])
    ok(`una memoria pelada no dice «${palabra}»`, !texto.includes(palabra));
  ok('una fecha desconocida no se lee', comoSeLeeLaFecha({ ref: null }) === '');
  ok('una década se lee como década', comoSeLeeLaFecha({ ref: 1947, precision: 'decada' }) === 'Década de 1940');
  ok('un circa se lee como aproximado', comoSeLeeLaFecha({ ref: 1960, precision: 'circa' }) === 'Aprox. 1960');
}

/* ---------- 5. el título se achica antes de cortarse ---------- */
{
  const corto = bloque(comp(COMPLETA), 'titulo');
  const largo = bloque(comp({ ...COMPLETA, titulo: 'Inauguración del puente sobre el arroyo Cuña Pirú con la presencia de autoridades provinciales y vecinos de los parajes' }), 'titulo');
  ok('un título largo se achica', largo.tam < corto.tam, `(${corto.tam} → ${largo.tam})`);
  ok('pero no se corta si entra', !largo.lineas.join(' ').includes('…'));
  ok('y nunca pasa de cuatro renglones', largo.lineas.length <= 4);
  for (const l of largo.lineas)
    ok(`el renglón «${l.slice(0, 20)}…» entra en la caja`, medir(l, largo.tam) <= CAJA.ancho + 0.5);

  const imposible = bloque(comp({ ...COMPLETA, titulo: 'x '.repeat(400) }), 'titulo');
  ok('lo que no entra ni achicado se corta', imposible.lineas.join('').includes('…'));
  ok('y se corta en el cuerpo más chico, no en el grande', imposible.tam === 42);
}

/* ---------- 6. la foto cede antes que el texto ---------- */
{
  const c = comp({ ...COMPLETA, titulo: 'Inauguración del puente sobre el arroyo Cuña Pirú con la presencia de autoridades provinciales y vecinos de todos los parajes del municipio' });
  ok('con un título enorme la foto se achica o se va, pero el título queda',
     !!bloque(c, 'titulo'));
  const f = bloque(c, 'foto');
  if (f) ok('y si queda, sigue dentro de la zona segura', f.y >= TAPADO);
}

/* ---------- 6 bis. sin foto no queda media pantalla en blanco ----------
   La primera versión dejaba el texto pegado al pie y arriba un vacío de
   novecientos píxeles. No lo encontró ningún test: lo encontró mirar la
   imagen. Ahora el texto se centra, y esto lo vigila. */
for (const [q, m] of [['sin foto', { ...COMPLETA, foto: null }],
                      ['pelada', { titulo: 'Procesión' }],
                      ['sin foto ni fecha', { titulo: 'Procesión', lugar: 'Capilla vieja' }]]) {
  const c = comp(m);
  const marca = bloque(c, 'marca'), pie = bloque(c, 'pie');
  const texto = c.bloques.filter(b => ['sobretitulo', 'titulo', 'lugar'].includes(b.tipo));
  const arriba = Math.min(...texto.map(b => b.y)) - (marca.y + marca.alto);
  const abajo = pie.y - Math.max(...texto.map(b => b.y + b.alto));
  ok(`${q}: el texto no queda tirado contra un borde`,
     Math.max(arriba, abajo) <= Math.min(arriba, abajo) * 1.6 + 40,
     `(arriba ${Math.round(arriba)}, abajo ${Math.round(abajo)})`);
  ok(`${q}: y el título crece al ser lo único`, bloque(c, 'titulo').tam > 68,
     `(${bloque(c, 'titulo').tam})`);
}

/* Ni con el título más largo que la composición admite la foto queda
   convertida en una franja. El módulo igual tiene la red —si no le queda
   lugar, rehace la composición sin foto—, pero esa red hoy no se usa nunca y
   eso es lo que se verifica acá: el día que alguien suba el máximo de
   renglones del título, este caso avisa antes que la pantalla. */
{
  const apretada = comp({ titulo: 'palabra '.repeat(60),
                          fecha: { ref: 1948, precision: 'anio' }, lugar: 'Arroyo Cuña Pirú',
                          foto: { ancho: 2400, alto: 700 } });
  const f = bloque(apretada, 'foto');
  ok('con el título más largo posible la foto sigue entrando', !!f);
  const vertical = comp({ titulo: 'palabra '.repeat(60),
                          fecha: { ref: 1948, precision: 'anio' }, lugar: 'Arroyo Cuña Pirú',
                          foto: { ancho: 900, alto: 1600 } });
  const fv = bloque(vertical, 'foto');
  ok('y le queda alto de sobra, no una franja', fv && fv.alto >= 420,
     fv ? `(alto ${fv.alto})` : '(sin foto)');
}

/* ---------- 6 ter. el aire sobrante se reparte, no se amontona ----------
   Con una foto apaisada el sobrante quedaba TODO arriba —cuatrocientos
   píxeles de papel en blanco debajo de la firma— y la historia parecía
   empezar por la mitad. Tampoco lo encontró un test: lo encontró la imagen. */
for (const [q, m] of [['apaisada', { ...COMPLETA, foto: { ancho: 2400, alto: 700 } }],
                      ['cuadrada', { ...COMPLETA, foto: { ancho: 1200, alto: 1200 } }],
                      ['vertical', { ...COMPLETA, foto: { ancho: 900, alto: 1600 } }],
                      ['chiquita', { ...COMPLETA, foto: { ancho: 350, alto: 260 } }]]) {
  const c = comp(m);
  const marca = bloque(c, 'marca'), pie = bloque(c, 'pie');
  const cuerpo = c.bloques.filter(b => !['marca', 'pie'].includes(b.tipo));
  const arriba = Math.min(...cuerpo.map(b => b.y)) - (marca.y + marca.alto);
  const abajo = pie.y - Math.max(...cuerpo.map(b => b.y + b.alto));
  ok(`${q}: el aire de arriba y el de abajo se parecen`,
     Math.abs(arriba - abajo) <= 60, `(arriba ${Math.round(arriba)}, abajo ${Math.round(abajo)})`);
}

/* ---------- 7. partir en renglones ---------- */
igual('una palabra sola', renglones('Memorias', 900, 68, medir, 4), ['Memorias']);
igual('una palabra más ancha que la caja no se parte', renglones('Mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm', 100, 68, medir, 4), null);
igual('texto vacío no da renglones', renglones('   ', 900, 68, medir, 4), []);
ok('más renglones de los permitidos se rechaza',
   renglones('uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece', 120, 40, medir, 2) === null);

/* ---------- 8. el tamaño del lienzo es el de una historia ---------- */
ok('1080 × 1920', ANCHO === 1080 && ALTO === 1920);
ok('la caja útil respeta las dos zonas', CAJA.y >= TAPADO && CAJA.y + CAJA.alto <= ALTO - TAPADO);
ok('y el módulo no reserva menos de lo que tapa Instagram', ZONA_SEGURA >= TAPADO, `(${ZONA_SEGURA})`);

if (mal) { console.error(`\n${mal} caso(s) de la historia fallaron`); process.exit(1); }
console.log('11 composiciones × 4 invariantes + 20 casos de historia: todos pasan');
