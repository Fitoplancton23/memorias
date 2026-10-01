-- Esquema de destino para cuando el volumen justifique pasar de planillas a Postgres.
-- Las columnas mapean 1:1 con las planillas de intake/: migrar es cambiar el lector
-- de scripts/build-snapshot.mjs, no rediseñar nada.
-- NO hace falta ejecutarlo todavía.

create type precision_fecha as enum ('dia','mes','anio','decada','circa','desconocida');
create type estado_pub as enum ('borrador','revision','publicado');

create table lugar (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nombre text not null,
  tipo text,
  lat double precision, lng double precision,
  geojson jsonb,
  desde int, hasta int,
  notas text,
  estado estado_pub default 'borrador'
);

create table lugar_alias (
  id uuid primary key default gen_random_uuid(),
  lugar_id uuid references lugar on delete cascade,
  nombre text not null, desde int, hasta int
);

create table persona (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nombre text, apellido text, apodo text,
  sexo char(1),
  nac_desde int, nac_hasta int, nac_precision precision_fecha default 'desconocida',
  def_desde int, def_hasta int, def_precision precision_fecha default 'desconocida',
  vive boolean default false,
  lugar_origen uuid references lugar,
  confianza smallint default 3,
  merged_into uuid references persona,
  notas text,
  estado estado_pub default 'borrador'
);

create table persona_alias (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid references persona on delete cascade,
  nombre text not null
);

create table union_familiar (
  id uuid primary key default gen_random_uuid(),
  persona_a uuid references persona,
  persona_b uuid references persona,
  tipo text, anio int,
  lugar_id uuid references lugar
);

create table filiacion (
  id uuid primary key default gen_random_uuid(),
  hijo_id uuid not null references persona on delete cascade,
  union_id uuid references union_familiar,
  progenitor_id uuid references persona,
  tipo text default 'biologico'
);

create table acontecimiento (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  titulo text not null, descripcion text,
  desde int, hasta int, precision precision_fecha default 'anio',
  tipo text,
  estado estado_pub default 'borrador'
);

create table documento (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  tipo text not null,
  titulo text, descripcion text, transcripcion text,
  desde int, hasta int, precision precision_fecha default 'anio',
  aportante text, fuente_url text,
  archivo_url text, thumb_url text,
  licencia text default 'cesion_vecino',
  estado estado_pub default 'borrador'
);

create table documento_persona (
  documento_id uuid references documento on delete cascade,
  persona_id uuid references persona on delete cascade,
  rol text default 'aparece',
  primary key (documento_id, persona_id, rol)
);
create table documento_lugar (
  documento_id uuid references documento on delete cascade,
  lugar_id uuid references lugar on delete cascade,
  primary key (documento_id, lugar_id)
);
create table documento_acontecimiento (
  documento_id uuid references documento on delete cascade,
  acontecimiento_id uuid references acontecimiento on delete cascade,
  primary key (documento_id, acontecimiento_id)
);
create table persona_lugar (
  persona_id uuid references persona on delete cascade,
  lugar_id uuid references lugar on delete cascade,
  rol text, desde int, hasta int,
  primary key (persona_id, lugar_id, rol)
);
create table acontecimiento_lugar (
  acontecimiento_id uuid references acontecimiento on delete cascade,
  lugar_id uuid references lugar on delete cascade,
  primary key (acontecimiento_id, lugar_id)
);
