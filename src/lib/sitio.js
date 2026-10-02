/* El nombre y el lugar viven acá y en ningún otro lado: si mañana el archivo
   es de otro municipio, se cambia este archivo y el sitio entero lo sigue. */
export const sitio = {
  nombre: 'Memorias',
  lugar: 'Aristóbulo del Valle',
  /* Los parajes que el archivo abarca, en el orden en que se nombran. */
  parajes: ['Aristóbulo del Valle', 'Salto Encantado', 'Cerro Moreno'],
  provincia: 'Misiones',
};

export const tituloSitio = `${sitio.nombre} · ${sitio.lugar}`;
export const parajes = sitio.parajes.join(' · ');
