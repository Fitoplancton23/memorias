-- 07_privacidad.sql — corrige el default de `vive`
--
-- En 06 quedó `vive boolean NOT NULL DEFAULT false`: "toda persona está
-- muerta salvo que alguien diga lo contrario". Con esa regla el sitio
-- publica fechas y notas de gente sobre la que nadie decidió nada. En la
-- demo eso eran 27 de 54 personas.
--
-- La regla correcta tiene TRES estados, no dos:
--     true   → vive. Se ocultan fechas y notas. Siempre.
--     false  → alguien verificó que falleció. Se publica.
--     null   → NO SE SABE. Y no saber no es lo mismo que saber que no.
--
-- Para el caso null se aplica la presunción de los 100 años, que es la
-- convención del oficio (la misma que usa FamilySearch): sin año de
-- fallecimiento, se presume viva si nació hace menos de 100 años, o si no
-- hay año de nacimiento. Eso deja el trabajo manual sólo en los casos
-- genuinamente ambiguos en vez de en todo el archivo.
--
-- La presunción se aplica en el build, no acá: la base guarda lo que se
-- sabe, y el sitio decide qué muestra. Si mañana la regla cambia a 110
-- años, no hay que volver a tocar ningún dato.

begin;

alter table personas alter column vive drop default;
alter table personas alter column vive drop not null;

-- Todos los valores actuales vienen del default de 06, no de una decisión
-- de nadie: se devuelven a "no se sabe". Esto es seguro HOY porque la
-- columna se creó hace minutos. No volver a correr esta línea después de
-- que alguien haya empezado a marcar personas.
update personas set vive = null where vive = false;

commit;

-- ---------------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------------
select
  count(*) filter (where vive is true)   as "marcadas vivas",
  count(*) filter (where vive is false)  as "fallecimiento verificado",
  count(*) filter (where vive is null)   as "sin saber",
  count(*) filter (where vive is null and fallecimiento_anio is null
                   and (nacimiento_anio is null
                        or nacimiento_anio > extract(year from now())::int - 100))
                                         as "se presumen vivas (se ocultan)"
from personas;
