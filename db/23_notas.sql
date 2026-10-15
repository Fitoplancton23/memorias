-- 23_notas.sql — notas entre administradores en una memoria
--
-- El archivo lo curan dos personas que casi nunca están al mismo tiempo. Lo
-- que hoy se pierde es lo que uno sabe y el otro no: "a ésta le faltan las
-- fotos, buscar en el grupo", "ya le pregunté a la familia, esperando
-- respuesta", "ojo que es la misma que la 47". Sin un lugar para eso, cada
-- revisión empieza de cero y la misma memoria se mira tres veces sin que
-- nadie se entere de que las otras dos ya pasaron.
--
-- Es una tabla y no una columna de texto en `memorias` por dos razones:
-- una columna la pisa el que escribe último, y una nota sin autor ni fecha no
-- sirve para coordinar — "faltan las fotos" cambia de significado según quién
-- lo dijo y hace cuánto.
--
-- NO es parte del archivo. Esto no sale al sitio nunca: el build baja
-- memorias aprobadas y esta tabla no entra en ninguna consulta pública. Es la
-- cocina, y la cocina no se ve desde el salón.

begin;

create table if not exists memoria_notas (
  id         uuid primary key default gen_random_uuid(),
  memoria_id uuid not null references memorias (id) on delete cascade,
  texto      text not null check (btrim(texto) <> ''),
  /* El nombre de quien la dejó, copiado al escribirla y no resuelto después.
     No es duplicación por comodidad: la política de `administradores` deja
     que cada uno vea SÓLO su propia fila, así que Matías no puede resolver el
     nombre de Facundo ni al revés. Sin esta columna, cada nota diría "alguien"
     para todos menos para quien la escribió, y una nota sin autor no coordina
     nada. */
  autor      text,
  creada_por uuid not null default auth.uid() references auth.users (id),
  creada_en  timestamptz not null default now()
);

/* Se leen siempre en orden y siempre por memoria. */
create index if not exists memoria_notas_por_memoria
  on memoria_notas (memoria_id, creada_en desc);

alter table memoria_notas enable row level security;

grant select, insert, delete on memoria_notas to authenticated;

/* Las ve cualquier administrador: para eso están, para que el otro las lea. */
drop policy if exists notas_lee_admin on memoria_notas;
create policy notas_lee_admin on memoria_notas
  for select to authenticated using (es_admin());

drop policy if exists notas_escribe_admin on memoria_notas;
create policy notas_escribe_admin on memoria_notas
  for insert to authenticated with check (es_admin() and creada_por = auth.uid());

/* Y cada uno borra las suyas. Borrar la nota de otro es borrarle un recado
   que todavía no leyó, y eso en una coordinación de dos personas es peor que
   dejar una nota vieja a la vista. */
drop policy if exists notas_borra_propia on memoria_notas;
create policy notas_borra_propia on memoria_notas
  for delete to authenticated using (es_admin() and creada_por = auth.uid());

commit;

-- Verificación
select policyname as politica, cmd as sobre
  from pg_policies
 where schemaname = 'public' and tablename = 'memoria_notas'
 order by policyname;

select count(*) as notas from memoria_notas;

-- Y que la tabla NO sea alcanzable sin sesión: lo que la cocina guarda no
-- puede salir al salón.
--
-- OJO: con sólo este archivo esto da TRUE, y está bien que lo diga. No
-- porque las notas se vean —la RLS está encendida y sin política para anon
-- devuelve cero filas—, sino porque `db/12_permisos.sql` deja puesto un
-- `alter default privileges` que le da SELECT a anon sobre toda tabla nueva
-- de `public`. Lo saca `db/24_notas_sin_anon.sql`, que además corta la raíz.
-- Correr los dos; después de eso, esto da false.
select has_table_privilege('anon', 'memoria_notas', 'SELECT') as "anon puede leer (false recién con el 24)";
