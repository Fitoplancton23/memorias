import { leerTraza, largoEnMetros, medioDelRecorrido, puntoDeReferencia, esRecorrido }
  from '../src/lib/traza.js';

let mal = 0;
const ok = (q, c, extra = '') => { if (!c) { mal++; console.error(`  ✗ ${q} ${extra}`); } };
const igual = (q, dio, esp) => {
  const a = JSON.stringify(dio), b = JSON.stringify(esp);
  if (a !== b) { mal++; console.error(`  ✗ ${q}\n      dio ${a}\n      esperaba ${b}`); }
};
const cerca = (q, dio, esp, tol) => ok(q, Math.abs(dio - esp) <= tol,
  `(dio ${dio}, esperaba ${esp} ± ${tol})`);

/* La picada Propaganda de verdad, tal como la pasó Facundo: arranca, dobla
   en el medio y sigue. Es el caso que motivó todo esto. */
const PROPAGANDA = [
  { lat: -27.122682402858903, lng: -54.90551406892457 },
  { lat: -27.127538257357372, lng: -54.8960975456549 },
  { lat: -27.13419440942794,  lng: -54.890645203146335 },
];

/* ---------- leer ---------- */
igual('tres pares de texto', leerTraza('-27.1226,-54.9055; -27.1275,-54.8960; -27.1341,-54.8906'),
      [{ lat: -27.1226, lng: -54.9055 }, { lat: -27.1275, lng: -54.896 }, { lat: -27.1341, lng: -54.8906 }]);
igual('JSON de pares', leerTraza('[[-27.1,-54.9],[-27.2,-54.8]]'),
      [{ lat: -27.1, lng: -54.9 }, { lat: -27.2, lng: -54.8 }]);
igual('lista de objetos', leerTraza([{ lat: -27.1, lng: -54.9 }, { lat: -27.2, lng: -54.8 }]),
      [{ lat: -27.1, lng: -54.9 }, { lat: -27.2, lng: -54.8 }]);
igual('vacío', leerTraza(''), []);
igual('nulo', leerTraza(null), []);
igual('JSON roto no rompe el build', leerTraza('[[-27.1,'), []);

/* Un solo punto NO es un recorrido: para eso está la coordenada del lugar. */
igual('un punto solo no es traza', leerTraza('-27.1,-54.9'), []);
igual('ni en JSON', leerTraza('[[-27.1,-54.9]]'), []);
igual('dos puntos iguales tampoco', leerTraza('-27.1,-54.9; -27.1,-54.9'), []);

/* Lo que no es un punto de la tierra se descarta, no se dibuja. Ojo con lo
   que esto NO atrapa, y está bien que no: un par escrito al revés
   —«-54.9,-27.1»— son dos números perfectamente válidos (hay latitud -54.9,
   en el mar del sur), así que no hay forma de distinguirlo acá adentro sin
   suponer en qué parte del mundo está el archivo. Eso lo avisa el build,
   que sí sabe dónde cae el mapa. */
igual('una latitud imposible se descarta',
      leerTraza('-127.1,-54.9; -27.1,-54.9; -27.2,-54.8'),
      [{ lat: -27.1, lng: -54.9 }, { lat: -27.2, lng: -54.8 }]);
igual('y una longitud imposible también',
      leerTraza('-27.1,-254.9; -27.1,-54.9; -27.2,-54.8'),
      [{ lat: -27.1, lng: -54.9 }, { lat: -27.2, lng: -54.8 }]);
igual('una coma de más no arrastra basura',
      leerTraza('-27.1,-54.9; ,; -27.2,-54.8'),
      [{ lat: -27.1, lng: -54.9 }, { lat: -27.2, lng: -54.8 }]);
igual('texto donde va un número', leerTraza('-27.1,-54.9; cerca del arroyo; -27.2,-54.8'),
      [{ lat: -27.1, lng: -54.9 }, { lat: -27.2, lng: -54.8 }]);

