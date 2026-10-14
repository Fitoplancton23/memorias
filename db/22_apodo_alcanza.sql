-- 22_apodo_alcanza.sql — el apodo solo también es una persona
--
-- El 11 dejó que faltara el nombre o que faltara el apellido, pero no los dos:
--   check (nombre is not null or apellido is not null)
--
-- Falta el tercer caso, que en este pueblo es el más común de todos. "El
-- Negro de la panadería", "la Tana", "doña Goya". Gente a la que nadie nombró
-- nunca de otra manera, que está en las fotos y de la que el aportante no
-- sabe el nombre de documento — y que hasta ahora no se podía cargar: el
-- panel tenía que inventarle un nombre para que la base la aceptara.
--
-- Inventarle un nombre es exactamente lo que este archivo no hace. La regla
-- de siempre: nunca inventar un dato que no tenemos. Si lo único que hay es
-- el apodo, se carga el apodo.
--
-- Lo que sigue sin poder pasar es una fila con los tres vacíos. Eso no es una
-- persona incompleta: es una fila que no se puede nombrar, ni buscar, ni
-- mostrar. La restricción va en la base y no sólo en el panel porque el panel
-- no es la única puerta — la clave secreta escribe sin pasar por él.
--
-- Y la cadena vacía cuenta como vacío. '' afirma que el apellido ES la cadena
-- vacía; NULL dice que no se sabe. El formulario de un navegador manda '' sin
-- preguntar, así que la restricción tiene que mirar el contenido y no la
-- diferencia entre '' y NULL.

begin;

-- Lo que ya esté guardado como vacío era este mismo caso
update personas set nombre   = null where btrim(nombre)   = '';
update personas set apellido = null where btrim(apellido) = '';
update personas set apodo    = null where btrim(apodo)    = '';

alter table personas drop constraint if exists personas_algun_nombre;
alter table personas add constraint personas_algun_nombre
  check (coalesce(nullif(btrim(nombre),   ''),
                  nullif(btrim(apellido), ''),
                  nullif(btrim(apodo),    '')) is not null);

commit;

-- Verificación
-- 1) la restricción quedó, y nombra a los tres
select conname as restriccion, pg_get_constraintdef(oid) as dice
  from pg_constraint
 where conrelid = 'personas'::regclass and conname = 'personas_algun_nombre';

-- 2) nadie quedó con los tres vacíos (tiene que dar 0)
select count(*) as "filas sin nombre, apellido ni apodo"
  from personas
 where coalesce(nullif(btrim(nombre),''), nullif(btrim(apellido),''),
                nullif(btrim(apodo),'')) is null;

-- 3) cómo está repartido hoy
select count(*) filter (where nombre is null)   as "sin nombre",
       count(*) filter (where apellido is null) as "sin apellido",
       count(*) filter (where apodo is not null) as "con apodo",
       count(*) filter (where nombre is null and apellido is null) as "sólo apodo",
       count(*) as personas
  from personas;

-- 4) Y que de verdad frena. Esto NO inserta nada: abre, intenta, falla y
--    deshace. Si el bloque no levanta la excepción esperada, la restricción
--    no está haciendo su trabajo y el resultado lo dice.
--    El bloque interno es una subtransacción: cuando el insert falla, el
--    manejador la deshace solo y no queda nada. Si NO fallara, la excepción
--    de abajo aborta todo el bloque, así que tampoco queda nada.
do $$
begin
  begin
    insert into personas (slug, nombre, apellido, apodo, estado)
    values ('zzz-prueba-restriccion', '', '  ', null, 'pendiente');
    raise exception 'LA RESTRICCION NO FRENA: se insertó una persona sin nombre, apellido ni apodo';
  exception when check_violation then
    raise notice 'ok: la restriccion frena una persona sin nombre, apellido ni apodo';
  end;
end $$;
