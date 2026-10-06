-- 18_consentimiento.sql — el permiso de quien aportó la memoria
--
-- La compuerta que el roadmap puso antes de cargar datos reales. El panel
-- preguntaba desde el principio si quien aportó la memoria sabe que se
-- publica, y esa respuesta no se guardaba en ningún lado: se la leía, se la
-- tiraba y la memoria se publicaba igual. Preguntar sin registrar es peor que
-- no preguntar, porque deja la sensación de que el permiso está cubierto.
--
-- La primera foto real ya llegó —el casamiento de Pedro Escarban y Patricia
-- Machado, aportado por la familia—, y es el caso exacto: nombres y apellidos
-- de gente que lo más probable es que esté viva.

begin;

-- ---------------------------------------------------------------------------
-- 1. Las columnas
-- ---------------------------------------------------------------------------
-- permiso_publicacion tiene tres estados, por la misma razón que los tiene
-- `vive`: no saber si alguien autorizó no es lo mismo que saber que no.
--
--   true   quien aportó la memoria sabe que se publica y está de acuerdo
--   null   todavía no se le preguntó
--   false  pidió que no se publique
--
-- El tercer estado es el canal de baja que faltaba. Si alguien pide salir del
-- archivo, su memoria no se borra ni se deja en 'pendiente' esperando que
-- alguien se acuerde: queda con el permiso negado, y la base no la publica
-- nunca más. Borrarla perdería el único registro de que pidió salir, y la
-- próxima persona que cure el archivo volvería a preguntar lo mismo.
--
-- quien_autorizo es texto libre y no un uuid a propósito: quien autoriza no
-- suele ser quien aparece en la foto ni quien la mandó por correo, y casi
-- nunca es alguien que esté en la base. "Pedro Escarban, el hijo" es el dato
-- que sirve para responder por una publicación; un id no lo es.

alter table memorias
  add column if not exists permiso_publicacion boolean,
  add column if not exists quien_autorizo      text,
  add column if not exists permiso_en          timestamptz;

comment on column memorias.permiso_publicacion is
  'true: autorizada. null: todavía no se preguntó. false: pidió que no se publique.';
comment on column memorias.quien_autorizo is
  'Quién dio el permiso y en qué carácter. Texto libre: casi nunca está en la base.';
comment on column memorias.permiso_en is
  'Cuándo cambió el permiso. La pone la base, no el formulario.';

-- ---------------------------------------------------------------------------
-- 2. La compuerta
-- ---------------------------------------------------------------------------
-- Va en un trigger y no en una política de RLS por dos razones. La primera es
-- el mensaje: una política rechaza con "new row violates row-level security
-- policy", que no le dice nada a quien está del otro lado; un trigger puede
-- explicar en castellano qué falta y qué hacer. La segunda es el alcance: la
-- clave secreta saltea la RLS, pero no saltea un trigger. Para una compuerta
-- de privacidad, eso es lo que corresponde.
--
-- La demo queda exenta: es una genealogía inventada, no hay a quién
-- preguntarle. La cinta de aviso del sitio es lo que la cubre.

create or replace function memorias_permiso() returns trigger
language plpgsql as $$
begin
  -- La fecha del permiso la pone la base. Escrita a mano no prueba nada, y el
  -- sentido de esta columna es poder responder por una publicación.
  if tg_op = 'INSERT' then
    new.permiso_en := case when new.permiso_publicacion is null then null else now() end;
  elsif new.permiso_publicacion is distinct from old.permiso_publicacion then
    new.permiso_en := case when new.permiso_publicacion is null then null else now() end;
  else
    new.permiso_en := old.permiso_en;
  end if;

  if new.estado = 'aprobada' and not new.es_demo
     and new.permiso_publicacion is not true then
    raise exception
      'Falta el permiso de quien aportó "%": no se puede publicar. Anotá en la '
      'memoria quién autorizó y volvé a intentar. Si pidió que no se publique, '
      'dejala sin publicar: el archivo la guarda igual.', new.titulo;
  end if;

  return new;
end $$;

drop trigger if exists memorias_permiso on memorias;
create trigger memorias_permiso
  before insert or update on memorias
  for each row execute function memorias_permiso();

commit;

-- ---------------------------------------------------------------------------
-- Revisión: ¿hay algo publicado sin permiso registrado?
-- ---------------------------------------------------------------------------
-- El trigger no toca lo que ya estaba aprobado — sólo frena de acá en
-- adelante. Estas son las memorias que quedaron publicadas antes de que la
-- columna existiera. No se corrigen a ciegas: se mira cada una y se decide,
-- porque la pregunta no es técnica. Si el permiso existió de verdad, se anota
-- quién lo dio; si no se acuerda, se la vuelve a 'pendiente' hasta preguntar.
--
-- Ojo: el build tampoco las baja más (scripts/leer-supabase.mjs), así que
-- desaparecen del sitio en la próxima publicación aunque digan 'aprobada'.

select slug, titulo, aportado_por, creada_en
  from memorias
 where estado = 'aprobada' and not es_demo and permiso_publicacion is not true
 order by creada_en desc;

-- Para anotar un permiso que sí existió:
--
-- update memorias
--    set permiso_publicacion = true, quien_autorizo = 'Nombre, en qué carácter'
--  where slug = 'el-slug';
--
-- Para devolver una al cajón hasta poder preguntar:
--
-- update memorias set estado = 'pendiente' where slug = 'el-slug';
