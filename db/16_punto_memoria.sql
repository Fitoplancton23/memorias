-- 16_punto_memoria.sql — dónde exactamente, dentro del lugar
--
-- Regla 4: el lugar es una entidad con nombre y una coordenada representativa;
-- la memoria puede tener su propio punto, más preciso y distinto. El patio y
-- el salón de actos son dos puntos dentro de la misma escuela, y no son dos
-- lugares.
--
-- Por qué el punto va acá y no en una tabla de sub-lugares: pedirle al admin
-- que invente un lugar por cada rincón antes de poder subir una foto es
-- exactamente la fricción que hace que nadie cargue, y el agotamiento del
-- admin es el riesgo número uno del proyecto. Un punto es un clic en un mapa
-- que ya está mirando. Si algún día treinta memorias se amontonan en el mismo
-- rincón, ese racimo va a ser la evidencia de que ese rincón merece ser un
-- lugar — y promoverlo entonces es barato.

begin;

-- double precision, no numeric: se verificó que devuelve intacta una
-- coordenada de quince decimales, con un paso representable por debajo del
-- micrón. El límite de precisión nunca va a ser el almacenamiento; es el clic.
alter table memorias add column if not exists lat double precision;
alter table memorias add column if not exists lng double precision;

-- Qué tan segura es esa ubicación. Tercer estado implícito: sin dato, que
-- quiere decir que la memoria no tiene punto propio y hereda el del lugar.
-- Es la misma forma que ya tienen vive y precision_fecha — no saber es un
-- dato, no un agujero.
alter table memorias add column if not exists precision_punto text;

do $$ begin
  alter table memorias add constraint memorias_precision_punto_valida
    check (precision_punto is null or precision_punto in ('exacta', 'aproximada'));
exception when duplicate_object then null; end $$;

-- Un punto sin las dos coordenadas no es un punto. Y una precisión declarada
-- sin punto es una afirmación sobre algo que no existe: las dos cosas van
-- juntas o no van.
do $$ begin
  alter table memorias add constraint memorias_punto_completo
    check ((lat is null) = (lng is null)
           and (precision_punto is null or lat is not null));
exception when duplicate_object then null; end $$;

-- Las coordenadas tienen que caer en el mundo. No acota al pueblo a propósito:
-- el archivo puede recibir la foto de un vecino que emigró, y un límite
-- geográfico apretado sería inventar una regla que el archivo no tiene.
do $$ begin
  alter table memorias add constraint memorias_punto_en_el_mundo
    check (lat is null or (lat between -90 and 90 and lng between -180 and 180));
exception when duplicate_object then null; end $$;

-- Las memorias con punto se van a consultar por lugar, para dibujar los puntos
-- al entrar en él. Parcial: la mayoría no va a tener punto nunca.
create index if not exists memorias_lugar_punto
  on memorias (lugar_id) where lat is not null;

commit;

-- ---------------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------------
-- Las cuatro combinaciones de lugar y punto tienen que ser representables, y
-- las dos filas incoherentes tienen que ser rechazadas.
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'memorias'
   and column_name in ('lat', 'lng', 'precision_punto')
 order by column_name;

select conname as restriccion, pg_get_constraintdef(oid) as regla
  from pg_constraint
 where conrelid = 'memorias'::regclass and contype = 'c'
   and conname like 'memorias_p%'
 order by conname;
