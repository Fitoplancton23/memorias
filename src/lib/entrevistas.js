/* Las entrevistas a los pioneros, grabadas en video.
   ==========================================================================
   Son la otra mitad del archivo. Las memorias que entran por el panel son
   fotografías y relatos escritos; esto es la voz de alguien que estuvo —don
   Albino, Yaluk, Tino Grahl— contando lo que vio. No hay nada en una ficha
   que haga lo que hacen quince minutos de alguien hablando.

   Los títulos son los que tienen en YouTube, tal cual, y por eso varios
   arrancan con «MEMORIAS DE NUESTRO PUEBLO. Nº…». Acá adentro el número va
   por separado y el título va sin ese arranque: repetir el nombre del
   archivo ocho veces adentro del archivo es ruido, y además tapa lo único
   que distingue a una entrevista de otra, que es a quién se entrevista.
   El título entero igual viaja: es lo que lee un lector de pantalla y lo que
   se ve al pasar el mouse.

   Una no es de la serie —«Coloñero Kuery»— y entra igual, sin número
   inventado. Poner un «Nº 8» que YouTube no dice sería inventar un dato.

   No se guardan en la base: no son memorias cargadas por el panel ni pasan
   por la compuerta del permiso. Son ocho filas que cambian una vez por año. */

export const entrevistas = [
  { id: 'bmdpNkBv6n0', numero: 1,
    titulo: 'Entrevista a don Albino Potchka',
    completo: 'MEMORIAS DE NUESTRO PUEBLO. Nº1 Entrevista a don Albino Potchka' },
  { id: 'DDIlC6JehmU', numero: 2,
    titulo: 'Juan Bautista Yaluk sobre la fundación de Aristóbulo del Valle',
    completo: 'MEMORIAS DE NUESTRO PUEBLO. Nº2 Juan Bautista Yaluk sobre la fundación de Aristobulo del Valle' },
  { id: 'C6Zpw17eVGc', numero: 3,
    titulo: 'Juan B. Yaluk: inicios de la Cooperativa Cainguás Lda.',
    completo: 'MEMORIAS DE NUESTRO PUEBLO. Nº3, Juan B. Yaluk: Inicios de la Cooperativa CAINGUÁS Lda.' },
  { id: '1Q3HucwbJM0', numero: 4,
    titulo: 'Chiquito Ramírez responde a Yaluk',
    completo: 'MEMORIAS DE NUESTRO PUEBLO. Nº4 . Chiquito Ramírez responde a Yaluk' },
  { id: 'poN3O0qnFww', numero: 5,
    titulo: 'Entrevista a don Tino Grahl',
    completo: 'MEMORIAS DE NUESTRO PUEBLO. Nº5 Entrevista a don TINO GRAHL' },
  { id: '3zYoxxf4khI', numero: 6,
    titulo: 'Ivone Schünke: en los inicios de Aristóbulo del Valle',
    completo: 'MEMORIAS DE NUESTRO PUEBLO. Nº6 IVONE SCHÜNKE: en los inicios de A. del Valle' },
  { id: 'b08a_2FJ31E', numero: 7,
    titulo: 'Armando Friedrich: Salto Encantado entre 1940 y 1960',
    completo: 'MEMORIAS DE NUESTRO PUEBLO Nº 7 (Salto Encantado entre 1940 y 1960) con ARMANDO FRIEDRICH' },
  { id: 'WQpBrRH8unU', numero: null,
    titulo: 'Coloñero Kuery, por Santa Chamorro (Taller Pororó)',
    completo: 'COLOÑERO KUERY por Santa Chamorro (Taller Pororó)' },
];

/* La imagen de tapa que YouTube ya tiene de cada video. `i.ytimg.com` sirve
   imágenes y no pone cookies — a diferencia del reproductor, que las pone
   apenas se dibuja, mire o no mire alguien el video. */
export const tapa = id => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/* El reproductor recién aparece cuando alguien aprieta play, y en el dominio
   sin cookies. Ocho reproductores incrustados de entrada son ocho megas y
   ocho rastreadores en una página que mucha gente abre desde el pueblo con
   el dato del celular, para después entrar al mapa y no mirar ninguno. */
export const reproductor = id =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;

export const enYoutube = id => `https://www.youtube.com/watch?v=${id}`;
