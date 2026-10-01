-- 10_apellido.sql — el apellido puede no saberse
--
-- La primera carga real falló acá: "Potchka" y "Prevelis" aparecen en el
-- relato de la campaña antivariólica sin apellido, y "doña Goya" en el plantel
-- de la Escuela 406. Son 3 de 36 personas, el 8%, y va a seguir pasando: en el
-- pueblo mucha gente se conoce por el apodo y nadie recuerda el apellido de
-- documento.
--
-- Poner '' sería afirmar que el apellido es la cadena vacía. NULL dice lo que
-- de verdad pasa: no se sabe. Es la misma razón por la que linaje_id ya es
-- nullable — la Regla 3, el sistema sabe qué le falta.
--
-- Cuando alguien del pueblo aporte el apellido, se completa. Mientras tanto la
-- persona existe en el archivo, que es lo que importa.

begin;

alter table personas alter column apellido drop not null;

-- lo que ya se haya guardado como vacío era este mismo caso
update personas set apellido = null where apellido = '';

-- El relleno de slugs de 06 concatenaba nombre || '-' || apellido, y en SQL
-- eso da NULL entero si el apellido es NULL. Se repite acá a prueba de nulos
-- para las personas que entren sin apellido.
with n as (
  select id,
         f_slug(nombre || '-' || coalesce(apellido, '')) as base,
         row_number() over (partition by f_slug(nombre || '-' || coalesce(apellido, ''))
                            order by created_at nulls last, id) as r
  from personas where slug is null)
update personas p set slug = case when n.r = 1 then n.base else n.base || '-' || n.r end
from n where n.id = p.id;

commit;

select count(*) filter (where apellido is null) as "sin apellido",
       count(*) filter (where slug is null)     as "sin slug",
       count(*)                                 as "personas"
from personas;
