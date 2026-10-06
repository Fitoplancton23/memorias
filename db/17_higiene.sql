-- 17_higiene.sql — la compuerta cubre también a las personas, y dos arreglos
--
-- Sale de leer el volcado del esquema (db/esquema.md), que dejó a la vista
-- cosas que no se veían adivinando.

begin;

-- ---------------------------------------------------------------------------
-- 1. Aprobar a una persona es publicar su nombre
-- ---------------------------------------------------------------------------
-- personas.estado existía desde el principio con 'aprobada' por defecto, y el
-- panel no lo tocaba: una persona creada mientras se cargaba una memoria
-- pendiente aparecía en el sitio público antes de que nadie mirara nada. El
-- panel ya crea en 'pendiente' y aprueba a la gente al aprobar la memoria;
-- esto pone la misma regla en la base, donde no se puede saltear.
--
-- Es la misma forma que tiene memorias, con la misma consecuencia: quien no
-- puede publicar tampoco puede editar a una persona ya aprobada. Se acepta
-- igual que allá — corregir el nombre de alguien publicado es, también, una
-- decisión sobre lo publicado.

drop policy if exists panel_actualiza on personas;
create policy panel_actualiza on personas
  for update to authenticated
  using (es_admin())
  with check (es_admin() and (puede_publicar() or estado = 'pendiente'));

-- El panel necesita ver a las pendientes para poder nombrarlas en el
-- formulario; el sitio no las baja porque el build filtra por estado.
drop policy if exists panel_ve_personas_pendientes on personas;
create policy panel_ve_personas_pendientes on personas
  for select to authenticated using (es_admin());

-- ---------------------------------------------------------------------------
-- 2. creada_en duplicaba a created_at
-- ---------------------------------------------------------------------------
-- created_at ya existía en las cuatro tablas. creada_en se agregó sin saberlo,
-- y al crearla con `default now()` todas las filas que ya existían quedaron
-- fechadas en el momento de la migración: la columna nueva miente sobre el
-- pasado y la vieja dice la verdad. Esto copia la verdad a la columna que el
-- panel usa.
--
-- No se borra created_at: está en el esquema original y puede haber algo
-- afuera que la lea. Queda anotada en db/esquema.md como lo que es.

update memorias        set creada_en = created_at where created_at is not null and creada_en > created_at;
update lugares         set creada_en = created_at where created_at is not null and creada_en > created_at;
update personas        set creada_en = created_at where created_at is not null and creada_en > created_at;
update acontecimientos set creada_en = created_at where created_at is not null and creada_en > created_at;

commit;

-- ---------------------------------------------------------------------------
-- Revisión: ¿quedó alguien publicado que no debería?
-- ---------------------------------------------------------------------------
-- Las personas que el panel creó antes de este arreglo quedaron en 'aprobada'.
-- Esta consulta lista a las que están aprobadas y no aparecen en ninguna
-- memoria aprobada — que es la señal de que se publicaron sin que nadie las
-- mirara. Ojo: también salen las personas relevadas de la genealogía que
-- todavía no tienen memorias, que son legítimas. Por eso se mira y se decide,
-- no se corrige a ciegas.
--
-- select p.slug, p.nombre, p.apellido, p.creada_en
--   from personas p
--  where p.estado = 'aprobada' and not p.es_demo
--    and not exists (
--      select 1 from memoria_personas mp
--      join memorias m on m.id = mp.memoria_id
--      where mp.persona_id = p.id and m.estado = 'aprobada')
--  order by p.creada_en desc;

-- ---------------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------------
select tablename as tabla, policyname as politica, cmd as sobre
  from pg_policies
 where schemaname = 'public' and tablename = 'personas'
 order by policyname;
