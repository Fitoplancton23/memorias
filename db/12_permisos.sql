-- 12_permisos.sql — GRANT de lectura para el rol anónimo
--
-- RLS y GRANT son dos puertas distintas y hay que abrir las dos:
--   GRANT  → ¿este rol puede tocar la tabla?
--   POLICY → ¿qué filas de esa tabla puede ver?
-- Una tabla con política permisiva pero sin grant devuelve 42501, que es
-- exactamente lo que pasó con nucleos_familiares.

begin;

grant usage on schema public to anon, authenticated;

grant select on
  linajes, lugares, personas, persona_alias,
  nucleos_familiares, nucleo_hijos,
  memorias, memoria_personas,
  acontecimientos, memoria_acontecimientos, memoria_fotos
to anon, authenticated;

-- Que las tablas que se creen más adelante no repitan el problema
alter default privileges in schema public grant select on tables to anon, authenticated;

commit;

-- ---------------------------------------------------------------------------
-- Verificación: qué tablas puede leer anon, y cuáles tienen RLS encendida
-- ---------------------------------------------------------------------------
select c.relname as tabla,
       has_table_privilege('anon', c.oid, 'SELECT') as "anon puede leer",
       c.relrowsecurity                             as "RLS encendida",
       (select count(*) from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;
