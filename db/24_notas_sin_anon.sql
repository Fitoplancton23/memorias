-- 24_notas_sin_anon.sql — sacarle a anon el permiso sobre las notas,
--                         y que la próxima tabla privada no nazca con él
--
-- La verificación del 23 preguntaba si la clave pública puede leer
-- `memoria_notas` y esperaba `false`. Dio `true`.
--
-- QUÉ PASÓ, Y QUÉ NO PASÓ.
--
-- No pasó que las notas estuvieran a la vista. La RLS está encendida y las
-- únicas políticas son `to authenticated` con `es_admin()`, así que una
-- consulta con la clave pública devuelve CERO filas. `has_table_privilege`
-- responde por el permiso de la tabla, no por lo que se puede leer de ella:
-- son dos compuertas distintas y la segunda estaba cerrada.
--
-- Lo que sí pasó es que la primera estaba abierta, y no por descuido de este
-- archivo: lo hace `db/12_permisos.sql`, en su última línea.
--
--   alter default privileges in schema public grant select on tables to anon, authenticated;
--
-- Esa línea se escribió para que las tablas públicas que vinieran después no
-- se olvidaran de su grant. El efecto de borde es el que acabamos de ver:
-- TODA tabla nueva de `public` nace legible por la clave pública, incluidas
-- las que no son del público. Una tabla privada que nace con un permiso que
-- nadie le puso es exactamente la clase de error que no se nota mirando.
--
-- Se arregla en los dos niveles. El de abajo es el que importa hoy; el de
-- arriba es el que evita que vuelva a pasar.

begin;

-- 1. Esta tabla. Mismo gesto que `ajustes_publicacion` en db/14_publicar.sql:
--    lo que no es del público no lleva permiso del público, aunque la RLS ya
--    lo esté frenando. Dos cerrojos cuestan lo mismo que uno.
revoke all on memoria_notas from anon;

-- 2. Y la raíz. A partir de acá, una tabla nueva de `public` NO nace legible:
--    el grant hay que escribirlo. Es más trabajo y es el trabajo correcto —
--    olvidarse de abrir una tabla pública se nota enseguida, porque el build
--    se queda sin datos y lo dice; olvidarse de cerrar una privada no se nota
--    nunca. De los dos olvidos posibles, este cambio deja el que avisa.
--
--    Las tablas que ya existen no se tocan: sus grants están escritos a mano
--    en db/12_permisos.sql y siguen donde estaban.
alter default privileges in schema public revoke select on tables from anon;

commit;

-- ---------------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------------

-- 1. Ahora sí tiene que dar false.
select has_table_privilege('anon', 'memoria_notas', 'SELECT') as "anon puede leer (tiene que ser false)";

-- 2. Y las tablas que SÍ son públicas tienen que seguir dando true: este
--    archivo no puede haber cerrado el sitio.
select tablename as tabla,
       has_table_privilege('anon', tablename, 'SELECT') as "anon lee (tiene que ser true)"
  from unnest(array['memorias','personas','lugares','memoria_personas',
                    'memoria_fotos','acontecimientos']) as tablename;

-- 3. La prueba de verdad: entrar como anon y pedir las notas. Tiene que
--    rebotar. Si NO rebota, el aviso lo dice con todas las letras.
do $$
declare n int;
begin
  begin
    set local role anon;
    select count(*) into n from memoria_notas;
    reset role;
    raise exception 'LA TABLA SIGUE ABIERTA: anon leyó % fila(s)', n;
  exception
    when insufficient_privilege then
      reset role;
      raise notice 'ok: anon no tiene permiso sobre memoria_notas';
  end;
end $$;
