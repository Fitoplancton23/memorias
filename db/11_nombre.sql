-- 11_nombre.sql — el nombre de pila tampoco siempre se sabe
--
-- "Alumnos: Potschka y Prevelis". En la escuela y en el pueblo a mucha gente
-- se la nombra sólo por el apellido, y ése es el dato que sobrevive.
--
-- Es el caso espejo del 10: ahí faltaba el apellido, acá falta el nombre. Las
-- dos columnas pueden ser NULL, pero no las dos a la vez — una persona sin
-- nombre ni apellido no es un dato incompleto, es una fila sin sentido.

begin;

alter table personas alter column nombre drop not null;
update personas set nombre = null where nombre = '';

alter table personas drop constraint if exists personas_algun_nombre;
alter table personas add constraint personas_algun_nombre
  check (nombre is not null or apellido is not null);

commit;

select count(*) filter (where nombre is null)   as "sólo apellido",
       count(*) filter (where apellido is null) as "sólo nombre",
       count(*)                                 as "personas"
from personas;
