-- 09_carga_real.sql — generado por scripts/generar-carga.mjs
-- Material REAL del documento del grupo. Entra como pendiente: no se publica.
-- Idempotente: se puede volver a correr sin duplicar.

begin;

-- ---------- lugares ----------
insert into lugares (slug, nombre, lat, lng, notas, es_demo) values ('escuela-406', 'Escuela 406', -27.093606584363265, -54.88554657576054, null, false)
  on conflict (slug) do update set nombre = excluded.nombre, lat = excluded.lat, lng = excluded.lng;
insert into lugares (slug, nombre, lat, lng, notas, es_demo) values ('municipalidad', 'Municipalidad', -27.09668684967551, -54.89557835947953, null, false)
  on conflict (slug) do update set nombre = excluded.nombre, lat = excluded.lat, lng = excluded.lng;
insert into lugares (slug, nombre, lat, lng, notas, es_demo) values ('av-de-las-americas-680', 'Av. de las Américas 680', -27.09871392937437, -54.89361560419459, null, false)
  on conflict (slug) do update set nombre = excluded.nombre, lat = excluded.lat, lng = excluded.lng;
insert into lugares (slug, nombre, lat, lng, notas, es_demo) values ('km-1209', 'Km 1209', -27.088401827359707, -54.85764290402585, null, false)
  on conflict (slug) do update set nombre = excluded.nombre, lat = excluded.lat, lng = excluded.lng;
insert into lugares (slug, nombre, lat, lng, notas, es_demo) values ('km-1208', 'Km 1208', -27.091051960264473, -54.86427771855284, null, false)
  on conflict (slug) do update set nombre = excluded.nombre, lat = excluded.lat, lng = excluded.lng;
insert into lugares (slug, nombre, lat, lng, notas, es_demo) values ('comercio-de-jueguitos', 'Comercio de jueguitos electrónicos', -27.099036759991073, -54.89286754738126, 'Nombre a confirmar: en el relato nadie lo nombra, se pregunta por él.', false)
  on conflict (slug) do update set nombre = excluded.nombre, lat = excluded.lat, lng = excluded.lng;
insert into lugares (slug, nombre, lat, lng, notas, es_demo) values ('escuela-425-salto-encantado', 'Escuela 425, Salto Encantado', -27.03631613654542, -54.82947828831826, null, false)
  on conflict (slug) do update set nombre = excluded.nombre, lat = excluded.lat, lng = excluded.lng;
insert into lugares (slug, nombre, lat, lng, notas, es_demo) values ('ruta-14-vieja', 'Ruta 14 vieja', -27.0961566352717, -54.8938097831849, null, false)
  on conflict (slug) do update set nombre = excluded.nombre, lat = excluded.lat, lng = excluded.lng;
insert into lugares (slug, nombre, lat, lng, notas, es_demo) values ('avenida-centro', 'Avenida (centro)', -27.09882682689972, -54.89355451245606, 'A 13 m de av-de-las-americas-680: confirmar si son el mismo lugar.', false)
  on conflict (slug) do update set nombre = excluded.nombre, lat = excluded.lat, lng = excluded.lng;
insert into lugares (slug, nombre, lat, lng, notas, es_demo) values ('escuela-normal', 'Escuela Normal', -27.09589150638696, -54.89556476944564, null, false)
  on conflict (slug) do update set nombre = excluded.nombre, lat = excluded.lat, lng = excluded.lng;
insert into lugares (slug, nombre, lat, lng, notas, es_demo) values ('unidad-sanitaria', 'Unidad Sanitaria', -27.104403724005294, -54.88772583093217, null, false)
  on conflict (slug) do update set nombre = excluded.nombre, lat = excluded.lat, lng = excluded.lng;

