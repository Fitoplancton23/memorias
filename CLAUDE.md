# Memorias de mi pueblo — reglas del proyecto

Archivo histórico de **Aristóbulo del Valle, Salto Encantado y Cerro Moreno**
(Misiones). Astro estático, datos en Supabase, build que baja a `snapshot.json`.

---

## La regla maestra

> **LA MEMORIA ES LA ENTIDAD CENTRAL DEL PROYECTO.**

Esto **no** es una aplicación de genealogía. Es un archivo de memoria histórica,
y la memoria es lo que conecta a las personas, las familias, los lugares y los
acontecimientos.

Una memoria puede ser una foto familiar, una foto de un acontecimiento, una
casa, una institución, una obra pública, una celebración, una escena cotidiana
o un relato. Todas valen lo mismo.

### Lo que se sigue de ahí

**Una memoria incompleta sigue siendo una memoria.** Que falte la fecha, la
ubicación o el nombre de quienes aparecen **nunca** es motivo para descartarla,
esconderla ni "resolverla" inventando. La incertidumbre es un dato: se muestra,
no se tapa.

**Todo vínculo que no sea de parentesco tiene que estar respaldado por una
memoria real.** Vale entre personas, entre linajes, y también entre una
persona y un lugar o un acontecimiento: si el frontend dibuja una conexión,
tiene que poder nombrar la memoria que la justifica. Una curva que no se puede
explicar no se dibuja.

Y la leyenda tiene que nombrarlas a todas. Dos líneas que significan cosas
distintas tienen que verse distintas de verdad, y una línea que la leyenda no
menciona se lee como la que sí menciona: ahí el dibujo miente sin que nadie lo
haya decidido.

**Una memoria con dos personas de familias distintas NO dice que sean
parientes.** Dice que existe una memoria que las relaciona. Son cosas
diferentes y el sistema no las mezcla: el parentesco vive en
`nucleos_familiares` y `nucleo_hijos`; lo histórico, en `memoria_personas`.

**Un lugar es una entidad, no una coordenada.** Es un sitio con nombre —la
Escuela Normal, la casa de Juan Potkova, la vieja terminal— y tiene una
coordenada representativa que se fija una vez y sólo cambia si alguien la
edita. Nunca se recalcula sola: un mapa cuyos marcadores se corren cada vez
que entra una foto es un mapa en el que no se puede confiar.

**Una memoria puede tener su propia ubicación, más precisa que la del lugar y
distinta de ella.** El patio y el salón de actos son dos puntos dentro de la
misma escuela, y no son dos lugares. Esa coordenada se guarda con toda la
precisión disponible aunque hoy la pantalla todavía no haga nada espectacular
con ella: mañana puede sostener recorridos, reconstrucciones o comparar una
fotografía vieja con el espacio actual.

**Nunca perder precisión disponible. Nunca inventar precisión que no
tenemos.** Si sólo se sabe el lugar, la memoria no lleva punto, y eso no es un
hueco: es el dato. Y una memoria puede tener punto sin tener lugar —alguien
reconoce la esquina pero no sabe de quién era la casa—, que también es un
estado válido y que antes se tiraba.

**El mapa general muestra lugares.** Los puntos de las memorias existen dentro
del lugar, al entrar y al acercarse, y nunca con el mismo lenguaje visual que
un lugar. Un pin por foto en el mapa general convierte el archivo en una nube
de puntos, que es exactamente lo que este proyecto no es.

**Ningún marcador queda detrás de otro.** Dos lugares a quince metros caen en
el mismo píxel cuando el mapa está alejado, y el tapado deja de existir en
pantalla sin que nada lo diga. Se separan lo mínimo necesario al dibujar —la
coordenada guardada no se toca— y, donde el corrimiento se nota, una línea fina
va hasta el punto verdadero: el mapa no finge que el lugar está ahí, dice que
lo corrió. Cubierto por tests.

**La misma memoria se alcanza desde las tres puertas:** el mapa, el archivo de
memorias, una persona y una familia. Todo lleva a todo, siempre a través de
entidades reales.

---

## Las tres puertas

| Puerta | Pregunta |
|---|---|
| **Mapa** | ¿Dónde ocurrió? |
| **Memorias** | ¿Qué ocurrió? ¿Qué sabemos? |
| **Personas y familias** | ¿Quiénes están relacionados? |

Y el tiempo —¿cómo cambió el pueblo?— no es una cuarta puerta: es el orden
natural del archivo de memorias.