/* ---------- el largo ---------- */
{
  /* Un grado de latitud son ~111,32 km. */
  cerca('un grado de latitud', largoEnMetros([{ lat: 0, lng: 0 }, { lat: 1, lng: 0 }]), 111320, 10);
  /* Un grado de longitud a 27° sur mide bastante menos. Si esto no se
     corrigiera, una picada que va al este saldría un 11% más corta. */
  cerca('un grado de longitud a 27° sur',
        largoEnMetros([{ lat: -27, lng: 0 }, { lat: -27, lng: 1 }]), 111320 * Math.cos(27 * Math.PI / 180), 10);
  ok('la picada Propaganda mide entre 1,5 y 2,5 km',
     largoEnMetros(PROPAGANDA) > 1500 && largoEnMetros(PROPAGANDA) < 2500,
     `(${Math.round(largoEnMetros(PROPAGANDA))} m)`);
  igual('un solo punto no tiene largo', largoEnMetros([{ lat: -27, lng: -54 }]), 0);
}

/* ---------- el medio del recorrido ----------
   La prueba que importa: en una ele, el vértice NO es el medio. */
{
  const ele = [{ lat: 0, lng: 0 }, { lat: 1, lng: 0 }, { lat: 1, lng: 3 / Math.cos(0) }];
  const m = medioDelRecorrido(ele);
  ok('en una ele el medio no es el vértice', !(m.lat === 1 && m.lng === 0),
     `(dio ${JSON.stringify(m)})`);
  /* Con un tramo de 1 grado y otro de 3, la mitad del largo cae en el
     segundo tramo, no en el codo. */
  ok('y cae en el tramo largo', m.lat === 1 && m.lng > 0, `(dio ${JSON.stringify(m)})`);

  const recta = [{ lat: 0, lng: 0 }, { lat: 2, lng: 0 }];
  const r = medioDelRecorrido(recta);
  cerca('en una recta el medio es el medio', r.lat, 1, 1e-9);

  /* Y deja la misma distancia para cada lado: la definición, verificada. */
  for (const [q, p] of [['la ele', ele], ['la Propaganda', PROPAGANDA]]) {
    const medio = medioDelRecorrido(p);
    const hasta = [];
    let corte = 0;
    for (let i = 1; i < p.length; i++) {
      const anterior = largoEnMetros(p.slice(0, i + 1));
      if (anterior >= largoEnMetros(p) / 2) { corte = i; break; }
    }
    const antes = largoEnMetros([...p.slice(0, corte), medio]);
    const despues = largoEnMetros([medio, ...p.slice(corte)]);
    ok(`${q}: el medio deja lo mismo para cada lado`,
       Math.abs(antes - despues) < 1, `(${Math.round(antes)} m vs ${Math.round(despues)} m)`);
    hasta.push(antes);
  }
  igual('sin traza no hay medio', medioDelRecorrido([]), null);
  igual('ni con un punto', medioDelRecorrido([{ lat: -27, lng: -54 }]), null);
}

/* ---------- la coordenada guardada manda ----------
   Un marcador no se mueve solo, y eso vale también cuando aparece una traza. */
{
  const conPunto = { lat: -27.1, lng: -54.9, traza: PROPAGANDA };
  igual('con coordenada propia, se respeta',
        puntoDeReferencia(conPunto), { lat: -27.1, lng: -54.9, deLaTraza: false });

  const sinPunto = { lat: null, lng: null, traza: PROPAGANDA };
  const p = puntoDeReferencia(sinPunto);
  ok('sin coordenada, sale del medio de la traza', p && p.deLaTraza === true);
  ok('y cae adentro del recorrido',
     p.lat < PROPAGANDA[0].lat && p.lat > PROPAGANDA[2].lat, `(${p.lat})`);

  igual('sin nada, no hay dónde ponerlo', puntoDeReferencia({ lat: null, lng: null }), null);
  igual('un lugar nulo tampoco', puntoDeReferencia(null), null);
}

/* ---------- qué es un recorrido ---------- */
ok('la picada lo es', esRecorrido({ traza: PROPAGANDA }));
ok('la escuela no', !esRecorrido({ lat: -27.1, lng: -54.9 }));
ok('ni un lugar con un punto suelto en la traza', !esRecorrido({ traza: '-27.1,-54.9' }));

if (mal) { console.error(`\n${mal} caso(s) de traza fallaron`); process.exit(1); }
console.log('33 casos de lugares con recorrido: todos pasan');