-- ---------- personas ----------
-- linaje_id y apellido quedan null a propósito cuando no se saben: que una
-- persona esté en el archivo no significa que se sepa su familia ni su
-- apellido de documento. Es la Regla 3.
-- `estado` se deja en su valor por defecto: lo que se modera es la memoria,
-- no la persona.
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('nelida-ramirez', 'Nélida', 'Ramírez', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('delfia-carloto', 'Delfia', 'Carloto', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('nelly-schoninger', 'Nelly', 'Schoninger', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('gladiz-engel', 'Gladiz', 'Engel', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('goya', 'Goya', null, 'doña Goya', false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('pocha-casco', 'Pocha', 'Casco', 'doña Pocha Casco', false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('amalia-haureluk', 'Amalia', 'Haureluk', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('susana-carson', 'Susana', 'Carson', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('luba-novosad', 'Luba', 'Novosad', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('mabel-oberenko', 'Mabel', 'Oberenko', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('angelita-pereira', 'Angelita', 'Pereira', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('morocha-fontana', 'Morocha', 'Fontana', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('yolanda-llamosas', 'Yolanda', 'Llamosas', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('roberto-ramirez', 'Roberto', 'Ramírez', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('delicia-zelmer', 'Delicia', 'Zelmer', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('mabel-zurakouski', 'Mabel', 'Zurakouski', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('hernann-signer', 'Hernann', 'Signer', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('alette-mechtilde-bongers', 'Alette Mechtilde', 'Bongers', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('alfredo-signer', 'Alfredo', 'Signer', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('walter-signer', 'Walter', 'Signer', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('rodolfo-signer', 'Rodolfo', 'Signer', 'Rudy', false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('juan-nunez', 'Juan', 'Núñez', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('lucy-dominguez-de-beitia', 'Lucy', 'Domínguez de Beitía', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('angelica-zilke', 'Angélica', 'Zilke', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('nilda-reschke', 'Nilda', 'Reschke', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('tito-salinas', 'Tito', 'Salinas', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('juan-manuel-fangio', 'Juan Manuel', 'Fangio', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('juan-galvez', 'Juan', 'Gálvez', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('carmen-ramirez', 'Carmen', 'Ramírez', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('mirta-bianchetti', 'Mirta', 'Bianchetti', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('petrona-torres', 'Petrona', 'Torres', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('iracema-arguello', 'Iracema', 'Argüello', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('potschka', null, 'Potschka', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('prevelis', null, 'Prevelis', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('margarita-gerber', 'Margarita', 'Gerber', null, false)
  on conflict (slug) do nothing;
insert into personas (slug, nombre, apellido, apodo, es_demo) values ('susana-nowitzki', 'Susana', 'Nowitzki', null, false)
  on conflict (slug) do nothing;

-- ---------- memorias ----------
insert into memorias (slug, titulo, descripcion, fecha_texto, anio, anio_aprox, anio_hasta, precision_fecha, lugar_id, foto_url, aportado_por, estado, es_demo)
  values ('plantel-escuela-406-1985', 'Plantel de docentes de la Escuela 406', 'El blanco de sus guardapolvos, esos uniformes que con tanto orgullo portaron.', '1985/1986 Aprox', 1985, true, 1986, 'circa',
          (select id from lugares where slug = 'escuela-406'), '/memorias/406-1985-1986-1421.jpg', null, 'pendiente', false)
  on conflict (slug) do update set titulo = excluded.titulo, fecha_texto = excluded.fecha_texto,
    anio = excluded.anio, anio_aprox = excluded.anio_aprox, anio_hasta = excluded.anio_hasta,
    precision_fecha = excluded.precision_fecha, lugar_id = excluded.lugar_id, foto_url = excluded.foto_url;
insert into memorias (slug, titulo, descripcion, fecha_texto, anio, anio_aprox, anio_hasta, precision_fecha, lugar_id, foto_url, aportado_por, estado, es_demo)
  values ('entrega-del-acervo-al-municipio', 'Entrega del acervo al Municipio', 'Cierre del proyecto del grupo: se entrega al Municipio todo el material fotográfico y documental recabado. El material sigue siendo de carácter público, resguardado institucionalmente.', '07/10/2025', 2025, false, null, 'dia',
          (select id from lugares where slug = 'municipalidad'), '/memorias/7-oct-2025-1080.jpg', 'Matías Vazquez y Sergio Toledo', 'pendiente', false)
  on conflict (slug) do update set titulo = excluded.titulo, fecha_texto = excluded.fecha_texto,
    anio = excluded.anio, anio_aprox = excluded.anio_aprox, anio_hasta = excluded.anio_hasta,
    precision_fecha = excluded.precision_fecha, lugar_id = excluded.lugar_id, foto_url = excluded.foto_url;
insert into memorias (slug, titulo, descripcion, fecha_texto, anio, anio_aprox, anio_hasta, precision_fecha, lugar_id, foto_url, aportado_por, estado, es_demo)
  values ('familia-buearc-1960', 'Familia Buearc en el km 200', null, '1960 aprox', 1960, true, null, 'circa',
          (select id from lugares where slug = 'av-de-las-americas-680'), '/memorias/1960-aprox-buearc-960.jpg', 'Graciela Buearc', 'pendiente', false)
  on conflict (slug) do update set titulo = excluded.titulo, fecha_texto = excluded.fecha_texto,
    anio = excluded.anio, anio_aprox = excluded.anio_aprox, anio_hasta = excluded.anio_hasta,
    precision_fecha = excluded.precision_fecha, lugar_id = excluded.lugar_id, foto_url = excluded.foto_url;
insert into memorias (slug, titulo, descripcion, fecha_texto, anio, anio_aprox, anio_hasta, precision_fecha, lugar_id, foto_url, aportado_por, estado, es_demo)
  values ('familia-buearc-2020', 'Familia Buearc, el mismo lugar 60 años después', 'La misma esquina que la foto de 1960. Seguimos siendo del mismo partido político, hinchas de River y de Chevrolet.', '2020', 2020, false, null, 'anio',
          (select id from lugares where slug = 'av-de-las-americas-680'), '/memorias/25-de-noviembre-del-2020-buearc-960.jpg', 'Graciela Buearc', 'pendiente', false)
  on conflict (slug) do update set titulo = excluded.titulo, fecha_texto = excluded.fecha_texto,
    anio = excluded.anio, anio_aprox = excluded.anio_aprox, anio_hasta = excluded.anio_hasta,
    precision_fecha = excluded.precision_fecha, lugar_id = excluded.lugar_id, foto_url = excluded.foto_url;
insert into memorias (slug, titulo, descripcion, fecha_texto, anio, anio_aprox, anio_hasta, precision_fecha, lugar_id, foto_url, aportado_por, estado, es_demo)
  values ('abuelos-signer-1943', 'Los abuelos Signer', null, '1943', 1943, false, null, 'anio',
          null, '/memorias/1943-monica-signer-1054.jpg', 'Mónica Signer', 'pendiente', false)
  on conflict (slug) do update set titulo = excluded.titulo, fecha_texto = excluded.fecha_texto,
    anio = excluded.anio, anio_aprox = excluded.anio_aprox, anio_hasta = excluded.anio_hasta,
    precision_fecha = excluded.precision_fecha, lugar_id = excluded.lugar_id, foto_url = excluded.foto_url;
insert into memorias (slug, titulo, descripcion, fecha_texto, anio, anio_aprox, anio_hasta, precision_fecha, lugar_id, foto_url, aportado_por, estado, es_demo)
  values ('carroza-1967', 'Una carroza', null, '1967 Aprox', 1967, true, null, 'circa',
          null, '/memorias/carroza-1967-aprox-1600.jpg', 'Bárbara Núñez', 'pendiente', false)
  on conflict (slug) do update set titulo = excluded.titulo, fecha_texto = excluded.fecha_texto,
    anio = excluded.anio, anio_aprox = excluded.anio_aprox, anio_hasta = excluded.anio_hasta,
    precision_fecha = excluded.precision_fecha, lugar_id = excluded.lugar_id, foto_url = excluded.foto_url;
insert into memorias (slug, titulo, descripcion, fecha_texto, anio, anio_aprox, anio_hasta, precision_fecha, lugar_id, foto_url, aportado_por, estado, es_demo)
  values ('casa-otto-raihenbach-1966', 'La casa de los Otto - Raihenbach', null, '1966', 1966, false, null, 'anio',
          (select id from lugares where slug = 'km-1209'), '/memorias/prytuluk-1966-1047.jpg', 'Maidi Prytuluk', 'pendiente', false)
  on conflict (slug) do update set titulo = excluded.titulo, fecha_texto = excluded.fecha_texto,
    anio = excluded.anio, anio_aprox = excluded.anio_aprox, anio_hasta = excluded.anio_hasta,
    precision_fecha = excluded.precision_fecha, lugar_id = excluded.lugar_id, foto_url = excluded.foto_url;
insert into memorias (slug, titulo, descripcion, fecha_texto, anio, anio_aprox, anio_hasta, precision_fecha, lugar_id, foto_url, aportado_por, estado, es_demo)
  values ('casa-familia-reschke-1968', 'Casa de la familia Reschke', null, '1968', 1968, false, null, 'anio',
          (select id from lugares where slug = 'km-1208'), '/memorias/reschke-1968-1045.jpg', 'Maidi Prytuluk', 'pendiente', false)
  on conflict (slug) do update set titulo = excluded.titulo, fecha_texto = excluded.fecha_texto,
    anio = excluded.anio, anio_aprox = excluded.anio_aprox, anio_hasta = excluded.anio_hasta,
    precision_fecha = excluded.precision_fecha, lugar_id = excluded.lugar_id, foto_url = excluded.foto_url;
insert into memorias (slug, titulo, descripcion, fecha_texto, anio, anio_aprox, anio_hasta, precision_fecha, lugar_id, foto_url, aportado_por, estado, es_demo)
  values ('comercio-de-jueguitos', 'El comercio de los jueguitos electrónicos', null, 'pendiente', null, false, null, 'desconocida',
          (select id from lugares where slug = 'comercio-de-jueguitos'), '/memorias/juegos-900.jpg', 'Sergio Toledo', 'pendiente', false)
  on conflict (slug) do update set titulo = excluded.titulo, fecha_texto = excluded.fecha_texto,
    anio = excluded.anio, anio_aprox = excluded.anio_aprox, anio_hasta = excluded.anio_hasta,
    precision_fecha = excluded.precision_fecha, lugar_id = excluded.lugar_id, foto_url = excluded.foto_url;
insert into memorias (slug, titulo, descripcion, fecha_texto, anio, anio_aprox, anio_hasta, precision_fecha, lugar_id, foto_url, aportado_por, estado, es_demo)
  values ('escuela-425-libro-historico', 'Escuela 425 de Salto Encantado, del libro histórico', null, '1966', 1966, false, null, 'anio',
          (select id from lugares where slug = 'escuela-425-salto-encantado'), '/memorias/esc-425-salto-encantado-1500.jpg', 'Sergio Toledo', 'pendiente', false)
  on conflict (slug) do update set titulo = excluded.titulo, fecha_texto = excluded.fecha_texto,
    anio = excluded.anio, anio_aprox = excluded.anio_aprox, anio_hasta = excluded.anio_hasta,
    precision_fecha = excluded.precision_fecha, lugar_id = excluded.lugar_id, foto_url = excluded.foto_url;
insert into memorias (slug, titulo, descripcion, fecha_texto, anio, anio_aprox, anio_hasta, precision_fecha, lugar_id, foto_url, aportado_por, estado, es_demo)
  values ('calcomania-tito-salinas-1987', 'Calcomanía de campaña de Tito Salinas', 'Candidato a intendente de Aristóbulo. «Si encuentra otro mejor, vótelo».', '1987', 1987, false, null, 'anio',
          null, '/memorias/tito-salinas-1987-1600.jpg', 'Sergio Toledo, enviada por Ricardo Jorge Vallejos', 'pendiente', false)
  on conflict (slug) do update set titulo = excluded.titulo, fecha_texto = excluded.fecha_texto,
    anio = excluded.anio, anio_aprox = excluded.anio_aprox, anio_hasta = excluded.anio_hasta,
    precision_fecha = excluded.precision_fecha, lugar_id = excluded.lugar_id, foto_url = excluded.foto_url;
insert into memorias (slug, titulo, descripcion, fecha_texto, anio, anio_aprox, anio_hasta, precision_fecha, lugar_id, foto_url, aportado_por, estado, es_demo)
  values ('gran-premio-turismo-carretera-1949', 'El Gran Premio de Turismo Carretera por la Ruta 14 vieja', 'El 25 de noviembre de 1949 se disputaba la XI etapa del Gran Premio de la República, que recorrió 11.035 km en 12 etapas y pasó aquel día por la incipiente Colonia Aristóbulo del Valle.', '1949', 1949, false, null, 'anio',
          (select id from lugares where slug = 'ruta-14-vieja'), '/memorias/fangio-1-350.jpg', 'Sergio Toledo', 'pendiente', false)
  on conflict (slug) do update set titulo = excluded.titulo, fecha_texto = excluded.fecha_texto,
    anio = excluded.anio, anio_aprox = excluded.anio_aprox, anio_hasta = excluded.anio_hasta,
    precision_fecha = excluded.precision_fecha, lugar_id = excluded.lugar_id, foto_url = excluded.foto_url;
insert into memorias (slug, titulo, descripcion, fecha_texto, anio, anio_aprox, anio_hasta, precision_fecha, lugar_id, foto_url, aportado_por, estado, es_demo)
  values ('desfile-25-de-mayo-1961', 'Desfile del 25 de Mayo', null, '1961', 1961, false, null, 'anio',
          (select id from lugares where slug = 'avenida-centro'), '/memorias/desfile-25-de-mayo-1961-720.jpg', null, 'pendiente', false)
  on conflict (slug) do update set titulo = excluded.titulo, fecha_texto = excluded.fecha_texto,
    anio = excluded.anio, anio_aprox = excluded.anio_aprox, anio_hasta = excluded.anio_hasta,
    precision_fecha = excluded.precision_fecha, lugar_id = excluded.lugar_id, foto_url = excluded.foto_url;
insert into memorias (slug, titulo, descripcion, fecha_texto, anio, anio_aprox, anio_hasta, precision_fecha, lugar_id, foto_url, aportado_por, estado, es_demo)
  values ('reina-de-los-estudiantes-1963', 'Reina de los estudiantes', null, '1963', 1963, false, null, 'anio',
          (select id from lugares where slug = 'avenida-centro'), '/memorias/morocha-fontana-1963-720.jpg', 'Isabel Dos Santos', 'pendiente', false)
  on conflict (slug) do update set titulo = excluded.titulo, fecha_texto = excluded.fecha_texto,
    anio = excluded.anio, anio_aprox = excluded.anio_aprox, anio_hasta = excluded.anio_hasta,
    precision_fecha = excluded.precision_fecha, lugar_id = excluded.lugar_id, foto_url = excluded.foto_url;
insert into memorias (slug, titulo, descripcion, fecha_texto, anio, anio_aprox, anio_hasta, precision_fecha, lugar_id, foto_url, aportado_por, estado, es_demo)
  values ('campana-antivariolica-1977', 'Campaña de vacunación antivariólica en la Escuela Normal', null, '1977', 1977, false, null, 'anio',
          (select id from lugares where slug = 'escuela-normal'), null, null, 'pendiente', false)
  on conflict (slug) do update set titulo = excluded.titulo, fecha_texto = excluded.fecha_texto,
    anio = excluded.anio, anio_aprox = excluded.anio_aprox, anio_hasta = excluded.anio_hasta,
    precision_fecha = excluded.precision_fecha, lugar_id = excluded.lugar_id, foto_url = excluded.foto_url;
insert into memorias (slug, titulo, descripcion, fecha_texto, anio, anio_aprox, anio_hasta, precision_fecha, lugar_id, foto_url, aportado_por, estado, es_demo)
  values ('enfermeras-unidad-sanitaria-1975', 'Enfermeras de la Unidad Sanitaria', null, null, null, false, null, 'desconocida',
          (select id from lugares where slug = 'unidad-sanitaria'), null, 'Isabel Dos Santos, gentileza de Marlene Abranson', 'pendiente', false)
  on conflict (slug) do update set titulo = excluded.titulo, fecha_texto = excluded.fecha_texto,
    anio = excluded.anio, anio_aprox = excluded.anio_aprox, anio_hasta = excluded.anio_hasta,
    precision_fecha = excluded.precision_fecha, lugar_id = excluded.lugar_id, foto_url = excluded.foto_url;

-- ---------- fotos ----------
insert into memoria_fotos (memoria_id, url, orden, ancho, alto)
  values ((select id from memorias where slug = 'plantel-escuela-406-1985'), '/memorias/406-1985-1986-1421.jpg', 0, 1421, 900)
  on conflict (memoria_id, url) do update set orden = excluded.orden;
insert into memoria_fotos (memoria_id, url, orden, ancho, alto)
  values ((select id from memorias where slug = 'entrega-del-acervo-al-municipio'), '/memorias/7-oct-2025-1080.jpg', 0, 1080, 753)
  on conflict (memoria_id, url) do update set orden = excluded.orden;
insert into memoria_fotos (memoria_id, url, orden, ancho, alto)
  values ((select id from memorias where slug = 'familia-buearc-1960'), '/memorias/1960-aprox-buearc-960.jpg', 0, 960, 720)
  on conflict (memoria_id, url) do update set orden = excluded.orden;
insert into memoria_fotos (memoria_id, url, orden, ancho, alto)
  values ((select id from memorias where slug = 'familia-buearc-2020'), '/memorias/25-de-noviembre-del-2020-buearc-960.jpg', 0, 960, 728)
  on conflict (memoria_id, url) do update set orden = excluded.orden;
insert into memoria_fotos (memoria_id, url, orden, ancho, alto)
  values ((select id from memorias where slug = 'abuelos-signer-1943'), '/memorias/1943-monica-signer-1054.jpg', 0, 1054, 575)
  on conflict (memoria_id, url) do update set orden = excluded.orden;
insert into memoria_fotos (memoria_id, url, orden, ancho, alto)
  values ((select id from memorias where slug = 'carroza-1967'), '/memorias/carroza-1967-aprox-1600.jpg', 0, 2048, 1117)
  on conflict (memoria_id, url) do update set orden = excluded.orden;
insert into memoria_fotos (memoria_id, url, orden, ancho, alto)
  values ((select id from memorias where slug = 'casa-otto-raihenbach-1966'), '/memorias/prytuluk-1966-1047.jpg', 0, 1047, 675)
  on conflict (memoria_id, url) do update set orden = excluded.orden;
insert into memoria_fotos (memoria_id, url, orden, ancho, alto)
  values ((select id from memorias where slug = 'casa-familia-reschke-1968'), '/memorias/reschke-1968-1045.jpg', 0, 1045, 604)
  on conflict (memoria_id, url) do update set orden = excluded.orden;
insert into memoria_fotos (memoria_id, url, orden, ancho, alto)
  values ((select id from memorias where slug = 'comercio-de-jueguitos'), '/memorias/juegos-900.jpg', 0, 900, 600)
  on conflict (memoria_id, url) do update set orden = excluded.orden;
insert into memoria_fotos (memoria_id, url, orden, ancho, alto)
  values ((select id from memorias where slug = 'escuela-425-libro-historico'), '/memorias/esc-425-salto-encantado-1500.jpg', 0, 1500, 958)
  on conflict (memoria_id, url) do update set orden = excluded.orden;
insert into memoria_fotos (memoria_id, url, orden, ancho, alto)
  values ((select id from memorias where slug = 'escuela-425-libro-historico'), '/memorias/esc-425-salto-encantado-2-1425.jpg', 1, 1425, 859)
  on conflict (memoria_id, url) do update set orden = excluded.orden;
insert into memoria_fotos (memoria_id, url, orden, ancho, alto)
  values ((select id from memorias where slug = 'escuela-425-libro-historico'), '/memorias/esc-425-salto-encantado-3-1451.jpg', 2, 1451, 860)
  on conflict (memoria_id, url) do update set orden = excluded.orden;
insert into memoria_fotos (memoria_id, url, orden, ancho, alto)
  values ((select id from memorias where slug = 'calcomania-tito-salinas-1987'), '/memorias/tito-salinas-1987-1600.jpg', 0, 1600, 720)
  on conflict (memoria_id, url) do update set orden = excluded.orden;
insert into memoria_fotos (memoria_id, url, orden, ancho, alto)
  values ((select id from memorias where slug = 'gran-premio-turismo-carretera-1949'), '/memorias/fangio-1-350.jpg', 0, 350, 479)
  on conflict (memoria_id, url) do update set orden = excluded.orden;
insert into memoria_fotos (memoria_id, url, orden, ancho, alto)
  values ((select id from memorias where slug = 'gran-premio-turismo-carretera-1949'), '/memorias/fangio-2-362.jpg', 1, 362, 500)
  on conflict (memoria_id, url) do update set orden = excluded.orden;
insert into memoria_fotos (memoria_id, url, orden, ancho, alto)
  values ((select id from memorias where slug = 'gran-premio-turismo-carretera-1949'), '/memorias/juan-galvez-1280.jpg', 2, 1280, 640)
  on conflict (memoria_id, url) do update set orden = excluded.orden;
insert into memoria_fotos (memoria_id, url, orden, ancho, alto)
  values ((select id from memorias where slug = 'desfile-25-de-mayo-1961'), '/memorias/desfile-25-de-mayo-1961-720.jpg', 0, 720, 450)
  on conflict (memoria_id, url) do update set orden = excluded.orden;
insert into memoria_fotos (memoria_id, url, orden, ancho, alto)
  values ((select id from memorias where slug = 'reina-de-los-estudiantes-1963'), '/memorias/morocha-fontana-1963-720.jpg', 0, 720, 1280)
  on conflict (memoria_id, url) do update set orden = excluded.orden;

-- ---------- apariciones ----------
-- confianza = probable: los nombres vienen del relato de un vecino, no de
-- un documento. Que alguien diga quién está en la foto no es lo mismo que
-- verificarlo, y el modelo distingue las dos cosas.
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'plantel-escuela-406-1985'), (select id from personas where slug = 'nelida-ramirez'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'plantel-escuela-406-1985'), (select id from personas where slug = 'delfia-carloto'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'plantel-escuela-406-1985'), (select id from personas where slug = 'nelly-schoninger'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'plantel-escuela-406-1985'), (select id from personas where slug = 'gladiz-engel'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'plantel-escuela-406-1985'), (select id from personas where slug = 'goya'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'plantel-escuela-406-1985'), (select id from personas where slug = 'pocha-casco'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'plantel-escuela-406-1985'), (select id from personas where slug = 'amalia-haureluk'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'plantel-escuela-406-1985'), (select id from personas where slug = 'susana-carson'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'plantel-escuela-406-1985'), (select id from personas where slug = 'luba-novosad'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'plantel-escuela-406-1985'), (select id from personas where slug = 'mabel-oberenko'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'plantel-escuela-406-1985'), (select id from personas where slug = 'angelita-pereira'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'plantel-escuela-406-1985'), (select id from personas where slug = 'morocha-fontana'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'plantel-escuela-406-1985'), (select id from personas where slug = 'yolanda-llamosas'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'plantel-escuela-406-1985'), (select id from personas where slug = 'roberto-ramirez'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'plantel-escuela-406-1985'), (select id from personas where slug = 'delicia-zelmer'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'plantel-escuela-406-1985'), (select id from personas where slug = 'mabel-zurakouski'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'abuelos-signer-1943'), (select id from personas where slug = 'hernann-signer'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'abuelos-signer-1943'), (select id from personas where slug = 'alette-mechtilde-bongers'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'abuelos-signer-1943'), (select id from personas where slug = 'alfredo-signer'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'abuelos-signer-1943'), (select id from personas where slug = 'walter-signer'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'abuelos-signer-1943'), (select id from personas where slug = 'rodolfo-signer'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'carroza-1967'), (select id from personas where slug = 'juan-nunez'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'carroza-1967'), (select id from personas where slug = 'lucy-dominguez-de-beitia'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'carroza-1967'), (select id from personas where slug = 'angelica-zilke'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'casa-familia-reschke-1968'), (select id from personas where slug = 'nilda-reschke'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'calcomania-tito-salinas-1987'), (select id from personas where slug = 'tito-salinas'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'gran-premio-turismo-carretera-1949'), (select id from personas where slug = 'juan-manuel-fangio'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'gran-premio-turismo-carretera-1949'), (select id from personas where slug = 'juan-galvez'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'reina-de-los-estudiantes-1963'), (select id from personas where slug = 'morocha-fontana'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'reina-de-los-estudiantes-1963'), (select id from personas where slug = 'carmen-ramirez'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'reina-de-los-estudiantes-1963'), (select id from personas where slug = 'mirta-bianchetti'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'campana-antivariolica-1977'), (select id from personas where slug = 'petrona-torres'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'campana-antivariolica-1977'), (select id from personas where slug = 'iracema-arguello'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'campana-antivariolica-1977'), (select id from personas where slug = 'potschka'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'campana-antivariolica-1977'), (select id from personas where slug = 'prevelis'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'enfermeras-unidad-sanitaria-1975'), (select id from personas where slug = 'margarita-gerber'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'enfermeras-unidad-sanitaria-1975'), (select id from personas where slug = 'susana-nowitzki'), 'probable')
  on conflict do nothing;
insert into memoria_personas (memoria_id, persona_id, confianza)
  values ((select id from memorias where slug = 'enfermeras-unidad-sanitaria-1975'), (select id from personas where slug = 'petrona-torres'), 'probable')
  on conflict do nothing;

commit;

select (select count(*) from lugares where es_demo = false) as lugares, (select count(*) from personas where es_demo = false) as personas, (select count(*) from memorias where es_demo = false) as memorias, (select count(*) from memoria_fotos) as fotos, (select count(*) from memoria_personas mp join memorias m on m.id = mp.memoria_id where m.es_demo = false) as apariciones;
