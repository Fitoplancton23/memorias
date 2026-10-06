/* El nombre y el lugar viven acá y en ningún otro lado: si mañana el archivo
   es de otro municipio, se cambia este archivo y el sitio entero lo sigue. */
export const sitio = {
  nombre: 'Memorias',
  lugar: 'Aristóbulo del Valle',
  /* Los parajes que el archivo abarca, en el orden en que se nombran. */
  parajes: ['Aristóbulo del Valle', 'Salto Encantado', 'Cerro Moreno'],
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
