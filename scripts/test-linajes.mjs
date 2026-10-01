import { parseLinajes } from './linajes.mjs';
let fallos = 0;
const chequeo = (nombre, cond) => { if (!cond) { fallos++; console.log('FALLA  ' + nombre); } };

/* el ejemplo real, con el error de tipeo tal como vino */
const r = parseLinajes(
  'Luis Dinarte Silveira y Clementina Hermann. Hijos: Gerardo Isaac Silveira, Celina Silveira, Susana Silveira, Oscar Solveira, Roberto silveira.'
);
chequeo('7 personas', r.personas.length === 7);
chequeo('una unión', r.uniones.length === 1 && r.uniones[0].a === 'luis-dinarte-silveira');
chequeo('cinco filiaciones', r.filiaciones.length === 5);
chequeo('cada hijo tiene los dos padres', r.filiaciones.every(f => f.padres.length === 2));
chequeo('"Roberto silveira" normaliza a Roberto Silveira',
  r.personas.some(p => p.slug === 'roberto-silveira' && p.nombreCompleto === 'Roberto Silveira'));
chequeo('detecta el apellido sospechoso (Solveira)',
  r.avisos.some(a => a.includes('Solveira') && a.includes('Silveira')));
chequeo('apellido separado del nombre',
  r.personas.find(p => p.slug === 'gerardo-isaac-silveira')?.apellido === 'Silveira');

/* la misma persona nombrada en dos grupos es una sola: así se enhebran los linajes */
const r2 = parseLinajes([
  'Luis Dinarte Silveira y Clementina Hermann. Hijos: Gerardo Isaac Silveira, Celina Silveira',
  'Gerardo Isaac Silveira y Marta Kaiser. Hijos: Ana Silveira'
].join('\n'));
chequeo('Gerardo aparece una sola vez',
  r2.personas.filter(p => p.slug === 'gerardo-isaac-silveira').length === 1);
chequeo('Gerardo es hijo y padre a la vez',
  r2.filiaciones.some(f => f.hijo === 'gerardo-isaac-silveira') &&
  r2.filiaciones.some(f => f.padres.includes('gerardo-isaac-silveira')));

/* variantes de escritura */
chequeo('un solo progenitor', parseLinajes('Ramona Duarte. Hijos: Juan Duarte').filiaciones[0].padres.length === 1);
chequeo('pareja sin hijos cargados', parseLinajes('Pedro Lang y Eva Roth').uniones.length === 1);
chequeo('acepta "Hijas:"', parseLinajes('Pedro Lang y Eva Roth. Hijas: Eva Lang').filiaciones.length === 1);
chequeo('acepta sin tilde y en minúscula', parseLinajes('Pedro Lang y Eva Roth. hijos: Eva Lang').filiaciones.length === 1);
chequeo('partículas en minúscula',
  parseLinajes('Jose De La Cruz y Ana Paz').personas.some(p => p.nombreCompleto === 'Jose de la Cruz'));
chequeo('ignora comentarios', parseLinajes('# esto es un comentario\nPedro Lang y Eva Roth').personas.length === 2);
chequeo('avisa si alguien es padre e hijo en la misma línea',
  parseLinajes('Pedro Lang y Eva Roth. Hijos: Pedro Lang').avisos.some(a => a.includes('progenitor e hijo')));

console.log(fallos === 0 ? '17 casos de linajes: todos pasan' : `${fallos} caso(s) fallan`);
process.exit(fallos ? 1 : 0);
