import { esLectura, aParametros, destino, conviene } from '../src/lib/retomar.js';

let mal = 0;
const ok = (q, dio, esperado) => {
  const a = JSON.stringify(dio), b = JSON.stringify(esperado);
  if (a !== b) { mal++; console.error(`  ✗ ${q}\n      dio ${a}\n      esperaba ${b}`); }
};

/* --- qué visita es una lectura y cuál es una parada del camino --- */
ok('sin parámetros es lectura', esLectura(''), true);
ok('con ? vacío es lectura', esLectura('?'), true);
ok('llegar por apellido NO es lectura', esLectura('?apellido=Jutkowski'), false);
ok('llegar por década NO es lectura', esLectura('?decada=1940'), false);
ok('llegar por lugar NO es lectura', esLectura('?lugar=escuela-normal'), false);
ok('llegar buscando NO es lectura', esLectura('?q=baile'), false);
ok('llegar a una memoria NO es lectura', esLectura('?ver=acto-escolar'), false);
ok('un parámetro ajeno no molesta', esLectura('?utm_source=whatsapp'), true);
ok('vacío explícito es lectura', esLectura('?apellido='), true);

/* --- la dirección a la que vuelve --- */
ok('sin nada vuelve a la línea entera', destino({}), '/memorias/');
ok('sin estado vuelve a la línea entera', destino(null), '/memorias/');
ok('con un apellido elegido a mano',
   destino({ filtros: { apellido: 'Jutkowski' } }), '/memorias/?apellido=Jutkowski');
ok('con filtro y búsqueda',
   destino({ filtros: { decada: '1940' }, q: 'baile' }), '/memorias/?decada=1940&q=baile');
ok('los filtros van siempre en el mismo orden',
   destino({ filtros: { lugar: 'escuela', apellido: 'Muller', decada: '1950' } }),
   '/memorias/?decada=1950&apellido=Muller&lugar=escuela');
ok('un filtro vacío no viaja', destino({ filtros: { apellido: '' }, q: '' }), '/memorias/');

/* --- cuándo se ofrece --- */
ok('sin nada guardado no se ofrece', conviene(null, { enLaLinea: true }), false);
ok('fuera de la línea, siempre se ofrece',
   conviene({ filtros: {} }, { enLaLinea: false, filtros: {} }), true);
ok('en la línea y mirando lo mismo, no se ofrece',
   conviene({ filtros: { apellido: 'Muller' } },
            { enLaLinea: true, filtros: { apellido: 'Muller' } }), false);
ok('en la línea pero filtrada por otra cosa, se ofrece',
   conviene({ filtros: {} }, { enLaLinea: true, filtros: { apellido: 'Jutkowski' } }), true);
ok('en la línea entera con una lectura filtrada guardada, se ofrece',
   conviene({ filtros: { apellido: 'Muller' } }, { enLaLinea: true, filtros: {} }), true);
ok('la búsqueda escrita también distingue',
   conviene({ filtros: {}, q: '' }, { enLaLinea: true, filtros: {}, q: 'baile' }), true);
ok('sin actual, se ofrece', conviene({ filtros: {} }, null), true);

/* --- el caso que motivó todo esto, entero ---
   Leyendo la línea de tiempo sin filtros → una memoria → una persona →
   /memorias/?apellido=Jutkowski. Desde ahí el botón tiene que volver a la
   línea entera, y la parada no tiene que haber pisado la lectura. */
{
  const lectura = { filtros: {}, q: '', y: 2480 };
  const parada = '?apellido=Jutkowski';
  ok('la parada no se guarda como lectura', esLectura(parada), false);
  ok('desde la parada se ofrece volver',
     conviene(lectura, { enLaLinea: true, filtros: { apellido: 'Jutkowski' } }), true);
  ok('y vuelve a la línea entera', destino(lectura), '/memorias/');
}

if (mal) { console.error(`\n${mal} caso(s) de retomar fallaron`); process.exit(1); }
console.log('24 casos de retomar la lectura: todos pasan');
