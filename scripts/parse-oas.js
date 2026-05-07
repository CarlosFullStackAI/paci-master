// Script para parsear los OAs extraidos de los PDFs y generar el archivo JS
const fs = require('fs');
const path = require('path');

// Path relativo al script para que funcione desde cualquier cwd.
const OAS_DIR = path.resolve(__dirname, '..', 'data', 'mineduc', 'oas');

// NT Lenguaje Verbal (Tercer Nivel = NT1+NT2)
const NT_LENGUAJE = [
  { id: 'OA 1', texto: 'OA 1: Expresarse oralmente en forma clara y comprensible, empleando estructuras oracionales completas, conjugaciones verbales adecuadas y precisas con los tiempos, personas e intenciones comunicativas.' },
  { id: 'OA 2', texto: 'OA 2: Comprender textos orales como preguntas, explicaciones, relatos, instrucciones y algunos conceptos abstractos en distintas situaciones comunicativas, identificando la intencionalidad comunicativa de diversos interlocutores.' },
  { id: 'OA 3', texto: 'OA 3: Descubrir en contextos ludicos, atributos fonologicos de palabras conocidas, tales como conteo de palabras, segmentacion y conteo de silabas, identificacion de sonidos finales e iniciales.' },
  { id: 'OA 4', texto: 'OA 4: Comunicar oralmente temas de su interes, empleando un vocabulario variado e incorporando palabras nuevas y pertinentes a las distintas situaciones comunicativas e interlocutores.' },
  { id: 'OA 5', texto: 'OA 5: Manifestar interes por descubrir el contenido y algunos propositos de diferentes textos escritos (manipulando, explorando, realizando descripciones y conjeturas) a traves del contacto cotidiano con algunos de ellos, o del uso de TICs.' },
  { id: 'OA 6', texto: 'OA 6: Comprender contenidos explicitos de textos literarios y no literarios, a partir de la escucha atenta, describiendo informacion y realizando progresivamente inferencias y predicciones.' },
  { id: 'OA 7', texto: 'OA 7: Reconocer palabras que se encuentran en diversos soportes asociando algunos fonemas a sus correspondientes grafemas.' },
  { id: 'OA 8', texto: 'OA 8: Representar graficamente algunos trazos, letras, signos, palabras significativas y mensajes simples legibles, utilizando diferentes recursos y soportes en situaciones autenticas.' },
  { id: 'OA 9', texto: 'OA 9: Comunicar mensajes simples en la lengua indigena pertinente a la comunidad donde habita.' },
  { id: 'OA 10', texto: 'OA 10: Reconocer algunas palabras o mensajes sencillos de lenguas maternas de sus pares, distintas al castellano.' },
];

