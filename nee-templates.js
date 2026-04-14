// ==========================================
// PLANTILLAS DE ESTRATEGIAS POR NEE
// Basadas en Decreto 83/2015 y Decreto 170/2009
// Principios DUA (Diseño Universal para el Aprendizaje)
// ==========================================

const NEE_TEMPLATES = {

  // ==========================================
  // NECESIDADES EDUCATIVAS TRANSITORIAS (NEET)
  // ==========================================

  tel_e: {
    nombre: 'Trastorno Especifico del Lenguaje (TEL) Expresivo',
    tipo: 'NEET',
    decreto: 'D. 170',
    descripcion: 'Dificultad en la produccion del lenguaje oral, con comprension relativamente conservada.',
    estrategias_dua: {
      representacion: [
        'Usar apoyos visuales (imagenes, pictogramas) para acompanar instrucciones orales',
        'Presentar la informacion en multiples formatos: visual, auditivo y kinestesico',
        'Utilizar organizadores graficos para estructurar contenidos',
        'Ofrecer vocabulario clave con imagenes antes de cada clase'
      ],
      accion_expresion: [
        'Permitir respuestas no verbales (senalar, dibujar, usar pictogramas)',
        'Ofrecer tiempo adicional para formulaciones orales',
        'Aceptar respuestas por frases simples o palabras clave',
        'Usar modelado verbal: el docente reformula lo que el estudiante intenta expresar'
      ],
      implicacion: [
        'Crear ambiente seguro para la expresion oral sin presion',
        'Realizar actividades en grupos pequenos para favorecer la interaccion',
        'Valorar los intentos comunicativos independientemente de la forma',
        'Usar juegos de roles y dramatizaciones para motivar la expresion'
      ]
    },
    adecuaciones_acceso: [
      'Ubicacion preferencial cerca del docente',
      'Material impreso con letra ampliada y apoyos visuales',
      'Uso de tablet o dispositivo con software de apoyo comunicacional',
      'Tiempo adicional en evaluaciones orales (50% mas)'
    ],
    adecuaciones_evaluacion: [
      'Evaluacion oral con preguntas cerradas o de opcion multiple',
      'Uso de respuestas por senalizacion o seleccion de imagenes',
      'Evaluaciones practicas y de desempeno por sobre las escritas',
      'Rubrica adaptada que valore el contenido sobre la forma de expresion'
    ]
  },

  tel_m: {
    nombre: 'Trastorno Especifico del Lenguaje (TEL) Mixto',
    tipo: 'NEET',
    decreto: 'D. 170',
    descripcion: 'Dificultad tanto en la comprension como en la produccion del lenguaje oral.',
    estrategias_dua: {
      representacion: [
        'Simplificar instrucciones: oraciones cortas, vocabulario concreto',
        'Acompanar toda instruccion verbal con apoyo visual (imagenes, gestos)',
        'Segmentar la informacion en pasos pequenos y secuenciales',
        'Verificar comprension frecuentemente con preguntas si/no'
      ],
      accion_expresion: [
        'Ofrecer multiples formas de respuesta (oral, escrita, grafica, gestual)',
        'Proporcionar plantillas y organizadores para estructurar respuestas',
        'Uso de comunicacion aumentativa si es necesario (pictogramas ARASAAC)',
        'Modelar respuestas esperadas antes de solicitar produccion'
      ],
      implicacion: [
        'Actividades con material concreto y manipulativo',
        'Trabajo colaborativo con pares que modelen lenguaje',
        'Retroalimentacion inmediata y positiva',
        'Vincular contenidos con experiencias cotidianas del estudiante'
      ]
    },
    adecuaciones_acceso: [
      'Ubicacion preferencial con contacto visual directo',
      'Reduccion de estimulos auditivos distractores',
      'Material concreto y manipulativo para cada actividad',
      'Agendas visuales diarias para anticipar actividades'
    ],
    adecuaciones_evaluacion: [
      'Evaluaciones con apoyo visual y contexto concreto',
      'Preguntas de seleccion multiple con imagenes',
      'Reduccion del numero de items por evaluacion',
      'Tiempo adicional (50-100% mas segun severidad)'
    ]
  },

  dea: {
    nombre: 'Dificultades Especificas del Aprendizaje (DEA)',
    tipo: 'NEET',
    decreto: 'D. 170',
    descripcion: 'Dificultades persistentes en lectura, escritura y/o matematica que no se explican por discapacidad intelectual.',
    estrategias_dua: {
      representacion: [
        'Presentar textos con formato accesible: interlineado amplio, fuente clara (14pt+)',
        'Ofrecer material en formato de audio complementario',
        'Destacar informacion clave con colores y negritas',
        'Usar esquemas y mapas conceptuales para resumir contenidos'
      ],
      accion_expresion: [
        'Permitir el uso de calculadora en problemas no relacionados con calculo',
        'Ofrecer opciones de formato para trabajos (digital, oral, grafico)',
        'Proporcionar guias de escritura con estructura visible (inicio-desarrollo-cierre)',
        'Permitir el uso de corrector ortografico y herramientas digitales'
      ],
      implicacion: [
        'Fragmentar tareas largas en pasos manejables con checkpoints',
        'Establecer metas parciales alcanzables para mantener la motivacion',
        'Ofrecer retroalimentacion frecuente centrada en el proceso',
        'Vincular actividades con intereses del estudiante'
      ]
    },
    adecuaciones_acceso: [
      'Material fotocopiado (no copiar del pizarron)',
      'Guias con espacio amplio para escribir',
      'Uso de cuadernos con pauta grande o cuadricula',
      'Acceso a diccionario y material de consulta durante evaluaciones'
    ],
    adecuaciones_evaluacion: [
      'Lectura en voz alta de enunciados por parte del docente',
      'Evaluaciones orales complementarias a las escritas',
      'Redaccion de respuestas sin penalizar ortografia',
      'Tiempo adicional (30-50% mas)'
    ]
  },

  tda: {
    nombre: 'Trastorno de Deficit Atencional (TDA/TDAH)',
    tipo: 'NEET',
    decreto: 'D. 170',
    descripcion: 'Patron persistente de inatención y/o hiperactividad-impulsividad que interfiere con el aprendizaje.',
    estrategias_dua: {
      representacion: [
        'Instrucciones breves, claras y una a la vez',
        'Usar senales visuales y auditivas para captar la atencion',
        'Resaltar la informacion mas importante con colores',
        'Presentar la tarea dividida en bloques cortos (10-15 minutos)'
      ],
      accion_expresion: [
        'Ofrecer pausas de movimiento entre actividades (brain breaks)',
        'Permitir fidgets o herramientas de autorregulacion',
        'Alternar entre tareas que requieren atencion y tareas activas',
        'Proporcionar listas de verificacion para tareas multi-paso'
      ],
      implicacion: [
        'Utilizar sistema de refuerzo positivo inmediato',
        'Establecer rutinas predecibles con transiciones claras',
        'Ofrecer opciones de actividades para aumentar motivacion intrinseca',
        'Asignar responsabilidades que canalicen la energia (repartir material, etc.)'
      ]
    },
    adecuaciones_acceso: [
      'Ubicacion preferencial lejos de ventanas y puertas',
      'Escritorio libre de distractores (solo material de la actividad)',
      'Uso de timer visual para gestionar tiempos',
      'Agenda escrita con tareas y plazos visibles'
    ],
    adecuaciones_evaluacion: [
      'Evaluaciones parcializadas en sesiones mas cortas',
      'Ambiente con minimos distractores (sala aparte si es necesario)',
      'Instrucciones resaltadas o subrayadas en la prueba',
      'Tiempo adicional (30% mas) con pausas intermedias'
    ]
  },

  fil: {
    nombre: 'Funcionamiento Intelectual Rango Limitrofe (FIL)',
    tipo: 'NEET',
    decreto: 'D. 170',
    descripcion: 'Rendimiento intelectual en el rango limitrofe (CI 70-84) que afecta el aprendizaje escolar.',
    estrategias_dua: {
      representacion: [
        'Simplificar el lenguaje de instrucciones y textos',
        'Usar material concreto y manipulativo antes del abstracto',
        'Ofrecer multiples ejemplos y contraejemplos',
        'Conectar contenidos nuevos con conocimientos previos de forma explicita'
      ],
      accion_expresion: [
        'Ofrecer modelos y ejemplos de respuestas esperadas',
        'Proporcionar guias paso a paso para tareas complejas',
        'Reducir la cantidad de ejercicios manteniendo la variedad',
        'Permitir apoyo de material concreto durante evaluaciones'
      ],
      implicacion: [
        'Realizar repaso sistematico y frecuente de contenidos previos',
        'Celebrar logros parciales para mantener motivacion',
        'Trabajo cooperativo con roles definidos y alcanzables',
        'Relacionar contenidos con la vida cotidiana'
      ]
    },
    adecuaciones_acceso: [
      'Material concreto y semiconcreto permanente',
      'Guias con instrucciones paso a paso e imagenes',
      'Reduccion de contenido manteniendo los objetivos esenciales',
      'Apoyo de especialista en aula regular'
    ],
    adecuaciones_evaluacion: [
      'Evaluaciones con menor cantidad de preguntas',
      'Preguntas concretas evitando la abstraccion excesiva',
      'Uso de material de apoyo (tablas, formulas, graficos)',
      'Tiempo adicional (50% mas)'
    ]
  },

  // ==========================================
  // NECESIDADES EDUCATIVAS PERMANENTES (NEEP)
  // ==========================================

  di_l: {
    nombre: 'Discapacidad Intelectual Leve',
    tipo: 'NEEP',
    decreto: 'D. 170',
    descripcion: 'Funcionamiento intelectual significativamente bajo (CI 50-69) con limitaciones en conducta adaptativa.',
    estrategias_dua: {
      representacion: [
        'Material concreto como base permanente de toda ensenanza',
        'Instrucciones muy simples, con apoyo visual y modelado',
        'Repeticion sistematica de conceptos clave en distintos contextos',
        'Uso de rutinas predecibles para crear seguridad'
      ],
      accion_expresion: [
        'Priorizar habilidades funcionales y de la vida diaria',
        'Ofrecer modelado paso a paso antes de la practica independiente',
        'Aceptar multiples formas de demostracion del aprendizaje',
        'Reducir la exigencia de escritura, priorizar oralidad y accion'
      ],
      implicacion: [
        'Actividades significativas conectadas con la vida real',
        'Tutoria entre pares (companero tutor)',
        'Refuerzo positivo frecuente y especifico',
        'Metas cortas y alcanzables con seguimiento visible'
      ]
    },
    adecuaciones_acceso: [
      'Material concreto y semiconcreto permanente en el aula',
      'Guias con pictogramas y pasos secuenciados',
      'Actividades de la vida diaria integradas al curriculum',
      'Apoyo permanente de educador diferencial en asignaturas clave'
    ],
    adecuaciones_evaluacion: [
      'Evaluacion basada en desempeno practico',
      'OAs priorizados: eliminar contenidos no esenciales',
      'Evaluacion con material concreto y apoyo visual',
      'Criterios de logro adaptados al nivel real del estudiante'
    ]
  },

  di_m: {
    nombre: 'Discapacidad Intelectual Moderada',
    tipo: 'NEEP',
    decreto: 'D. 170',
    descripcion: 'Funcionamiento intelectual significativamente bajo (CI 35-49) con limitaciones sustanciales.',
    estrategias_dua: {
      representacion: [
        'Ensenanza basada exclusivamente en lo concreto y funcional',
        'Comunicacion con apoyo de pictogramas y gestos',
        'Rutinas altamente estructuradas y repetitivas',
        'Estimulacion multisensorial para cada concepto'
      ],
      accion_expresion: [
        'Enfoque en habilidades de autonomia personal',
        'Comunicacion alternativa aumentativa (SAAC) si es necesario',
        'Tareas con apoyo mano sobre mano y desvanecimiento gradual',
        'Uso de tecnologia asistiva adaptada'
      ],
      implicacion: [
        'Aprendizaje basado en juego y actividades vivenciales',
        'Participacion con pares en actividades adaptadas',
        'Refuerzo sensorial y social inmediato',
        'Entorno predecible y seguro emocionalmente'
      ]
    },
    adecuaciones_acceso: [
      'Plan individual con OAs significativamente adaptados',
      'Material sensorial y manipulativo especializado',
      'Apoyo permanente de educador/a diferencial y/o asistente',
      'Espacio seguro para descanso sensorial si lo requiere'
    ],
    adecuaciones_evaluacion: [
      'Evaluacion funcional basada en observacion directa',
      'Registro de logros en habilidades de la vida diaria',
      'Sin evaluaciones escritas tradicionales',
      'Criterios individualizados con escalas de progreso'
    ]
  },

  tea: {
    nombre: 'Trastorno del Espectro Autista (TEA)',
    tipo: 'NEEP',
    decreto: 'D. 170',
    descripcion: 'Condicion del neurodesarrollo con dificultades en comunicacion social y patrones restringidos de comportamiento.',
    estrategias_dua: {
      representacion: [
        'Apoyos visuales estructurados: agendas, secuencias, pictogramas',
        'Anticipar cambios en la rutina con suficiente antelacion',
        'Instrucciones claras, literales y sin ambiguedades',
        'Reducir estimulos sensoriales (luz, ruido, olores) cuando sea posible'
      ],
      accion_expresion: [
        'Ofrecer alternativas de respuesta (oral, escrita, grafica, digital)',
        'Respetar tiempos de procesamiento (no presionar respuesta inmediata)',
        'Usar intereses especificos del estudiante como vehiculo de aprendizaje',
        'Proporcionar estructura clara para tareas abiertas (plantillas, formatos)'
      ],
      implicacion: [
        'Crear ambiente predecible con rutinas claras',
        'Ensenanza explicita de habilidades sociales en contexto natural',
        'Ofrecer espacios de regulacion sensorial (rincon tranquilo)',
        'Usar historias sociales para preparar situaciones nuevas'
      ]
    },
    adecuaciones_acceso: [
      'Agenda visual diaria (horario con pictogramas)',
      'Reduccion de estimulos sensoriales en el puesto de trabajo',
      'Material estructurado con inicio y fin claramente marcados',
      'Acceso a objeto de transicion o herramienta autorreguladora'
    ],
    adecuaciones_evaluacion: [
      'Evaluacion en ambiente tranquilo y conocido',
      'Instrucciones literales sin doble sentido ni sarcasmo',
      'Preguntas con formato predecible y consistente',
      'Posibilidad de responder por escrito si la oralidad genera ansiedad'
    ]
  },

  dv: {
    nombre: 'Discapacidad Visual',
    tipo: 'NEEP',
    decreto: 'D. 170',
    descripcion: 'Perdida total o parcial de la vision que afecta el acceso a la informacion visual.',
    estrategias_dua: {
      representacion: [
        'Material en formato accesible: Braille, macrotipo (18pt+), alto contraste',
        'Descripciones verbales detalladas de contenido visual',
        'Material tactil y en relieve para conceptos espaciales',
        'Uso de tecnologia asistiva: lector de pantalla, lupa digital'
      ],
      accion_expresion: [
        'Permitir respuestas orales grabadas',
        'Uso de computador con software accesible',
        'Escritura en Braille o teclado adaptado',
        'Materiales tactiles para matematica y ciencias'
      ],
      implicacion: [
        'Descripcion verbal del entorno y actividades',
        'Companero guia para actividades de desplazamiento',
        'Inclusion plena en actividades grupales con adaptaciones',
        'Fomentar autonomia con apoyos graduales'
      ]
    },
    adecuaciones_acceso: [
      'Material en macrotipo o Braille segun necesidad',
      'Iluminacion adecuada y contraste en materiales',
      'Software lector de pantalla (NVDA, JAWS)',
      'Ubicacion preferencial con buena iluminacion'
    ],
    adecuaciones_evaluacion: [
      'Evaluaciones en formato accesible (Braille, macrotipo, digital)',
      'Tiempo adicional (100% mas)',
      'Posibilidad de evaluacion oral',
      'Lector humano para enunciados si es necesario'
    ]
  },

  da: {
    nombre: 'Discapacidad Auditiva',
    tipo: 'NEEP',
    decreto: 'D. 170',
    descripcion: 'Perdida total o parcial de la audicion que afecta el acceso al lenguaje oral.',
    estrategias_dua: {
      representacion: [
        'Apoyo visual permanente: escritura en pizarra, subtitulos, senias',
        'Posicion del docente frente al estudiante para lectura labial',
        'Material escrito complementario a toda explicacion oral',
        'Uso de lengua de senas chilena (LSCh) si el estudiante la domina'
      ],
      accion_expresion: [
        'Permitir respuestas en lengua de senas o escritas',
        'Uso de interprete de LSCh en evaluaciones orales',
        'Herramientas digitales de comunicacion',
        'Expresion a traves de dibujo, esquemas y representaciones graficas'
      ],
      implicacion: [
        'Contacto visual antes de dar instrucciones',
        'Verificar comprension con preguntas directas (no solo "entendiste?")',
        'Inclusion en actividades grupales con apoyo de interprete o pares',
        'Valorar la comunicacion en todas sus formas'
      ]
    },
    adecuaciones_acceso: [
      'Interprete de LSCh si es necesario',
      'Sistema FM o amplificador personal',
      'Material escrito y visual para toda la clase',
      'Ubicacion preferencial con vision frontal al docente'
    ],
    adecuaciones_evaluacion: [
      'Evaluaciones escritas como formato principal',
      'Instrucciones escritas ademas de orales',
      'No penalizar errores gramaticales tipicos de sordos',
      'Tiempo adicional (50-100% mas)'
    ]
  },

  disc_mot: {
    nombre: 'Discapacidad Motora',
    tipo: 'NEEP',
    decreto: 'D. 170',
    descripcion: 'Limitacion en la funcion motora que afecta la movilidad, postura o manipulacion.',
    estrategias_dua: {
      representacion: [
        'Material accesible fisicamente: atril, soporte, mesa adaptada',
        'Contenido digital accesible desde dispositivo adaptado',
        'Organizacion espacial del aula accesible (libre de obstaculos)',
        'Presentacion de material a la altura adecuada'
      ],
      accion_expresion: [
        'Uso de computador con teclado adaptado o control ocular',
        'Permitir respuestas orales cuando la escritura es dificil',
        'Tiempo adicional para tareas que requieren motricidad fina',
        'Ayudante o companero que escriba si el estudiante dicta'
      ],
      implicacion: [
        'Participacion plena en todas las actividades con adaptaciones',
        'Accesibilidad fisica universal en todas las actividades',
        'Autonomia maximizada con tecnologia asistiva',
        'Actividades colaborativas donde la motricidad no sea barrera'
      ]
    },
    adecuaciones_acceso: [
      'Mobiliario adaptado (silla, mesa, atril)',
      'Accesibilidad arquitectonica (rampas, baños)',
      'Tecnologia asistiva: teclado adaptado, mouse especial, software',
      'Materiales de escritura adaptados (lapices gruesos, sujeciones)'
    ],
    adecuaciones_evaluacion: [
      'Evaluacion oral o digital como alternativa a la escritura manual',
      'Tiempo adicional significativo (50-100% mas)',
      'Escribiente si la motricidad impide la escritura',
      'Evaluar contenido, no presentacion fisica del trabajo'
    ]
  },

  di_s: {
    nombre: 'Discapacidad Intelectual Severa o Profunda',
    tipo: 'NEEP',
    decreto: 'D. 170',
    descripcion: 'Funcionamiento intelectual muy bajo (CI < 35) con necesidad de apoyo extenso o generalizado.',
    estrategias_dua: {
      representacion: [
        'Estimulacion multisensorial como base de toda ensenanza',
        'Comunicacion a traves de objetos reales, texturas y sonidos',
        'Rutinas altamente estructuradas con senales sensoriales',
        'Ambiente adaptado y seguro para exploracion'
      ],
      accion_expresion: [
        'Sistema de comunicacion alternativo individualizado',
        'Actividades de estimulacion basal y sensorial',
        'Respuestas a traves de mirada, movimiento o vocalizacion',
        'Apoyo permanente para toda actividad'
      ],
      implicacion: [
        'Experiencias sensoriales placenteras como motivador',
        'Interaccion social con pares en actividades inclusivas adaptadas',
        'Vinculo afectivo con adultos de referencia',
        'Respeto por los tiempos individuales de respuesta'
      ]
    },
    adecuaciones_acceso: [
      'Plan individual centrado en calidad de vida y participacion',
      'Material sensorial especializado',
      'Apoyo permanente de equipo multidisciplinario',
      'Entorno seguro y estimulante adaptado'
    ],
    adecuaciones_evaluacion: [
      'Evaluacion basada en observacion sistematica',
      'Registro de respuestas sensoriales y de interaccion',
      'Evaluacion funcional individualizada',
      'Sin evaluaciones estandarizadas'
    ]
  },

  rgd: {
    nombre: 'Retraso Global del Desarrollo',
    tipo: 'NEEP',
    decreto: 'D. 170',
    descripcion: 'Retraso significativo en dos o mas areas del desarrollo en menores de 5 anos.',
    estrategias_dua: {
      representacion: [
        'Ensenanza basada en juego y exploracion sensoriomotriz',
        'Materiales concretos y multisensoriales',
        'Rutinas claras con pictogramas secuenciados',
        'Estimulacion temprana integrada en actividades de aula'
      ],
      accion_expresion: [
        'Comunicacion a traves de gestos, senalizacion y objetos',
        'Actividades motrices gruesas y finas adaptadas',
        'Expresion a traves del juego simbolico',
        'Uso de material de encaje, apilamiento y clasificacion'
      ],
      implicacion: [
        'Ambiente acogedor y estimulante',
        'Juego social con pares como herramienta de aprendizaje',
        'Refuerzo positivo inmediato y consistente',
        'Familia como agente activo del proceso educativo'
      ]
    },
    adecuaciones_acceso: [
      'Material de estimulacion temprana especializado',
      'Apoyo de equipo multidisciplinario (TO, kinesiologo, fonoaudiologo)',
      'Adaptacion del espacio para seguridad y exploracion',
      'Rutinas visualmente anticipadas'
    ],
    adecuaciones_evaluacion: [
      'Evaluacion a traves de la observacion del juego',
      'Registro de hitos del desarrollo alcanzados',
      'Escala de progreso individual (no comparativa)',
      'Evaluacion funcional en contexto natural'
    ]
  },

  sordoceg: {
    nombre: 'Sordoceguera',
    tipo: 'NEEP',
    decreto: 'D. 170',
    descripcion: 'Combinacion de discapacidad visual y auditiva que requiere estrategias especificas de comunicacion.',
    estrategias_dua: {
      representacion: [
        'Comunicacion tactil como canal principal',
        'Objetos de referencia para anticipar actividades',
        'Calendario tactil de actividades diarias',
        'Estimulacion sensorial residual (vision o audicion remanente)'
      ],
      accion_expresion: [
        'Sistema de comunicacion individualizado (tactil, corporal)',
        'Respuestas a traves de movimiento, tension muscular o vocalizacion',
        'Intervencion mediada (mediador como puente comunicacional)',
        'Tecnologia asistiva especializada'
      ],
      implicacion: [
        'Ambiente predecible y seguro sensorialmente',
        'Relacion de confianza con mediador/a de referencia',
        'Experiencias significativas a traves del tacto y movimiento',
        'Participacion con pares con apoyo de mediador/a'
      ]
    },
    adecuaciones_acceso: [
      'Mediador/a comunicacional permanente',
      'Ambiente sensorialmente controlado',
      'Material tactil y de referencia individualizado',
      'Tecnologia asistiva especializada'
    ],
    adecuaciones_evaluacion: [
      'Evaluacion funcional basada en observacion',
      'Registro de respuestas comunicativas y de interaccion',
      'Evaluacion individualizada con criterios propios',
      'Participacion del equipo multidisciplinario en la evaluacion'
    ]
  }
};

// Exportar para uso en app.html (cargado via <script src>)
if (typeof window !== 'undefined') {
  window.NEE_TEMPLATES = NEE_TEMPLATES;
}
