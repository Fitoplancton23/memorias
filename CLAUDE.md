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

**Todo vínculo entre personas o linajes que no sea de parentesco tiene que
estar respaldado por una memoria real.** Si el frontend dibuja una conexión,
tiene que poder nombrar la memoria que la justifica. Una curva que no se puede
explicar no se dibuja.

**Una memoria con dos personas de familias distintas NO dice que sean
parientes.** Dice que existe una memoria que las relaciona. Son cosas
diferentes y el sistema no las mezcla: el parentesco vive en
`nucleos_familiares` y `nucleo_hijos`; lo histórico, en `memoria_personas`.

**Un lugar es una coordenada. Una memoria es un acontecimiento.** Un lugar
contiene muchas memorias de muchos años. Nunca un marcador por memoria.

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