// NT Pensamiento Matematico (Tercer Nivel = NT1+NT2)
const NT_MATEMATICA = [
  { id: 'OA 1', texto: 'OA 1: Crear patrones sonoros, visuales, gestuales, corporales u otros, de dos o tres elementos.' },
  { id: 'OA 2', texto: 'OA 2: Experimentar con diversos objetos estableciendo relaciones al clasificar por dos o tres atributos a la vez (forma, color, tamano, funcion, masa, materialidad, entre otros) y seriar por altura, ancho, longitud o capacidad para contener.' },
  { id: 'OA 3', texto: 'OA 3: Comunicar la posicion de objetos y personas respecto de un punto u objeto de referencia, empleando conceptos de ubicacion (dentro/fuera; encima/debajo/entre; al frente de/detras de); distancia (cerca/lejos) y direccion (adelante/atras/hacia el lado), en situaciones ludicas.' },
  { id: 'OA 4', texto: 'OA 4: Emplear cuantificadores, tales como: "mas que", "menos que", "igual que", al comparar cantidades de objetos en situaciones cotidianas.' },
  { id: 'OA 5', texto: 'OA 5: Orientarse temporalmente en situaciones cotidianas, empleando nociones y relaciones de secuencia (antes/ahora/despues/al mismo tiempo, dia/noche), frecuencia (siempre/a veces/nunca) y duracion (larga/corta).' },
  { id: 'OA 6', texto: 'OA 6: Emplear los numeros, para contar, identificar, cuantificar y comparar cantidades hasta el 20 e indicar orden o posicion de algunos elementos en situaciones cotidianas o juegos.' },
  { id: 'OA 7', texto: 'OA 7: Representar numeros y cantidades hasta el 10, en forma concreta, pictorica y simbolica.' },
  { id: 'OA 8', texto: 'OA 8: Resolver problemas simples de manera concreta y pictorica agregando o quitando hasta 10 elementos, comunicando las acciones llevadas a cabo.' },
  { id: 'OA 9', texto: 'OA 9: Representar objetos desde arriba, del lado, abajo, a traves de dibujos, fotografias o TICs, formulando conjeturas frente a sus descubrimientos.' },
  { id: 'OA 10', texto: 'OA 10: Identificar atributos de figuras 2D y 3D, tales como: forma, cantidad de lados, vertices, caras, que observa en forma directa o a traves de TICs.' },
  { id: 'OA 11', texto: 'OA 11: Emplear medidas no estandarizadas, para determinar longitud de objetos, registrando datos, en diversas situaciones ludicas o actividades cotidianas.' },
  { id: 'OA 12', texto: 'OA 12: Comunicar el proceso desarrollado en la resolucion de problemas concretos, identificando la pregunta, acciones y posibles respuestas.' },
];

console.log('NT Lenguaje:', NT_LENGUAJE.length, 'OAs');
console.log('NT Matematica:', NT_MATEMATICA.length, 'OAs');

// Now parse Lenguaje 1-6 from raw text
const rawLeng = fs.readFileSync(path.join(OAS_DIR, 'lenguaje_raw.txt'), 'utf-8');

// Helper to extract OAs from text blocks
function parseOAs(text, prefix) {
  const oas = [];
  // Match patterns like "1   texto..." or "OA 1  texto..."
  const regex = /(?:^|\s)(\d{1,2})\s{2,}([A-Z][^]*?)(?=\s{2,}\d{1,2}\s{2,}[A-Z]|$)/gm;
  let match;
  let counter = 1;

  // Simpler approach: split by numbered items
  const lines = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const parts = lines.split(/(?<=\.\s)\s*(?=\d{1,2}\s{3})/);

  parts.forEach(part => {
    const m = part.match(/^(\d{1,2})\s{2,}(.+)/);
    if (m) {
      const num = parseInt(m[1]);
      let txt = m[2].trim().replace(/\s+/g, ' ');
      // Clean up - remove page numbers and headers
      txt = txt.replace(/\d{3}\s+Bases Curriculares.*?Básico\s*/g, '');
      txt = txt.replace(/Lenguaje y Comunicación\s+\d{3}\s*/g, '');
      if (txt.length > 20) {
        oas.push({ id: `${prefix} ${num}`, texto: `${prefix} ${num}: ${txt}` });
      }
    }
  });

  return oas;
}

// For now, output what we have for verification
console.log('\nRaw Lenguaje text length:', rawLeng.length, 'chars');

// Find grade boundaries
const grades = ['Primero', 'Segundo', 'Tercero', 'Cuarto', 'Quinto', 'Sexto'];
const gradeKeys = ['1b', '2b', '3b', '4b', '5b', '6b'];

grades.forEach((g, i) => {
  const idx = rawLeng.indexOf(g + ' Básico');
  if (idx > -1) console.log(g + ' Basico found at char ' + idx);
  else {
    const idx2 = rawLeng.indexOf(g + ' básico');
    if (idx2 > -1) console.log(g + ' basico found at char ' + idx2);
    else console.log(g + ' NOT FOUND');
  }
});
