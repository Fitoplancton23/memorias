/* El nombre y el lugar viven acá y en ningún otro lado: si mañana el archivo
   es de otro municipio, se cambia este archivo y el sitio entero lo sigue. */
export const sitio = {
  nombre: 'Memorias',
  lugar: 'Aristóbulo del Valle',
  /* Los parajes que el archivo abarca, en el orden en que se nombran.
     Cerro Moreno estaba acá por error: es un paraje DENTRO de Salto
     Encantado, no un tercer municipio al lado. Nombrarlo aparte repartía en
     tres lo que son dos, y a quien vive ahí le decía que su paraje es otra
     cosa que Salto Encantado. Sigue existiendo como lugar del archivo —el
     Paraje Cerro Moreno tiene memorias y marcador propio—, que es donde
     corresponde: un lugar, no un territorio. */
  parajes: ['Aristóbulo del Valle', 'Salto Encantado'],
  provincia: 'Misiones',
};

/* Quién sostiene el archivo y cómo se le escribe. Vive acá por la misma razón
   que el nombre del pueblo: lo usan el pie de página y el pedido de "puedo
   aportar un dato", y un teléfono escrito en dos lados es un teléfono que
   mañana queda viejo en uno de los dos. */
export const estudio = {
  nombre: 'Estudio Conecta',
  autor: 'Facundo Silveira',
  correo: 'studio.conecta.gestion@gmail.com',
  /* En formato internacional y sin signos: así lo quiere wa.me. */
  whatsapp: '543755505926',
  whatsappVisible: '+54 3755 50-5926',
};

export const tituloSitio = `${sitio.nombre} · ${sitio.lugar}`;
export const parajes = sitio.parajes.join(' · ');
