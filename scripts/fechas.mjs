/* Interpreta cómo escribe las fechas una persona real, no un formato inventado.
   Las cadenas soportadas salen del relevamiento del admin, no de una convención:
   "1966", "1960 aprox", "1967 Aprox", "1985/1986 Aprox", "07/10/2025",
   "pendiente", "déc. del 60", "1940-1948".
   Devuelve { desde, hasta, ref, precision, texto, aviso? }.
     desde/hasta = rango que la fecha podría abarcar
     ref         = el año que la persona efectivamente escribió (el que se archiva)
     precision   = dia | mes | anio | circa | decada | desconocida            */

const vacia = (texto, aviso) => ({ desde: null, hasta: null, ref: null, precision: 'desconocida', texto, aviso });

const SIN_DATO = /^(pendiente|queda pendiente|sin fecha|sin dato|desconocid[oa]|s\/f|s\/d|\?+|-+|n\/a)$/;

export function parseFecha(raw) {
  const original = (raw || '').trim();
  let s = original.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

  // "Año: 1966" / "Año 1966". El lookahead evita comerse la "s" de "años 60".
  s = s.replace(/^(?:a[nñ]o|fecha)\s*:?\s*(?=\d)/, '').trim();
  s = s.replace(/[.,;]+$/, '').trim();

  if (!s) return vacia('');
  if (SIN_DATO.test(s)) return vacia('');

  /* marca de aproximación, al principio o al final */
  let aprox = false;
  const antes = s;
  s = s.replace(/^(?:c\.|ca\.?|circa|aprox\.?|approx\.?|~)\s*/, '');
  s = s.replace(/\s*(?:aprox\.?|approx\.?|circa)$/, '');
  if (s !== antes) aprox = true;
  s = s.trim();

  const R = (desde, hasta, ref, precision, texto, aviso) => ({ desde, hasta, ref, precision, texto, aviso });
  let m;

  /* fecha completa ISO */
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)))
    return R(+m[1], +m[1], +m[1], aprox ? 'circa' : 'dia', `${m[3]}/${m[2]}/${m[1]}`);

  /* fecha completa en orden argentino: 07/10/2025 */
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {
    const [d, mes, a] = [+m[1], +m[2], +m[3]];
    if (d <= 31 && mes <= 12)
      return R(a, a, a, aprox ? 'circa' : 'dia', `${String(d).padStart(2,'0')}/${String(mes).padStart(2,'0')}/${a}`);
    return vacia(original, `Fecha con día o mes fuera de rango: "${original}"`);
  }

  if ((m = s.match(/^(\d{4})-(\d{2})$/)))
    return R(+m[1], +m[1], +m[1], aprox ? 'circa' : 'mes', `${m[2]}/${m[1]}`);

  /* rango de dos años completos: 1940-1948, 1985/1986 */
  if ((m = s.match(/^(\d{4})\s*[\/\-–a]\s*(\d{4})$/))) {
    const [a, b] = [+m[1], +m[2]];
    if (b < a) return vacia(original, `Rango invertido: "${original}"`);
    return R(a, b, a, aprox ? 'circa' : 'anio', `${a}–${b}`);
  }

  /* rango abreviado: 1985/86 */
  if ((m = s.match(/^(\d{4})\s*[\/\-–]\s*(\d{2})$/))) {
    const a = +m[1];
    const b = Math.floor(a / 100) * 100 + +m[2];
    const fin = b >= a ? b : b + 100;
    return R(a, fin, a, aprox ? 'circa' : 'anio', `${a}–${fin}`);
  }

  /* década: "déc. 1960", "1960s", "década del 60", "años 60" */
  if ((m = s.match(/^(?:dec\.?|decada|anos)\s*(?:de(?:l)?\s*)?(\d{4})$/)) || (m = s.match(/^(\d{4})s$/))) {
    const d = Math.floor(+m[1] / 10) * 10;
    return R(d, d + 9, d, 'decada', `déc. ${d}`);
  }
  if ((m = s.match(/^(?:dec\.?|decada|anos)\s*(?:de(?:l)?\s*)?(\d{2})$/))) {
    const dd = +m[1];
    const d = 1900 + Math.floor(dd / 10) * 10;
    return R(d, d + 9, d, 'decada', `déc. ${d}`,
      `Década de dos dígitos en "${original}": se asumió ${d}. Escribir el año completo si no es así.`);
  }

  /* año suelto */
  if ((m = s.match(/^(\d{4})$/))) {
    const a = +m[1];
    return aprox
      ? R(a - 5, a + 5, a, 'circa', `c. ${a}`)
      : R(a, a, a, 'anio', String(a));
  }

  return vacia(original, `Fecha no reconocida: "${original}"`);
}
