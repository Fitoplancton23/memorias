-- 20_familias.sql — poder armar y deshacer una familia desde el panel
--
-- `nucleos_familiares` y `nucleo_hijos` ya tenían insert y update desde el 13.
-- Les faltaba el borrado, y sin borrado la pantalla de armar familia no sirve:
-- un hijo agregado por error quedaría para siempre, y un parentesco falso es
-- peor que un parentesco ausente.
--
-- Por qué acá sí se borra, si el archivo no borra. La regla de no borrar es de
-- las memorias: una memoria borrada pierde el registro de que alguien la
-- aportó y de que dio o negó el permiso. Un núcleo familiar no es un aporte de
-- nadie: es una afirmación del archivo —«estas dos personas son pareja», «esta
-- es hija de aquellos»— y una afirmación equivocada no se despublica, se
-- retira. Además estas dos tablas no tienen columna de estado con la que
-- despublicar nada.
--
-- Las personas no se tocan: deshacer una familia saca el vínculo, nunca a la
-- gente.

grant delete on nucleos_familiares, nucleo_hijos to authenticated;

drop policy if exists panel_borra on nucleos_familiares;
create policy panel_borra on nucleos_familiares
  for delete to authenticated using (es_admin());

drop policy if exists panel_borra on nucleo_hijos;
create policy panel_borra on nucleo_hijos
  for delete to authenticated using (es_admin());

-- Verificación: tienen que salir insert, update y delete para las dos
select tablename as tabla, policyname as politica, cmd as sobre
  from pg_policies
 where schemaname = 'public'
   and tablename in ('nucleos_familiares', 'nucleo_hijos')
 order by tablename, cmd;