No son tres sistemas independientes: es **un solo archivo de memorias visto
desde tres perspectivas**. Personas, familias, lugares, fechas y coordenadas se
desprenden de las memorias, no compiten con ellas. Por eso el recorrido es de
ida y vuelta —del árbol a la persona a sus memorias, del mapa al lugar a sus
memorias— y por eso una sola memoria alimenta las tres vistas a la vez.

El recorrido que el sistema tiene que permitir sin fricción:

```
Lugar → Memoria → Persona → Familia → Memoria → Lugar
```

Cuando una ficha de persona dice **"aparece en 5 memorias"**, ese número no es
un dato: es una puerta. Es donde ocurre el descubrimiento que justifica todo el
proyecto — *vine a buscar a mi bisabuelo, encontré su familia, descubrí cinco
memorias, descubrí que aparece con otra familia, descubrí un lugar*.

---

## La interfaz habla como una persona

Nunca se le pide a quien visita que entienda el modelo de datos. En pantalla no
existen "nodos", "aristas", "entidades" ni "documentos": existen **personas**,
**familias**, **memorias**, **lugares** y **acontecimientos**.

Buena parte del público va a tener setenta años.

---

## Prohibiciones

- **No** crear relaciones artificiales para que algo se vea mejor.
- **No** generar nodos decorativos, puntos aleatorios ni partículas.
- **No** usar fuerzas para decidir la estructura genealógica: la familia es
  grilla calculada, las fuerzas sólo acomodan el contexto.
- **No** separar una pareja: se dibuja alineada horizontalmente.
- **No** sacrificar legibilidad genealógica para reducir cruces.
- **No** mostrar cientos de conexiones con la misma intensidad.
- **No** inventar datos que el archivo no tiene. Si falta, se dice que falta.

---

## Se busca por apodo

En el pueblo nadie se busca por el nombre del documento: se busca por el
apodo —"el Negro", "la Tana"— y se escribe sin acentos, de apuro, desde el
celular. El buscador pliega tildes —la ñ también, porque se está buscando y
no escribiendo— y mira el nombre, el apellido y todos los apodos y alias por
igual. Cuando encuentra por un apodo, lo dice: un resultado que no se puede
explicar es un resultado en el que no se puede confiar. Cubierto por tests.

Un buscador que no encuentra falla en silencio: devuelve vacío, y vacío se
lee como "esa persona no está en el archivo".

---

## Lo que el archivo no sabe, lo sabe la gente

Cada memoria lleva una puerta para aportar un dato —quién es el de la
izquierda, en qué año fue, de quién era esa casa— por WhatsApp o por correo,
con el mensaje ya escrito y el enlace de la memoria adentro. El sitio es
estático y no tiene servidor: los canales son los que la gente ya usa, y eso
también es una decisión, no una limitación.

---

## El administrador no es el público

Matías cura: recibe, verifica, identifica personas, busca coordenadas, carga y
publica. Ese proceso **no se ve desde el sitio**. Para quien visita sólo existe
la memoria publicada.

El criterio de que el panel de carga esté terminado no es que funcione: es que
Matías cargue una memoria solo.

---

## Privacidad

- `vive` tiene tres estados y el tercero importa: no saber si alguien vive no es
  lo mismo que saber que no vive. Ante la duda, se presume viva por la regla de
  los 100 años y se le ocultan fechas y notas. Cubierto por tests.
- `estado = 'pendiente'` no sale al sitio. La compuerta está en la RLS.
- **El permiso de quien aportó la memoria se registra, y sin un sí anotado la
  memoria no se publica.** Tres estados, como `vive`: autorizó, todavía no se
  le preguntó, pidió que no. El tercero es el canal de baja — una memoria no se
  borra, queda con el permiso negado, porque borrarla perdería el registro de
  que alguien pidió salir. La compuerta es un trigger de la base y no una
  política de RLS: la clave secreta saltea la RLS, no un trigger. Cubierto por
  tests.
- Mientras haya datos de demostración mezclados, la cinta de aviso no se puede
  perder: una genealogía inventada de un pueblo real, sin avisar, es
  desinformación sobre familias que existen.

---

## Documentación

- `claude/arquitectura-tecnica.md` — el pipeline, el modelo, las decisiones.
- `claude/sistema-visual.md` — paleta validada, lenguaje de formas, movimiento.
- `claude/roadmap.md` — sprints y bloqueos.
- `claude/investigacion-familysearch.md` — cómo lo resuelve FamilySearch.

Antes de cambiar algo que esté escrito ahí, leerlo. Si la decisión cambia, se
actualiza el documento en el mismo movimiento — dos documentos que se
contradicen cuestan más que ninguno.
