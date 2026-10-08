# Esquema de la base — volcado

Qué columnas tiene realmente Supabase. **No se escribe a mano: se vuelca.**

Existe porque el entorno de desarrollo no puede alcanzar la base —la lista de
dominios permitidos está reservada a cuentas Team, y ésta es individual—, así
que sin este archivo el esquema se adivina. Dos errores salieron de eso: una
consulta que ordenaba por una columna inexistente, y una columna duplicada que
se creó sin saber que ya había otra igual.

## Cómo se regenera

En el editor SQL de Supabase, y se pega el resultado acá abajo:

```sql
select c.table_name as tabla,
       string_agg(
         c.column_name || ' ' || c.data_type
         || case when c.is_nullable = 'NO' then ' NOT NULL' else '' end
         || case when c.column_default is not null
                 then ' =' || split_part(c.column_default, '::', 1) else '' end,
         ', ' order by c.ordinal_position) as columnas
  from information_schema.columns c
  join information_schema.tables t
    on t.table_schema = c.table_schema
   and t.table_name = c.table_name
   and t.table_type = 'BASE TABLE'
 where c.table_schema = 'public'
 group by c.table_name
 order by c.table_name;
```

Se actualiza en el mismo movimiento en que cambia el esquema, igual que el
resto de la documentación: dos documentos que se contradicen cuestan más que
ninguno.

---

> **Pendiente de volcar:** `db/18_consentimiento.sql` todavía no corrió, así
> que el volcado de abajo no tiene `memorias.permiso_publicacion`,
> `.quien_autorizo` ni `.permiso_en`, ni el trigger `memorias_permiso`. El
> panel se da cuenta solo —pregunta si la columna existe al entrar— y avisa
> que el permiso no se está guardando.

## Volcado · 2026-10-06

| tabla | columnas |
|---|---|
| **acontecimientos** | `id` uuid NOT NULL =gen_random_uuid(), `nombre` text NOT NULL, `slug` text, `anio` integer, `anio_hasta` integer, `descripcion` text, `notas` text, `es_demo` boolean NOT NULL =false, `created_at` timestamptz =now(), `creada_en` timestamptz NOT NULL =now() |
| **administradores** | `id` uuid NOT NULL, `nombre` text, `puede_publicar` boolean NOT NULL =false, `creado_en` timestamptz NOT NULL =now() |
| **ajustes_publicacion** | `id` integer NOT NULL =1, `deploy_hook` text, `ultima_publicacion` timestamptz, `ultimo_pedido` bigint |
| **linajes** | `id` uuid NOT NULL =gen_random_uuid(), `apellido` text NOT NULL, `variantes` ARRAY ='{}', `origen` text, `anio_llegada` integer, `color` text, `notas` text, `es_demo` boolean NOT NULL =false, `created_at` timestamptz =now() |
| **lugares** | `id` uuid NOT NULL =gen_random_uuid(), `nombre` text NOT NULL, `tipo` text, `lat` numeric, `lng` numeric, `localidad` text, `notas` text, `es_demo` boolean NOT NULL =false, `created_at` timestamptz =now(), `x` numeric, `y` numeric, `slug` text, `creada_en` timestamptz NOT NULL =now() |
| **memoria_acontecimientos** | `memoria_id` uuid NOT NULL, `acontecimiento_id` uuid NOT NULL |
| **memoria_fotos** | `id` uuid NOT NULL =gen_random_uuid(), `memoria_id` uuid NOT NULL, `url` text NOT NULL, `orden` integer NOT NULL =0, `pie` text, `ancho` integer, `alto` integer, `created_at` timestamptz =now() |
| **memoria_personas** | `memoria_id` uuid NOT NULL, `persona_id` uuid NOT NULL, `confianza` text ='confirmada', `posicion` text |
| **memorias** | `id` uuid NOT NULL =gen_random_uuid(), `titulo` text NOT NULL, `descripcion` text, `anio` integer, `anio_aprox` boolean NOT NULL =false, `anio_hasta` integer, `lugar_id` uuid, `foto_url` text, `aportado_por` text, `fuente` text, `estado` text NOT NULL ='pendiente', `es_demo` boolean NOT NULL =false, `creado_por` uuid, `created_at` timestamptz =now(), `fecha_texto` text, `precision_fecha` text, `slug` text, `creada_en` timestamptz NOT NULL =now(), `lat` double precision, `lng` double precision, `precision_punto` text |
| **nucleo_hijos** | `nucleo_id` uuid NOT NULL, `persona_id` uuid NOT NULL, `tipo` text ='biologico' |
| **nucleos_familiares** | `id` uuid NOT NULL =gen_random_uuid(), `persona_a_id` uuid NOT NULL, `persona_b_id` uuid, `tipo_union` text ='matrimonio', `anio_union` integer, `notas` text, `es_demo` boolean NOT NULL =false, `created_at` timestamptz =now() |
| **persona_alias** | `persona_id` uuid NOT NULL, `alias` text NOT NULL |
| **personas** | `id` uuid NOT NULL =gen_random_uuid(), `nombre` text, `apellido` text, `apodo` text, `linaje_id` uuid, `nacimiento_anio` integer, `nacimiento_aprox` boolean NOT NULL =false, `fallecimiento_anio` integer, `lugar_nacimiento_id` uuid, `foto_url` text, `notas` text, `estado` text NOT NULL ='aprobada', `es_demo` boolean NOT NULL =false, `creado_por` uuid, `created_at` timestamptz =now(), `vive` boolean, `slug` text, `creada_en` timestamptz NOT NULL =now() |

---

## Lo que cambió después del volcado

`db/19_alias.sql` abrió el borrado de `persona_alias`, y `db/20_familias.sql` el
de `nucleos_familiares` y `nucleo_hijos` — sin eso el taller podía armar una
familia y no podía deshacerla, y un parentesco equivocado quedaba puesto para
siempre.

---

## Lo que este volcado dejó a la vista

**`personas.estado` existe y el panel no lo usa.** Su valor por defecto es
`'aprobada'`, y el lector del build no filtra personas por estado. O sea que
una persona creada mientras se carga una memoria pendiente aparece en el sitio
público antes de que nadie haya aprobado nada. La compuerta de moderación cubre
las memorias y no cubre a la gente que esas memorias nombran.

**`creada_en` duplica a `created_at`.** Las dos están en cuatro tablas. La
segunda ya existía y la primera se agregó sin saberlo. Peor: al agregarla con
`default now()`, todas las filas que ya existían quedaron fechadas en el
momento de la migración, mientras que `created_at` conserva la fecha
verdadera.

**Columnas que existen y el panel todavía no completa:**
`memoria_fotos.ancho` y `.alto` —que el panel ya calcula al achicar la imagen—,
`memoria_fotos.pie`, `memoria_personas.posicion` ("sobre la carroza, a la
izquierda"), `memorias.creado_por` y `personas.creado_por` —quién cargó cada
cosa—, `nucleos_familiares.tipo_union` y `.anio_union`, y `linajes.variantes`
para unificar grafías de un apellido.

**`lugares.lat`/`lng` son `numeric` y `memorias.lat`/`lng` son `double
precision`.** Las dos guardan de sobra para lo que se puede marcar con un clic,
así que no hay pérdida; queda anotado porque la diferencia no es intencional.

**`lugares.x` e `y`** son los restos de las coordenadas normalizadas sobre la
ilustración de Illustrator, anterior a la base de OpenStreetMap. Ya no las lee
nadie.
