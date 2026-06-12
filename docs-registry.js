/**
 * PIE MASTER - Registro Central de Tipos de Documento
 *
 * Define los 13 documentos del ciclo PIE (Programa de Integracion Escolar)
 * chileno, agrupados en 3 fases. Cada documento incluye:
 *   - metadata visible (label, sublabel, icon, route)
 *   - referencia normativa (decree)
 *   - URL del formato oficial MINEDUC cuando existe (officialUrl)
 *   - schema con secciones y campos para renderizar el editor dinamico
 *
 * Fuentes verificadas (especial.mineduc.cl, Decretos 170/2009 y 83/2015,
 * Cartillas MINEDUC 2025-2026).
 */

window.DOC_PHASES = [
  {
    key: 'ingreso',
    label: 'Ingreso',
    sublabel: 'Evaluación diagnóstica integral',
    icon: 'fa-door-open',
    color: '#38bdf8',
    hint: 'Documentos que se generan UNA vez al ingreso del estudiante al PIE.'
  },
  {
    key: 'planificacion',
    label: 'Planificación y Gestión',
    sublabel: 'Ciclo escolar continuo',
    icon: 'fa-calendar-day',
    color: '#34d399',
    hint: 'Documentos del trabajo pedagogico durante el ano.'
  },
  {
    key: 'seguimiento',
    label: 'Seguimiento y Reevaluación',
    sublabel: 'Hitos semestrales/anuales',
    icon: 'fa-chart-line',
    color: '#a78bfa',
    hint: 'Documentos que justifican la continuidad o cierre del estudiante en el programa.'
  }
];

// Helpers para reusar bloques de campos
const STUDENT_BLOCK = [
  { id: 'student_name',  label: 'Nombre completo del estudiante', type: 'text', required: true, prefillFrom: 'student.name' },
  { id: 'student_rut',   label: 'RUT del estudiante', type: 'text', prefillFrom: 'student.rut' },
  { id: 'student_birth', label: 'Fecha de nacimiento', type: 'date', prefillFrom: 'student.birthDate' },
  { id: 'student_curso', label: 'Curso / Nivel', type: 'text', prefillFrom: 'student.real_level' }
];

const APODERADO_BLOCK = [
  { id: 'apoderado_nombre', label: 'Nombre del apoderado/a', type: 'text' },
  { id: 'apoderado_rut',    label: 'RUT del apoderado/a', type: 'text' },
  { id: 'apoderado_rel',    label: 'Relacion con el estudiante', type: 'text', placeholder: 'Madre / Padre / Tutor legal' },
  { id: 'apoderado_tel',    label: 'Teléfono de contacto', type: 'text' }
];

window.DOC_TYPES = {
  // ============================================================
  // FASE 1 - INGRESO
  // ============================================================

  anamnesis: {
    key: 'anamnesis',
    phase: 'ingreso',
    label: 'Anamnesis',
    sublabel: 'Historia del desarrollo del estudiante',
    icon: 'fa-clipboard-user',
    route: '/docs.html?type=anamnesis',
    decree: 'Decreto Supremo 170/2009 (evaluación diagnóstica integral). Formato referencial: se permite formato propio (Cartilla 6).',
    officialUrl: 'https://especial.mineduc.cl/wp-content/uploads/sites/31/2018/06/ANAMNESIS_2010.doc',
    officialUrlPdf: 'https://especial.mineduc.cl/wp-content/uploads/sites/31/2018/06/ANAMNESIS_2010.pdf',
    officialLabel: 'Formato MINEDUC 2010 (referencial)',
    description: 'Entrevista detallada con la familia para recoger la historia del desarrollo del estudiante (embarazo, parto, hitos del desarrollo, escolarizacion previa, antecedentes medicos y sociales).',
    requiresMineduc: true,
    info: {
      cuando: 'Al ingreso del estudiante al PIE, durante la evaluación diagnóstica inicial.',
      paraQuien: 'Todo estudiante en proceso de evaluación PIE. Se entrevista al apoderado titular.',
      renovacion: 'Una sola vez al ingreso. Se actualiza solo si hay cambios familiares o de salud relevantes.'
    },
    schema: {
      sections: [
        { key: 'identificacion', label: '1. Identificación del estudiante', icon: 'fa-user',
          fields: STUDENT_BLOCK },
        { key: 'apoderado', label: '2. Antecedentes del apoderado', icon: 'fa-people-roof',
          fields: APODERADO_BLOCK },
        { key: 'familiares', label: '3. Antecedentes familiares', icon: 'fa-house-user',
          fields: [
            { id: 'composicion_familiar', label: 'Composicion del grupo familiar', type: 'textarea', rows: 2, placeholder: 'Quienes viven con el estudiante; edades; ocupaciones.' },
            { id: 'dinamica_familiar',    label: 'Dinamica familiar', type: 'textarea', rows: 2, placeholder: 'Relaciones, apoyo emocional, rutinas, estresores.' },
            { id: 'antecedentes_genet',   label: 'Antecedentes genetico-hereditarios', type: 'textarea', rows: 2, placeholder: 'Patologias relevantes en familiares directos.' }
          ]},
        { key: 'gestacion', label: '4. Antecedentes prenatales, perinatales y postnatales', icon: 'fa-baby',
          fields: [
            { id: 'gestacion',  label: 'Gestacion / embarazo', type: 'textarea', rows: 2, placeholder: 'Planificado, controles, complicaciones, medicacion.' },
            { id: 'parto',      label: 'Parto', type: 'textarea', rows: 2, placeholder: 'Tipo de parto, edad gestacional, complicaciones, APGAR.' },
            { id: 'postnatal',  label: 'Postnatal (primeros meses)', type: 'textarea', rows: 2, placeholder: 'Lactancia, sueno, hospitalizaciones.' }
          ]},
        { key: 'desarrollo', label: '5. Desarrollo psicomotor, del lenguaje y socioemocional', icon: 'fa-child-reaching',
          fields: [
            { id: 'desarrollo_motor',    label: 'Hitos del desarrollo motor', type: 'textarea', rows: 2, placeholder: 'Edad de sentarse, gatear, caminar.' },
            { id: 'desarrollo_lenguaje', label: 'Desarrollo del lenguaje', type: 'textarea', rows: 2, placeholder: 'Primeras palabras, frases; comprension; expresion.' },
            { id: 'desarrollo_social',   label: 'Desarrollo socioemocional', type: 'textarea', rows: 2, placeholder: 'Relacion con pares, expresion de emociones, autonomia.' }
          ]},
        { key: 'salud', label: '6. Antecedentes de salud', icon: 'fa-stethoscope',
          fields: [
            { id: 'enfermedades', label: 'Enfermedades relevantes', type: 'textarea', rows: 2 },
            { id: 'medicacion',   label: 'Medicacion actual', type: 'textarea', rows: 2 },
            { id: 'especialistas', label: 'Tratamientos con especialistas externos', type: 'textarea', rows: 2 }
          ]},
        { key: 'escolaridad', label: '7. Trayectoria escolar previa', icon: 'fa-school',
          fields: [
            { id: 'escuelas_previas',  label: 'Escuelas anteriores', type: 'textarea', rows: 2 },
            { id: 'repitencias',        label: 'Repitencias / cambios de colegio', type: 'textarea', rows: 2 },
            { id: 'apoyos_previos',     label: 'Apoyos PIE / SEP / otros recibidos', type: 'textarea', rows: 2 }
          ]},
        { key: 'observaciones', label: '8. Observaciones del entrevistador', icon: 'fa-note-sticky',
          fields: [
            { id: 'observaciones', label: 'Observaciones', type: 'textarea', rows: 3 }
          ]}
      ]
    }
  },

  informe_psicopedagogico: {
    key: 'informe_psicopedagogico',
    phase: 'ingreso',
    label: 'Informe Psicopedagogico',
    sublabel: 'Formato MINEDUC 2025 (obligatorio 2026)',
    icon: 'fa-file-pen',
    route: '/docs.html?type=informe_psicopedagogico',
    decree: 'Decreto 170/2009 + Cartilla 4 MINEDUC 2025',
    officialUrl: 'https://especial.mineduc.cl/wp-content/uploads/sites/31/2025/11/Formato_Informe_EvaluaciOn_Psicopedagogica-2025.docx',
    officialUrlPdf: 'https://especial.mineduc.cl/wp-content/uploads/sites/31/2025/11/Formato_Informe_EvaluaciOn_Psicopedagogica-2025.pdf',
    officialLabel: 'Formato MINEDUC 2025 (OBLIGATORIO desde ingresos 2026)',
    description: 'Documento tecnico que respalda fortalezas, dificultades y diagnostico pedagogico. El formato oficial 2025 incluye DOS instrumentos: el Informe de Evaluación Psicopedagogica (lo firma el profesional) y la Pauta de Evaluación y Observacion Pedagogica en el contexto escolar (la firma el docente de aula regular). Obligatorio desde ingresos 2026 (Cartilla 4 MINEDUC).',
    requiresMineduc: true,
    ministerial: true,
    docTitle: 'INFORME DE EVALUACIÓN PSICOPEDAGÓGICA',
    info: {
      cuando: 'Al ingreso al PIE + en cada reevaluación integral + al egreso + en 4° medio (octubre, para ajustes PAES).',
      paraQuien: 'Todo estudiante candidato al PIE. OBLIGATORIO el formato 2025 desde ingresos 2026.',
      renovacion: 'Ligado al ciclo de reevaluación integral (2 años NEET/DI/RGD; 5 años resto NEEP), no anual. También al egreso. Cartilla 5 §4.3.5.'
    },
    // Estructura alineada al "Formato Informe de Evaluación Psicopedagógica 2025" (MINEDUC).
    schema: {
      sections: [
        { key: 'identificacion', label: '1. Identificación', icon: 'fa-user',
          fields: [
            ...STUDENT_BLOCK,
            { id: 'nombre_social',    label: 'Nombre social del estudiante (si aplica)', type: 'text' },
            { id: 'edad',             label: 'Edad', type: 'text', placeholder: 'Ej: 9 años' },
            { id: 'fecha_evaluacion', label: 'Fecha de evaluación', type: 'date' },
            { id: 'diagnostico',      label: 'Diagnóstico', type: 'text' },
            { id: 'fecha_diagnostico', label: 'Fecha de emisión del diagnóstico', type: 'date' }
          ]},
        { key: 'motivo', label: '2. Motivo de evaluación psicopedagógica', icon: 'fa-magnifying-glass',
          fields: [
            { id: 'motivo_tipo', label: 'Tipo', type: 'select', options: ['Ingreso', 'Reevaluación', 'Otro'] },
            { id: 'motivo_eval', label: 'Motivo / razón de la evaluación', type: 'textarea', rows: 3 }
          ]},
        { key: 'instrumentos', label: '3. Instrumentos aplicados', icon: 'fa-toolbox',
          fields: [
            { id: 'instrumentos', label: 'Instrumentos / pruebas aplicadas', type: 'textarea', rows: 3, placeholder: 'Ej: WISC-V, Evalúa-5, observación en aula, entrevista, pauta de observación pedagógica.' }
          ]},
        { key: 'antecedentes', label: '4. Antecedentes relevantes sobre la historia escolar', icon: 'fa-clipboard-list',
          fields: [
            { id: 'antec_escolar', label: 'Historia escolar relevante', type: 'textarea', rows: 4 }
          ]},
        { key: 'analisis', label: '5. Análisis cualitativo de instrumentos', icon: 'fa-layer-group',
          fields: [
            { id: 'anal_cognitivas',       label: 'a) Habilidades cognitivas y comunicativas', type: 'textarea', rows: 4, placeholder: 'Atención, memoria, funciones ejecutivas, razonamiento, lenguaje oral/escrito, comprensión lectora, aprendizajes matemáticos, habilidades adaptativas...' },
            { id: 'anal_socioemocionales', label: 'b) Habilidades personales, socioemocionales y de aproximación al aprendizaje', type: 'textarea', rows: 4, placeholder: 'Autoestima, motivación, autorregulación emocional, tolerancia a la frustración, trabajo en equipo, persistencia, estrategias para aprender...' },
            { id: 'anal_motoras',          label: 'c) Habilidades motoras, de autonomía y sensoriales', type: 'textarea', rows: 4, placeholder: 'Motricidad gruesa y fina, autonomía / cuidado de sí mismo, capacidades sensoperceptivas, uso de ayudas técnicas...' }
          ]},
        { key: 'sintesis', label: '6. Síntesis', icon: 'fa-microscope',
          fields: [
            { id: 'sint_cognitivas',       label: 'Síntesis — habilidades cognitivas y comunicativas', type: 'textarea', rows: 3 },
            { id: 'sint_socioemocionales', label: 'Síntesis — habilidades personales y socioemocionales', type: 'textarea', rows: 3 },
            { id: 'sint_motoras',          label: 'Síntesis — habilidades motoras, autonomía y sensoriales', type: 'textarea', rows: 3 },
            { id: 'conclusion',            label: 'Conclusión (fortalezas, desafíos, progresos, contexto, proyecciones)', type: 'textarea', rows: 4 }
          ]},
        { key: 'sugerencias', label: '7. Sugerencias', icon: 'fa-lightbulb',
          fields: [
            { id: 'sug_establecimiento', label: '1. Al establecimiento educacional', type: 'textarea', rows: 2 },
            { id: 'sug_equipo_aula',     label: '2. Al equipo de aula', type: 'textarea', rows: 2 },
            { id: 'sug_estudiante',      label: '3. Al estudiante', type: 'textarea', rows: 2 },
            { id: 'sug_familia',         label: '4. A la familia', type: 'textarea', rows: 2 },
            { id: 'sug_otros',           label: '5. Otros', type: 'textarea', rows: 2 }
          ]},
        // ===== SEGUNDO INSTRUMENTO MINISTERIAL (formato oficial 2025) =====
        // "Pauta de Evaluación y Observación Pedagógica del estudiante en el contexto
        // escolar": acompaña al informe psicopedagógico y la firma el DOCENTE DE AULA
        // REGULAR (no el profesional que firma el informe). Escala: En inicio /
        // En desarrollo / Logrado / No observado.
        { key: 'pauta_identificacion', label: '8. Pauta de Observación Pedagógica — Identificación', icon: 'fa-list-check',
          fields: [
            { id: 'pauta_curso',  label: 'Curso', type: 'text' },
            { id: 'pauta_fecha',  label: 'Fecha de aplicación de la pauta', type: 'date' },
            { id: 'pauta_escala_nota', label: 'Escala de logro', type: 'textarea', rows: 3,
              placeholder: '1 En inicio: requiere apoyo permanente · 2 En desarrollo: apoyo frecuente · 3 Logrado: de manera constante y autónoma (o con los apoyos necesarios) · N/O No observado.' }
          ]},
        { key: 'pauta_pedagogicos', label: '9. Pauta — Antecedentes pedagógicos', icon: 'fa-chalkboard-user',
          fields: [
            { id: 'pauta_ped_1',  label: 'Comprende instrucciones (orales, escritas o en lengua de señas) usando los apoyos necesarios', type: 'select', options: ['En inicio', 'En desarrollo', 'Logrado', 'No observado'] },
            { id: 'pauta_ped_2',  label: 'Manifiesta disposición para el aprendizaje e interés por las tareas', type: 'select', options: ['En inicio', 'En desarrollo', 'Logrado', 'No observado'] },
            { id: 'pauta_ped_3',  label: 'Mantiene la atención en las actividades por períodos adecuados a su edad y necesidades', type: 'select', options: ['En inicio', 'En desarrollo', 'Logrado', 'No observado'] },
            { id: 'pauta_ped_4',  label: 'Organiza su tiempo y materiales para iniciar, desarrollar y concluir una actividad', type: 'select', options: ['En inicio', 'En desarrollo', 'Logrado', 'No observado'] },
            { id: 'pauta_ped_5',  label: 'Usa estrategias o apoyos para resolver dificultades y pide ayuda cuando lo necesita', type: 'select', options: ['En inicio', 'En desarrollo', 'Logrado', 'No observado'] },
            { id: 'pauta_ped_6',  label: 'Participa en actividades grupales, respetando turnos e interactuando con sus pares', type: 'select', options: ['En inicio', 'En desarrollo', 'Logrado', 'No observado'] },
            { id: 'pauta_ped_7',  label: 'Muestra iniciativa proponiendo ideas o formas propias de realizar una actividad', type: 'select', options: ['En inicio', 'En desarrollo', 'Logrado', 'No observado'] },
            { id: 'pauta_ped_8',  label: 'Expresa ideas, emociones o experiencias mediante diversos lenguajes y apoyos comunicativos', type: 'select', options: ['En inicio', 'En desarrollo', 'Logrado', 'No observado'] },
            { id: 'pauta_ped_9',  label: 'Evidencia avances en tareas escolares mostrando esfuerzo, persistencia y sentido de logro', type: 'select', options: ['En inicio', 'En desarrollo', 'Logrado', 'No observado'] },
            { id: 'pauta_ped_10', label: 'Reflexiona sobre su propio aprendizaje, reconociendo logros y desafíos con apoyo', type: 'select', options: ['En inicio', 'En desarrollo', 'Logrado', 'No observado'] }
          ]},
        { key: 'pauta_sociales', label: '10. Pauta — Antecedentes sociales y comunicativos', icon: 'fa-people-group',
          fields: [
            { id: 'pauta_soc_1',  label: 'Atiende y muestra interés ante las interacciones comunicativas', type: 'select', options: ['En inicio', 'En desarrollo', 'Logrado', 'No observado'] },
            { id: 'pauta_soc_2',  label: 'Participa en intercambios comunicativos respetando turnos (oral, señas, apoyos, SAAC)', type: 'select', options: ['En inicio', 'En desarrollo', 'Logrado', 'No observado'] },
            { id: 'pauta_soc_3',  label: 'Colabora y participa en actividades grupales o de juego colectivo', type: 'select', options: ['En inicio', 'En desarrollo', 'Logrado', 'No observado'] },
            { id: 'pauta_soc_4',  label: 'Inicia interacciones sociales y propone ideas o acciones en actividades compartidas', type: 'select', options: ['En inicio', 'En desarrollo', 'Logrado', 'No observado'] },
            { id: 'pauta_soc_5',  label: 'Participa en la organización de juegos o tareas, escuchando a otros y negociando acuerdos', type: 'select', options: ['En inicio', 'En desarrollo', 'Logrado', 'No observado'] },
            { id: 'pauta_soc_6',  label: 'Recibe y responde a comentarios o sugerencias de pares o adultos de forma respetuosa', type: 'select', options: ['En inicio', 'En desarrollo', 'Logrado', 'No observado'] },
            { id: 'pauta_soc_7',  label: 'Solicita ayuda o colaboración cuando la necesita, con las formas de comunicación disponibles', type: 'select', options: ['En inicio', 'En desarrollo', 'Logrado', 'No observado'] },
            { id: 'pauta_soc_8',  label: 'Acepta ayuda o acompañamiento de pares o adultos, con disposición al trabajo colaborativo', type: 'select', options: ['En inicio', 'En desarrollo', 'Logrado', 'No observado'] },
            { id: 'pauta_soc_9',  label: 'Establece y mantiene vínculos positivos con sus compañeros y sentido de pertenencia', type: 'select', options: ['En inicio', 'En desarrollo', 'Logrado', 'No observado'] },
            { id: 'pauta_soc_10', label: 'Reconoce y expresa emociones propias y de otros, mostrando empatía', type: 'select', options: ['En inicio', 'En desarrollo', 'Logrado', 'No observado'] }
          ]},
        { key: 'pauta_docente', label: '11. Docente de aula regular que emite la Pauta', icon: 'fa-user-pen',
          fields: [
            { id: 'pauta_doc_nombre',  label: 'Nombre completo', type: 'text' },
            { id: 'pauta_doc_rut',     label: 'RUT', type: 'text' },
            { id: 'pauta_doc_profesion', label: 'Profesión', type: 'text' }
          ]}
      ]
    }
  },

  fudei: {
    key: 'fudei',
    phase: 'ingreso',
    label: 'FUDEI',
    sublabel: 'Formulario Único de Evaluación Integral',
    icon: 'fa-file-shield',
    route: '/docs.html?type=fudei',
    decree: 'DS 170/2009 + Instructivo FUDEI-PIE 2026',
    officialUrl: 'https://fudei.mineduc.cl/fudei-web/mvc/login/login',
    officialUrlPdf: 'https://especial.mineduc.cl/wp-content/uploads/sites/31/2019/03/FUDEI-Formato-PDF-2019.pdf',
    officialLabel: 'Plataforma online FUDEI (acceso con RBD + Clave SIGE)',
    description: 'Formulario MINISTERIAL OBLIGATORIO. La carga oficial se hace ONLINE en fudei.mineduc.cl (integrado con plataforma PIE / SIGE). Aquí generas un BORRADOR EXPORTABLE para transcribir + registras el folio para tu seguimiento interno.',
    requiresMineduc: true,
    ministerial: true,
    externalPlatform: true,
    info: {
      cuando: 'OBLIGATORIO antes de inscribir al estudiante en el PIE. La carga REAL se hace online en fudei.mineduc.cl (Instructivo Integración FUDEI-PIE 2026).',
      paraQuien: 'Todo estudiante candidato al PIE. Sin FUDEI finalizado en la plataforma online, no se puede registrar el ingreso al programa.',
      renovacion: 'Al ingreso. Esta vista es un BORRADOR para preparar el contenido antes de cargarlo en fudei.mineduc.cl con tu RBD + Clave SIGE.'
    },
    schema: {
      sections: [
        { key: 'identificacion', label: '1. Identificación del estudiante', icon: 'fa-user', fields: STUDENT_BLOCK },
        { key: 'folio', label: '2. Datos del FUDEI online', icon: 'fa-hashtag',
          fields: [
            { id: 'fudei_folio',         label: 'Número de folio FUDEI', type: 'text', placeholder: 'Ej: FU-2026-0123', required: true },
            { id: 'fudei_estado',        label: 'Estado del FUDEI', type: 'select',
              options: ['En proceso', 'Finalizado', 'Rechazado por SIGE', 'Pendiente firma especialista'] },
            { id: 'fudei_fecha_inicio',  label: 'Fecha de inicio del FUDEI', type: 'date' },
            { id: 'fudei_fecha_final',   label: 'Fecha de finalizacion', type: 'date' }
          ]},
        { key: 'diagnostico', label: '3. Síntesis diagnóstica', icon: 'fa-stethoscope',
          fields: [
            { id: 'categoria_nee', label: 'Categoria NEE', type: 'select',
              options: ['NEET (Transitoria)', 'NEEP (Permanente)', 'No aplica'] },
            { id: 'diagnostico_principal', label: 'Diagnóstico principal', type: 'text', placeholder: 'Ej: TEL Mixto, TEA, FIL, etc.' },
            { id: 'diagnostico_secundario', label: 'Diagnósticos secundarios (si aplica)', type: 'textarea', rows: 2 }
          ]},
        { key: 'apoyos', label: '4. Necesidades de apoyo identificadas', icon: 'fa-people-arrows',
          fields: [
            { id: 'apoyos_requeridos', label: 'Tipos y modalidad de apoyo necesarios', type: 'textarea', rows: 3 }
          ]},
        { key: 'observaciones', label: '5. Observaciones del coordinador PIE', icon: 'fa-note-sticky',
          fields: [
            { id: 'observaciones', label: 'Observaciones internas', type: 'textarea', rows: 3 }
          ]}
      ]
    }
  },

  informe_especialista: {
    key: 'informe_especialista',
    phase: 'ingreso',
    label: 'Informe de Especialista',
    sublabel: 'Psicologico / Fonoaudiologico / Otro',
    icon: 'fa-user-doctor',
    route: '/docs.html?type=informe_especialista',
    decree: 'DS 170/2009 art. 12-25 (profesionales habilitados)',
    officialUrl: 'https://especial.mineduc.cl/registro-de-profesionales/registro-profesionales-para-la-evaluacion-y-diagnostico-100-en-linea/',
    officialLabel: 'Registro MINEDUC de profesionales habilitados',
    description: 'Informe profesional externo (psicologo, fonoaudiologo, neurologo, kinesiologo) que respalda la NEE. No hay formato unico; el profesional debe estar inscrito en el Registro MINEDUC.',
    requiresMineduc: true,
    info: {
      cuando: 'Al ingreso y en cada reevaluación integral, SOLO para los diagnósticos que lo requieren.',
      paraQuien: 'Requerido para TL (fonoaudiólogo), FIL/DI (psicólogo: WISC/WAIS + conductas adaptativas), TEA (psicólogo + fonoaudiólogo) y GARC. Para DEA, TDA y discapacidades sensoriales/motoras NO se exige (el diagnóstico va en el informe psicopedagógico o la valoración de salud).',
      renovacion: 'Ingreso + cada reevaluación integral (según el ciclo del diagnóstico). Cartilla 5 anexos.'
    },
    schema: {
      sections: [
        { key: 'identificacion', label: '1. Identificación del estudiante', icon: 'fa-user', fields: STUDENT_BLOCK },
        { key: 'profesional', label: '2. Datos del profesional evaluador', icon: 'fa-user-doctor',
          fields: [
            { id: 'prof_nombre',    label: 'Nombre completo', type: 'text', required: true },
            { id: 'prof_rut',       label: 'RUT', type: 'text', required: true },
            { id: 'prof_especialidad', label: 'Especialidad', type: 'select',
              options: ['Psicologo/a', 'Fonoaudiologo/a', 'Neurologo/a', 'Kinesiologo/a', 'Terapeuta Ocupacional', 'Asistente Social', 'Otro'] },
            { id: 'prof_registro',  label: 'Número de Registro MINEDUC', type: 'text', required: true },
            { id: 'prof_lugar',     label: 'Centro / Institucion donde ejerce', type: 'text' }
          ]},
        { key: 'derivacion', label: '3. Motivo de la derivacion', icon: 'fa-arrow-down-up-across-line',
          fields: [
            { id: 'motivo', label: 'Razon por la que el estudiante fue derivado', type: 'textarea', rows: 3 }
          ]},
        { key: 'antecedentes', label: '4. Antecedentes relevantes', icon: 'fa-clipboard-list',
          fields: [
            { id: 'antecedentes', label: 'Antecedentes considerados', type: 'textarea', rows: 3 }
          ]},
        { key: 'evaluacion', label: '5. Instrumentos y resultados', icon: 'fa-flask',
          fields: [
            { id: 'instrumentos', label: 'Pruebas aplicadas', type: 'textarea', rows: 3 },
            { id: 'resultados',   label: 'Resultados obtenidos', type: 'textarea', rows: 3 }
          ]},
        { key: 'diagnostico', label: '6. Diagnóstico', icon: 'fa-stethoscope',
          fields: [
            { id: 'diagnostico',     label: 'Diagnóstico', type: 'textarea', rows: 2 },
            { id: 'codigo_cie10',    label: 'Codigo CIE-10 (si corresponde)', type: 'text', placeholder: 'Ej: F80.2' }
          ]},
        { key: 'sugerencias', label: '7. Sugerencias y orientaciones', icon: 'fa-lightbulb',
          fields: [
            { id: 'sugerencias', label: 'Para el equipo PIE', type: 'textarea', rows: 3 }
          ]}
      ]
    }
  },

  autorizacion_familia: {
    key: 'autorizacion_familia',
    phase: 'ingreso',
    label: 'Autorización de la Familia',
    sublabel: 'Consentimiento informado',
    icon: 'fa-file-signature',
    route: '/docs.html?type=autorizacion_familia',
    decree: 'DS 170/2009 art. 5 (consentimiento para la evaluación)',
    officialUrl: 'https://especial.mineduc.cl/wp-content/uploads/sites/31/2018/06/AUTORIZACION_EVALUACION_2010.doc',
    officialUrlPdf: 'https://especial.mineduc.cl/wp-content/uploads/sites/31/2018/06/AUTORIZACION_EVALUACION_2010.pdf',
    officialLabel: 'Formato MINEDUC 2010 (referencial)',
    description: 'Consentimiento informado del apoderado para la evaluacion diagnostica integral del estudiante en el contexto del PIE.',
    requiresMineduc: false,
    docTitle: 'AUTORIZACIÓN PARA LA EVALUACIÓN',
    sublabel: 'Evaluación diagnóstica integral · Ley 20.201 / Decreto 170',
    info: {
      cuando: 'Al inicio del proceso de evaluación PIE, antes de aplicar cualquier instrumento.',
      paraQuien: 'Todo estudiante. La firma debe ser del apoderado titular registrado en el establecimiento.',
      renovacion: 'Una sola vez al ingreso (se mantiene la misma del año 1). Cartilla 6: actualizarla en cada nueva evaluación integral es buena práctica, NO requisito obligatorio.'
    },
    // El documento se arma con la prosa oficial (CUSTOM_BODIES.autorizacion_familia en docs.html);
    // estos campos solo alimentan los espacios a completar.
    schema: {
      sections: [
        { key: 'identificacion', label: '1. Identificación del estudiante', icon: 'fa-user', fields: STUDENT_BLOCK },
        { key: 'autoriza', label: '2. Persona que autoriza', icon: 'fa-people-roof',
          fields: [
            { id: 'apoderado_nombre', label: 'Nombre completo', type: 'text' },
            { id: 'apoderado_rut',    label: 'RUT', type: 'text' },
            { id: 'relacion',         label: 'Relación con el estudiante', type: 'text', placeholder: 'Madre / Padre / Tutor responsable' }
          ]},
        { key: 'consentimiento', label: '3. Declaración de consentimiento', icon: 'fa-file-signature',
          fields: [
            { id: 'consentimiento', label: 'Decisión', type: 'select', options: ['Doy mi consentimiento', 'No doy mi consentimiento'] },
            { id: 'ciudad',         label: 'Ciudad', type: 'text' },
            { id: 'fecha_autorizacion', label: 'Fecha', type: 'date' }
          ]}
      ]
    }
  },

  poder_simple: {
    key: 'poder_simple',
    phase: 'ingreso',
    label: 'Poder Simple',
    sublabel: 'Representante alterno del apoderado',
    icon: 'fa-file-contract',
    route: '/docs.html?type=poder_simple',
    decree: 'Cartilla MINEDUC 2025',
    officialUrl: 'https://especial.mineduc.cl/wp-content/uploads/sites/31/2025/03/PODER_SIMPLE_FORMATO_MINISTERIAL-2025.docx',
    officialLabel: 'Formato MINEDUC 2025',
    description: 'Documento que autoriza a un representante alterno (no apoderado titular) a firmar documentos PIE en caso de que el apoderado titular no pueda hacerlo.',
    requiresMineduc: false,
    docTitle: 'PODER SIMPLE PARA APODERADO/A SUPLENTE',
    info: {
      cuando: 'Cuando el apoderado titular no puede asistir/firmar y delega en otra persona (familiar, tutor de hecho).',
      paraQuien: 'Aplica solo si el establecimiento o el apoderado lo solicita explícitamente.',
      renovacion: 'Por evento (cada vez que se requiere representación alterna).'
    },
    // El documento se arma con la prosa oficial (CUSTOM_BODIES.poder_simple en docs.html);
    // estos campos solo alimentan los espacios a completar.
    schema: {
      sections: [
        { key: 'identificacion', label: '1. Estudiante', icon: 'fa-user', fields: STUDENT_BLOCK },
        { key: 'apoderado_titular', label: '2. Apoderado/a titular (otorga el poder)', icon: 'fa-people-roof',
          fields: [
            { id: 'apoderado_nombre',    label: 'Nombre completo', type: 'text', required: true },
            { id: 'apoderado_rut',       label: 'RUT', type: 'text', required: true },
            { id: 'apoderado_domicilio', label: 'Domicilio', type: 'text' }
          ]},
        { key: 'representante', label: '3. Apoderado/a suplente (recibe el poder)', icon: 'fa-user-check',
          fields: [
            { id: 'rep_nombre',    label: 'Nombre completo', type: 'text', required: true },
            { id: 'rep_rut',       label: 'RUT', type: 'text', required: true },
            { id: 'rep_domicilio', label: 'Domicilio', type: 'text' }
          ]},
        { key: 'otorgamiento', label: '4. Otorgamiento', icon: 'fa-clipboard-check',
          fields: [
            { id: 'ciudad',      label: 'Ciudad', type: 'text' },
            { id: 'fecha_poder', label: 'Fecha', type: 'date' }
          ]}
      ]
    }
  },

  valoracion_salud: {
    key: 'valoracion_salud',
    phase: 'ingreso',
    label: 'Valoracion de Salud',
    sublabel: 'Formato OBLIGATORIO 2024',
    icon: 'fa-stethoscope',
    route: '/docs.html?type=valoracion_salud',
    decree: 'DS 170/2009 art. 8 letra a',
    officialUrl: 'https://especial.mineduc.cl/wp-content/uploads/sites/31/2024/10/FU_EVALUACION-DE_SALUD_2024-3.doc',
    officialUrlPdf: 'https://especial.mineduc.cl/wp-content/uploads/sites/31/2024/10/FU_EVALUACION-DE_SALUD_2024-3.pdf',
    officialLabel: 'Formato MINEDUC 2024 (referencial: certificado médico propio también es válido)',
    description: 'Certificacion medica como parte de la evaluacion diagnostica integral. El FU MINEDUC es OPTATIVO: un certificado medico propio es valido si trae fecha, firma, timbre, RUT y registro. El medico debe estar inscrito en la Superintendencia.',
    requiresMineduc: false,
    ministerial: true,
    info: {
      cuando: 'Al ingreso y en cada reevaluación integral (parte de los antecedentes obligatorios).',
      paraQuien: 'Todo estudiante PIE. Firma un médico inscrito en la Superintendencia de Salud.',
      renovacion: 'Se renueva por ciclo: cada 2 años en NEET y NEEP-DI; en el resto de NEEP al finalizar el año 3, 4 o 5 según determine el equipo de aula (Cartilla 6).'
    },
    schema: {
      sections: [
        { key: 'identificacion', label: '1. Identificación del estudiante', icon: 'fa-user', fields: STUDENT_BLOCK },
        { key: 'antec_morbidos', label: '2. Antecedentes morbidos', icon: 'fa-notes-medical',
          fields: [
            { id: 'antec_personales', label: 'Antecedentes morbidos personales', type: 'textarea', rows: 3 },
            { id: 'antec_familiares', label: 'Antecedentes morbidos familiares', type: 'textarea', rows: 2 }
          ]},
        { key: 'examen', label: '3. Examen fisico', icon: 'fa-heart-pulse',
          fields: [
            { id: 'examen_general',     label: 'Examen general', type: 'textarea', rows: 2 },
            { id: 'examen_neurologico', label: 'Examen neurologico', type: 'textarea', rows: 2 },
            { id: 'agudeza_visual',     label: 'Agudeza visual', type: 'text' },
            { id: 'agudeza_auditiva',   label: 'Agudeza auditiva', type: 'text' }
          ]},
        { key: 'diagnostico', label: '4. Diagnóstico clínico', icon: 'fa-stethoscope',
          fields: [
            { id: 'diagnostico', label: 'Diagnóstico', type: 'textarea', rows: 3 }
          ]},
        { key: 'tratamiento', label: '5. Tratamientos en curso', icon: 'fa-pills',
          fields: [
            { id: 'tratamiento', label: 'Tratamientos y medicacion', type: 'textarea', rows: 3 }
          ]},
        { key: 'sugerencias', label: '6. Sugerencias para el equipo educativo', icon: 'fa-school',
          fields: [
            { id: 'sugerencias', label: 'Sugerencias', type: 'textarea', rows: 3 }
          ]},
        { key: 'medico', label: '7. Identificación del médico', icon: 'fa-user-doctor',
          fields: [
            { id: 'medico_nombre', label: 'Nombre completo', type: 'text', required: true },
            { id: 'medico_rut',    label: 'RUT', type: 'text', required: true },
            { id: 'medico_esp',    label: 'Especialidad', type: 'text' },
            { id: 'medico_reg_super', label: 'Número de Registro Superintendencia', type: 'text', required: true }
          ]}
      ]
    }
  },

  // ============================================================
  // FASE 2 - PLANIFICACION
  // ============================================================

  pai: {
    key: 'pai',
    phase: 'planificacion',
    label: 'PAI',
    sublabel: 'Plan de Apoyo Individual',
    icon: 'fa-handshake-angle',
    route: '/pai.html',
    decree: 'Decreto 170/2009 art. 88',
    officialUrl: null,
    officialLabel: 'Sin formato unico (D170 define contenidos minimos)',
    description: 'Hoja de ruta de los apoyos generales (profesionales, frecuencia, modalidad) que recibira el estudiante durante el ano. Editor completo con 8 secciones MINEDUC.',
    requiresMineduc: true,
    stub: false,
    fullEditor: true,
    info: {
      cuando: 'Al inicio de cada año escolar, después de la evaluación diagnóstica.',
      paraQuien: 'Todo estudiante incorporado al PIE (NEET y NEEP).',
      renovacion: 'Anual. Se ajusta durante el año si cambian las necesidades de apoyo del estudiante.'
    }
  },

  paci: {
    key: 'paci',
    phase: 'planificacion',
    label: 'PACI',
    sublabel: 'Plan de Adecuacion Curricular Individualizado',
    icon: 'fa-file-pen',
    route: '/app.html',
    decree: 'Decreto Exento 83/2015',
    officialUrl: 'https://www.bcn.cl/leychile/navegar?idNorma=1074511',
    officialUrlPdf: 'https://especial.mineduc.cl/wp-content/uploads/sites/31/2017/05/ORIENTACIONES_D83_Web_05-2017.pdf',
    officialLabel: 'D83/2015 + Orientaciones tecnicas MINEDUC',
    description: 'Instrumento tecnico del Decreto 83. Obligatorio para estudiantes con ajustes en los Objetivos de Aprendizaje. Editor completo con OAs MINEDUC + adecuaciones tipificadas.',
    requiresMineduc: true,
    ministerial: true,
    stub: false,
    fullEditor: true,
    info: {
      cuando: 'Cuando el estudiante requiere adecuaciones SIGNIFICATIVAS a los Objetivos de Aprendizaje (no solo de acceso).',
      paraQuien: 'Estudiantes con NEEP o NEET cuya descenso curricular justifica ajustar OAs (DI, TEL severo, TEA, etc.).',
      renovacion: 'Anual al inicio del año, con planificaciones por trimestre. Se actualiza si cambian asignaturas con adecuación.'
    }
  },

  registro_colaborativo: {
    key: 'registro_colaborativo',
    phase: 'planificacion',
    label: 'Registro de Trabajo Colaborativo',
    sublabel: 'Co-docencia (Cartilla 2 MINEDUC 2025)',
    icon: 'fa-handshake-simple',
    route: '/docs.html?type=registro_colaborativo',
    decree: 'DS 170/2009 art. 87 + Cartilla 2 MINEDUC 2025',
    officialUrl: 'https://especial.mineduc.cl/wp-content/uploads/sites/31/2025/06/Cartilla_2-Trabajo_Colaborativo-0625.pdf',
    officialUrlPdf: 'https://especial.mineduc.cl/wp-content/uploads/sites/31/2016/09/201304051030320.Registro_PIE_2013.doc',
    officialLabel: 'Cartilla 2 MINEDUC 2025 + Registro PIE 2013',
    description: 'Evidencia las horas de co-docencia y planificacion conjunta entre el profesor de aula y el educador diferencial (Cartilla 6: 3 hrs cronologicas por curso; 16 hrs JECD / 13 hrs sin JECD por grupo 5+2).',
    requiresMineduc: true,
    info: {
      cuando: 'Cada sesión de co-docencia o planificación conjunta (mínimo 3 hrs cronológicas/semana en básica).',
      paraQuien: 'Por curso o grupo. Lo firman el profesor de aula y el educador diferencial.',
      renovacion: 'Continuo durante el año: un registro por sesión (semanal mínimo).'
    },
    schema: {
      sections: [
        { key: 'contexto', label: '1. Contexto', icon: 'fa-school',
          fields: [
            { id: 'curso',     label: 'Curso', type: 'text', placeholder: 'Ej: 3° Basico A' },
            { id: 'asignatura', label: 'Asignatura', type: 'text' },
            { id: 'semana',    label: 'Semana / Periodo', type: 'text', placeholder: 'Ej: Semana del 03 al 07 de marzo' },
            { id: 'fecha_sesion', label: 'Fecha de la sesion', type: 'date' },
            { id: 'duracion',  label: 'Duracion (horas)', type: 'text', placeholder: 'Ej: 3 hrs' }
          ]},
        { key: 'participantes', label: '2. Profesionales participantes', icon: 'fa-people-group',
          fields: [
            { id: 'prof_aula',       label: 'Profesor/a de aula', type: 'text' },
            { id: 'prof_especialista', label: 'Profesor/a especialista (educador diferencial)', type: 'text' },
            { id: 'asistentes',      label: 'Asistentes / otros profesionales', type: 'textarea', rows: 2 }
          ]},
        { key: 'planificacion', label: '3. Acciones de planificacion conjunta', icon: 'fa-calendar-check',
          fields: [
            { id: 'objetivos',     label: 'Objetivos de la sesion', type: 'textarea', rows: 2 },
            { id: 'adaptaciones',  label: 'Adaptaciones acordadas (DUA)', type: 'textarea', rows: 3 }
          ]},
        { key: 'estrategias', label: '4. Estrategias de co-ensenanza', icon: 'fa-chalkboard-user',
          fields: [
            { id: 'modalidad', label: 'Modalidad', type: 'select',
              options: ['Ensenanza paralela', 'Ensenanza alternativa', 'Un docente ensena - otro observa', 'Un docente ensena - otro apoya', 'Ensenanza en equipo', 'Ensenanza por estaciones'] },
            { id: 'estrategias_aplicadas', label: 'Descripcion de las estrategias aplicadas', type: 'textarea', rows: 3 }
          ]},
        { key: 'evaluacion', label: '5. Acuerdos sobre evaluacion', icon: 'fa-clipboard-check',
          fields: [
            { id: 'acuerdos_eval', label: 'Acuerdos sobre evaluacion', type: 'textarea', rows: 2 }
          ]},
        { key: 'reflexion', label: '6. Reflexion y monitoreo', icon: 'fa-brain',
          fields: [
            { id: 'avances',     label: 'Avances observados en los estudiantes', type: 'textarea', rows: 2 },
            { id: 'ajustes',     label: 'Ajustes para la proxima sesion', type: 'textarea', rows: 2 }
          ]}
      ]
    }
  },

  registro_atencion: {
    key: 'registro_atencion',
    phase: 'planificacion',
    label: 'Registro de Atencion',
    sublabel: 'Aula de recursos (bitacora)',
    icon: 'fa-book-open',
    route: '/docs.html?type=registro_atencion',
    decree: 'DS 170/2009 art. 87',
    officialUrl: 'https://especial.mineduc.cl/wp-content/uploads/sites/31/2016/09/201304051030320.Registro_PIE_2013.doc',
    officialUrlPdf: 'https://especial.mineduc.cl/wp-content/uploads/sites/31/2016/09/201305201527310.orientaciones_REGISTRO_PIE_2013.pdf',
    officialLabel: 'Formato base MINEDUC 2013 + orientaciones',
    description: 'Bitacora que detalla actividades, avances y asistencia en sesiones en el aula de recursos (apoyo excepcional y justificado).',
    requiresMineduc: true,
    info: {
      cuando: 'Cada sesión que el estudiante recibe apoyo en el aula de recursos (fuera del aula común).',
      paraQuien: 'Estudiantes con apoyo individualizado o en pequeño grupo fuera del aula común (apoyo excepcional y justificado).',
      renovacion: 'Continuo durante el año: un registro por sesión (frecuencia según PAI del estudiante).'
    },
    schema: {
      sections: [
        { key: 'identificacion', label: '1. Identificación del estudiante', icon: 'fa-user', fields: STUDENT_BLOCK },
        { key: 'sesion', label: '2. Datos de la sesion', icon: 'fa-clock',
          fields: [
            { id: 'fecha_sesion',  label: 'Fecha', type: 'date' },
            { id: 'hora_inicio',   label: 'Hora de inicio', type: 'text', placeholder: 'HH:MM' },
            { id: 'hora_termino',  label: 'Hora de termino', type: 'text', placeholder: 'HH:MM' },
            { id: 'asistio',       label: 'Asistio', type: 'select', options: ['Si', 'No', 'Retiro durante la sesion'] },
            { id: 'profesional',   label: 'Profesional a cargo', type: 'text' }
          ]},
        { key: 'objetivos', label: '3. Objetivos vinculados al PAI/PACI', icon: 'fa-bullseye',
          fields: [
            { id: 'objetivos', label: 'Objetivos a trabajar en esta sesion', type: 'textarea', rows: 3 }
          ]},
        { key: 'actividades', label: '4. Actividades realizadas', icon: 'fa-list-check',
          fields: [
            { id: 'actividades', label: 'Descripcion de las actividades', type: 'textarea', rows: 4 }
          ]},
        { key: 'evidencias', label: '5. Logros, dificultades y observaciones', icon: 'fa-note-sticky',
          fields: [
            { id: 'logros',       label: 'Logros observados', type: 'textarea', rows: 2 },
            { id: 'dificultades', label: 'Dificultades', type: 'textarea', rows: 2 },
            { id: 'observaciones', label: 'Otras observaciones', type: 'textarea', rows: 2 }
          ]},
        { key: 'proximos', label: '6. Proximos pasos', icon: 'fa-forward',
          fields: [
            { id: 'proximos_pasos', label: 'Para la proxima sesion', type: 'textarea', rows: 2 }
          ]}
      ]
    }
  },

  // ============================================================
  // FASE 3 - SEGUIMIENTO
  // ============================================================

  informe_familia: {
    key: 'informe_familia',
    phase: 'seguimiento',
    label: 'Informe a la Familia',
    sublabel: 'Formato OBLIGATORIO 2025',
    icon: 'fa-house-user',
    route: '/docs.html?type=informe_familia',
    decree: 'DS 170/2009 arts. 9 y 14 + Cartilla 1 MINEDUC',
    officialUrl: 'https://especial.mineduc.cl/wp-content/uploads/sites/31/2025/02/INFORME_PARA_LA_FAMILIA_2025.doc',
    officialUrlPdf: 'https://especial.mineduc.cl/wp-content/uploads/sites/31/2025/02/INFORME_PARA_LA_FAMILIA_2025.pdf',
    officialLabel: 'Formato MINEDUC 2025 (obligatorio)',
    description: 'Síntesis de avances pedagogicos escrita en lenguaje accesible para padres/apoderados. Semestral o anual obligatorio.',
    requiresMineduc: true,
    ministerial: true,
    docTitle: 'INFORME PARA LA FAMILIA',
    firmantes: ['Fonoaudióloga', 'Psicólogo/a', 'Prof. Educación Diferencial', 'Apoderado/a'],
    info: {
      cuando: 'El formato ministerial se exige en INGRESO y EGRESO (Cartilla 6). En seguimiento basta informar por medios habituales (notas, entrevistas); el informe semestral/trimestral es buena práctica interna, no exigencia ministerial.',
      paraQuien: 'Todo estudiante PIE. Se entrega al apoderado titular firmado.',
      renovacion: 'Obligatorio en ingreso y egreso. Semestral/trimestral opcional como práctica del establecimiento.'
    },
    // Estructura alineada al formato oficial "INFORME PARA LA FAMILIA" (MINEDUC 2025).
    schema: {
      sections: [
        { key: 'identificacion', label: '1. Identificación del estudiante', icon: 'fa-user',
          fields: [
            ...STUDENT_BLOCK,
            { id: 'student_edad',        label: 'Edad', type: 'text', placeholder: 'Ej: 9 años' },
            { id: 'student_diagnostico', label: 'Diagnóstico', type: 'text' }
          ]},
        { key: 'recibe', label: '2. Identificación de quien RECIBE la información', icon: 'fa-person-arrow-down-to-line',
          fields: [
            { id: 'recibe_nombre',   label: 'Nombre', type: 'text' },
            { id: 'recibe_rut',      label: 'RUT', type: 'text' },
            { id: 'recibe_relacion', label: 'Relación con el estudiante', type: 'select',
              options: ['Apoderado/a titular', 'Apoderado/a suplente', 'Otro'] }
          ]},
        { key: 'entrega', label: '3. Identificación de quien ENTREGA la información', icon: 'fa-person-chalkboard',
          fields: [
            { id: 'entrega_nombre', label: 'Nombre', type: 'text' },
            { id: 'entrega_rut',    label: 'RUT', type: 'text' },
            { id: 'entrega_cargo',  label: 'Rol / Cargo', type: 'text', placeholder: 'Ej: Prof. Educación Diferencial' },
            { id: 'entrega_fecha',  label: 'Fecha de entrega del informe', type: 'date' }
          ]},
        { key: 'avances_pedag', label: '4. Avances pedagógicos en Lenguaje y Matemática', icon: 'fa-arrow-trend-up',
          fields: [
            { id: 'avances_pedag', label: 'Avances pedagógicos en las áreas de Lenguaje y Matemática', type: 'textarea', rows: 4 }
          ]},
        { key: 'necesidades_pedag', label: '5. Necesidades de apoyo en Lenguaje y Matemática', icon: 'fa-circle-exclamation',
          fields: [
            { id: 'necesidades_pedag', label: 'Necesidades de apoyo en las áreas de Lenguaje y Matemática', type: 'textarea', rows: 4 }
          ]},
        { key: 'avances_psico', label: '6. Avances área psicológica', icon: 'fa-brain',
          fields: [
            { id: 'avances_psico', label: 'Avances en el área psicológica', type: 'textarea', rows: 3 }
          ]},
        { key: 'avances_fono', label: '7. Avances área fonoaudiológica', icon: 'fa-comment-medical',
          fields: [
            { id: 'avances_fono', label: 'Avances en el área fonoaudiológica', type: 'textarea', rows: 3 }
          ]},
        { key: 'acuerdos', label: '8. Acuerdos y compromisos escuela – hogar', icon: 'fa-handshake',
          fields: [
            { id: 'acuerdos', label: 'Acuerdos y compromisos entre la escuela y el hogar', type: 'textarea', rows: 4 }
          ]}
      ]
    }
  },

  fur: {
    key: 'fur',
    phase: 'seguimiento',
    label: 'FUR',
    sublabel: 'Formulario Único de Reevaluación',
    icon: 'fa-arrows-rotate',
    route: '/docs.html?type=fur',
    decree: 'DS 170/2009 art. 11',
    officialUrl: 'https://especial.mineduc.cl/implementacion-dcto-supr-no170/formulario-unico/',
    officialLabel: 'Formato MINEDUC por diagnostico (TEL, DEA, TDA, TEA, FIL, DI, etc.)',
    // URLs por diagnostico (formularios oficiales 2012, vigentes).
    // El editor cliente las usa para mostrar la oficial correspondiente al estudiante.
    officialByDiag: {
      'TEL': 'https://especial.mineduc.cl/wp-content/uploads/sites/31/2020/11/FU_REVALUACION_TEL_2012.pdf',
      'DEA': 'https://especial.mineduc.cl/wp-content/uploads/sites/31/2020/11/FU_REVALUACION_DEA_2012.pdf',
      'TDA': 'https://especial.mineduc.cl/wp-content/uploads/sites/31/2020/11/FU_REVALUACION_TDA_20121.pdf',
      'FIL': 'https://especial.mineduc.cl/wp-content/uploads/sites/31/2021/07/FU_REVALUACION_FIL_-2012-1.pdf',
      'DI':  'https://especial.mineduc.cl/wp-content/uploads/sites/31/2016/09/201210291841320.FU_REVALUACION_D_INTELECTUAL_NEEP_-2012-1.pdf',
      'TEA': 'https://especial.mineduc.cl/wp-content/uploads/sites/31/2016/09/201210291844310.FU_REVALUACION_TEA_2012-1.pdf',
      // Discapacidades sensoriales/motoras y disfasia: formularios oficiales 2012 que SI existen.
      'DV':  'https://especial.mineduc.cl/wp-content/uploads/sites/31/2016/09/201210291847010.FU_REEVALUACION_DISCAPACIDAD_VISUAL_2012-1.pdf',
      'DA':  'https://especial.mineduc.cl/wp-content/uploads/sites/31/2016/09/201210291846100.FU_REEVALUACION_DISCAPACIDAD_AUDITIVA_2012-1.pdf',
      'DM':  'https://especial.mineduc.cl/wp-content/uploads/sites/31/2016/09/FU_REVALUACION_DISCAPACIDAD-MOTORA_2012.pdf',
      'MULT':'https://especial.mineduc.cl/wp-content/uploads/sites/31/2016/09/201210291849000.FU_REVALUACION_DISCAPACIDAD-MULTIPLE_2012-1.pdf',
      'DISF':'https://especial.mineduc.cl/wp-content/uploads/sites/31/2016/09/201210291847510.FU_REVALUACION_DISFASIA-SEVERA_2012-1.pdf'
    },
    // Etiqueta legible por codigo FUR (para mostrar al educador)
    diagLabel: {
      'TEL': 'Trastorno del Lenguaje (TL)',
      'DEA': 'Dificultad Específica de Aprendizaje',
      'TDA': 'TDA / TDAH',
      'FIL': 'Funcionamiento Intelectual Limítrofe',
      'DI':  'Discapacidad Intelectual',
      'TEA': 'Trastorno del Espectro Autista',
      'DV':  'Discapacidad Visual',
      'DA':  'Discapacidad Auditiva',
      'DM':  'Discapacidad Motora',
      'MULT':'Discapacidad Múltiple',
      'DISF':'Disfasia Severa'
    },
    // Mapeo internal diagnosis_id (REEVAL_RULES) -> codigo FUR oficial.
    // Desde 2025 el TEL es "Trastorno del Lenguaje (TL)" sin subtipos: ambos ids
    // historicos (tel_e/tel_m) usan el mismo FU, dejando en blanco la casilla mixto/expresivo.
    diagToFurCode: {
      'tel_e':    'TEL',
      'tel_m':    'TEL',
      'dea':      'DEA',
      'tda':      'TDA',
      'fil':      'FIL',
      'di_l':     'DI',
      'di_m':     'DI',
      'di_s':     'DI',
      'tea':      'TEA',
      'rgd':      'TEA', // GARC / salud mental: usa el FU de TEA, consignando el diagnostico real en Observaciones (Cartilla 6)
      'dv':       'DV',
      'da':       'DA',
      'disc_mot': 'DM',
      'sordoceg': 'MULT' // Sordoceguera: sin formato propio, usar Discapacidad Multiple
    },
    description: 'Formulario MINISTERIAL obligatorio. NEEP: FUR anual al cierre de los años 1 a 4 (el año 5 es reevaluación integral, sin FUR). NEET: FUR solo al cierre del año 1 (el año 2 es reevaluación integral). DI y RGD siguen ciclo de 2 años. Certifica continuidad, cambio de categoría o egreso.',
    requiresMineduc: true,
    ministerial: true,
    info: {
      cuando: 'Al cierre del año escolar (iniciar en noviembre, hasta diciembre). 4° medio: en octubre, junto al informe psicopedagógico para ajustes PAES. NEEP: cierre de años 1-4. NEET: solo cierre del año 1. DI/RGD: cada 2 años.',
      paraQuien: 'Todo estudiante PIE en los años en que NO corresponde reevaluación integral (esa usa FUDEI + informe psicopedagógico completos).',
      renovacion: 'NEEP: anual (años 1-4). NEET: solo año 1. DI/RGD: cada 2 años. Fuente: Cartilla 5 §4.2.2 y anexos por diagnóstico.'
    },
    schema: {
      sections: [
        { key: 'identificacion', label: '1. Identificación del estudiante', icon: 'fa-user', fields: STUDENT_BLOCK },
        { key: 'diagnostico_actual', label: '2. Diagnóstico vigente', icon: 'fa-stethoscope',
          fields: [
            { id: 'diag_categoria', label: 'Categoria NEE', type: 'select', options: ['NEET (Transitoria)', 'NEEP (Permanente)'] },
            { id: 'diag_codigo',    label: 'Codigo diagnostico', type: 'select',
              options: ['TEL', 'DEA', 'TDA', 'FIL', 'DI', 'TEA', 'Disfasia', 'Discapacidad motora', 'Discapacidad visual', 'Discapacidad auditiva', 'Discapacidad multiple', 'Otro'] },
            { id: 'fecha_diag_inicial', label: 'Fecha del diagnostico inicial', type: 'date' }
          ]},
        { key: 'apoyos_entregados', label: '3. Apoyos entregados en el periodo', icon: 'fa-people-arrows',
          fields: [
            { id: 'apoyos_entregados', label: 'Detalle de apoyos (profesionales, frecuencia, modalidad)', type: 'textarea', rows: 4 }
          ]},
        { key: 'progreso', label: '4. Evaluación de progreso', icon: 'fa-arrow-trend-up',
          fields: [
            { id: 'progreso_cualitativo', label: 'Progreso cualitativo', type: 'textarea', rows: 3 },
            { id: 'progreso_cuantitativo', label: 'Progreso cuantitativo (instrumentos)', type: 'textarea', rows: 3 }
          ]},
        { key: 'reevaluacion', label: '5. Resultados de la reevaluacion', icon: 'fa-flask',
          fields: [
            { id: 'instrumentos_reev', label: 'Instrumentos aplicados', type: 'textarea', rows: 2 },
            { id: 'resultados_reev',   label: 'Resultados', type: 'textarea', rows: 3 }
          ]},
        { key: 'decision', label: '6. Decision', icon: 'fa-scale-balanced',
          fields: [
            { id: 'decision', label: 'Decisión', type: 'select',
              options: ['Continuidad en el PIE con misma categoria', 'Continuidad con cambio de categoria diagnostica', 'Egreso del PIE', 'Derivacion a otro programa'] },
            { id: 'justificacion', label: 'Justificacion', type: 'textarea', rows: 3 }
          ]},
        { key: 'sugerencias', label: '7. Sugerencias para el siguiente periodo', icon: 'fa-lightbulb',
          fields: [
            { id: 'sugerencias', label: 'Sugerencias', type: 'textarea', rows: 3 }
          ]},
        { key: 'certificacion', label: '8. Profesional certificante', icon: 'fa-id-card-clip',
          fields: [
            { id: 'cert_nombre', label: 'Nombre completo', type: 'text' },
            { id: 'cert_rut',    label: 'RUT', type: 'text' },
            { id: 'cert_registro', label: 'Registro MINEDUC', type: 'text' }
          ]}
      ]
    }
  },

  interconsulta: {
    key: 'interconsulta',
    phase: 'ingreso',
    label: 'Interconsulta / Derivación',
    sublabel: 'Derivación a otro profesional',
    icon: 'fa-share-from-square',
    route: '/docs.html?type=interconsulta',
    decree: 'Formato MINEDUC 2010',
    officialUrl: 'https://especial.mineduc.cl/implementacion-dcto-supr-no170/otros-formularios/',
    officialLabel: 'Formato MINEDUC (índice general)',
    description: 'Solicitud formal de evaluación o atención de un profesional externo (psicólogo, neurólogo, fonoaudiólogo, etc.) cuando el equipo PIE necesita confirmar o ampliar el diagnóstico.',
    requiresMineduc: true,
    info: {
      cuando: 'Cuando el equipo PIE detecta la necesidad de confirmación diagnóstica externa o segunda opinión.',
      paraQuien: 'Estudiantes en evaluación o seguimiento que requieren consulta especializada.',
      renovacion: 'Por evento (cada vez que se requiere una interconsulta).'
    },
    schema: {
      sections: [
        { key: 'identificacion', label: '1. Estudiante', icon: 'fa-user', fields: STUDENT_BLOCK },
        { key: 'derivacion', label: '2. Profesional de destino', icon: 'fa-user-doctor',
          fields: [
            { id: 'prof_dest_nombre', label: 'Nombre o institución', type: 'text', required: true },
            { id: 'prof_dest_esp',    label: 'Especialidad', type: 'select',
              options: ['Psicólogo/a', 'Fonoaudiólogo/a', 'Neurólogo/a', 'Kinesiólogo/a', 'Terapeuta Ocupacional', 'Pediatra', 'Otorrinolaringólogo/a', 'Oftalmólogo/a', 'Otro'] }
          ]},
        { key: 'motivo', label: '3. Motivo de la derivación', icon: 'fa-clipboard-question',
          fields: [
            { id: 'motivo', label: 'Razón clínica/pedagógica', type: 'textarea', rows: 4, required: true },
            { id: 'antecedentes', label: 'Antecedentes relevantes', type: 'textarea', rows: 3 }
          ]},
        { key: 'esperado', label: '4. Lo que se espera del profesional', icon: 'fa-bullseye',
          fields: [
            { id: 'expectativa', label: 'Información o procedimiento solicitado', type: 'textarea', rows: 3 }
          ]}
      ]
    }
  },

  checklist_respaldo: {
    key: 'checklist_respaldo',
    phase: 'ingreso',
    label: 'Checklist Respaldo Documental',
    sublabel: 'Carpeta del estudiante (Cartilla 5)',
    icon: 'fa-folder-tree',
    route: '/docs.html?type=checklist_respaldo',
    decree: 'Cartilla 5 MINEDUC 2025 + Nuevas Precisiones feb 2026',
    officialUrl: 'https://especial.mineduc.cl/wp-content/uploads/sites/31/2025/11/Cartilla_5_Requisitos_Respaldo_Documental-2025.pdf',
    officialUrlPdf: 'https://especial.mineduc.cl/wp-content/uploads/sites/31/2026/02/NUEVA-CARTILLA-5-Precisiones.pdf',
    officialLabel: 'Cartilla 5 MINEDUC 2025 + Precisiones 2026',
    description: 'Índice/checklist que define exactamente qué documentos debe contener la carpeta de respaldo del estudiante para auditorías y fiscalización MINEDUC.',
    requiresMineduc: true,
    info: {
      cuando: 'Al armar o auditar la carpeta de respaldo del estudiante. Útil antes de fiscalización.',
      paraQuien: 'Por cada estudiante PIE.',
      renovacion: 'Anual al cierre, o cuando MINEDUC publica precisiones nuevas (febrero 2026).'
    },
    schema: {
      sections: [
        { key: 'identificacion', label: '1. Estudiante', icon: 'fa-user', fields: STUDENT_BLOCK },
        { key: 'docs_ingreso', label: '2. Documentos de ingreso', icon: 'fa-door-open',
          fields: [
            { id: 'check_anamnesis',         label: 'Anamnesis', type: 'checkbox' },
            { id: 'check_ip',                label: 'Informe Psicopedagógico + Pauta de Observación (formato 2025)', type: 'checkbox' },
            { id: 'check_protocolo_psp',     label: 'Protocolo de evaluación psicopedagógica (todos los diagnósticos; DEA: al menos 1 prueba estandarizada)', type: 'checkbox' },
            { id: 'check_fudei',             label: 'FUDEI finalizado en plataforma online', type: 'checkbox' },
            { id: 'check_esp',               label: 'Informe(s) de especialista(s) — TL, FIL, DI, TEA, GARC', type: 'checkbox' },
            { id: 'check_protocolo_esp',     label: 'Protocolo(s) del especialista (WISC/WAIS + conducta adaptativa en DI/FIL; fonoaudiológico en TL/TEA)', type: 'checkbox' },
            { id: 'check_autorizacion',      label: 'Autorización firmada por apoderado', type: 'checkbox' },
            { id: 'check_salud',             label: 'Valoración de Salud (FU 2024 o certificado médico propio válido)', type: 'checkbox' }
          ]},
        { key: 'docs_planificacion', label: '3. Documentos de planificación', icon: 'fa-calendar-day',
          fields: [
            { id: 'check_pai',               label: 'PAI vigente', type: 'checkbox' },
            { id: 'check_paci',              label: 'PACI vigente (si aplica)', type: 'checkbox' },
            { id: 'check_colaborativo',      label: 'Registros de Trabajo Colaborativo (semanales)', type: 'checkbox' },
            { id: 'check_atencion',          label: 'Registro de Atención (aula recursos)', type: 'checkbox' }
          ]},
        { key: 'docs_seguimiento', label: '4. Documentos de seguimiento', icon: 'fa-chart-line',
          fields: [
            { id: 'check_informe_familia',   label: 'Informe a la Familia (ministerial: ingreso y egreso)', type: 'checkbox' },
            { id: 'check_fur',               label: 'FUR del período (NEEP años 1-4; NEET año 1; DI/RGD cada 2 años)', type: 'checkbox' },
            { id: 'check_avance',            label: 'Informe de Avance Pedagógico', type: 'checkbox' }
          ]},
        { key: 'docs_egreso', label: '5. Egreso (solo si el estudiante egresa del PIE)', icon: 'fa-door-closed',
          fields: [
            { id: 'check_egreso_ip',     label: 'Informe psicopedagógico que fundamenta el egreso', type: 'checkbox' },
            { id: 'check_egreso_fur',    label: 'FUR con la decisión de egreso argumentada en Observaciones', type: 'checkbox' },
            { id: 'check_egreso_familia',label: 'Informe a la Familia justificando el egreso', type: 'checkbox' }
          ]},
        { key: 'observaciones', label: '6. Observaciones', icon: 'fa-note-sticky',
          fields: [
            { id: 'nota_certificado', label: 'Nota: el certificado de nacimiento NO debe duplicarse en la carpeta PIE; basta el resguardado en matrícula (Precisiones feb 2026). El egreso es posible desde el fin del año 1 (Cartilla 6).', type: 'checkbox' },
            { id: 'fecha_auditoria', label: 'Fecha de revisión', type: 'date' },
            { id: 'pendientes',      label: 'Documentos pendientes (a completar)', type: 'textarea', rows: 3 },
            { id: 'observaciones',   label: 'Observaciones', type: 'textarea', rows: 3 }
          ]}
      ]
    }
  },

  informe_avance: {
    key: 'informe_avance',
    phase: 'seguimiento',
    label: 'Informe de Avance Pedagogico',
    sublabel: 'Cualitativo y tecnico',
    icon: 'fa-chart-simple',
    route: '/docs.html?type=informe_avance',
    decree: 'D83/2015 + DS 170/2009 art. 89',
    officialUrl: null,
    officialLabel: 'Sin formato unico (se integra con Informe Familia y FUR)',
    description: 'Registro tecnico del desempeno del estudiante en los objetivos curriculares adecuados. Insumo para el FUR y el Informe a la Familia.',
    requiresMineduc: true,
    info: {
      cuando: 'Al cierre de cada trimestre o semestre, según planificación del PACI.',
      paraQuien: 'Estudiantes con PACI (adecuaciones a OAs). Sirve de insumo para el Informe a la Familia y el FUR.',
      renovacion: 'Trimestral o semestral. Es documento técnico interno; no se entrega a la familia directamente.'
    },
    schema: {
      sections: [
        { key: 'identificacion', label: '1. Identificación del estudiante y periodo', icon: 'fa-user',
          fields: [
            ...STUDENT_BLOCK,
            { id: 'periodo', label: 'Periodo', type: 'select',
              options: ['1er Trimestre', '2do Trimestre', '3er Trimestre', '1er Semestre', '2do Semestre', 'Anual'] }
          ]},
        { key: 'asignaturas', label: '2. Asignaturas con adecuaciones', icon: 'fa-book',
          fields: [
            { id: 'asignaturas', label: 'Asignaturas con adecuaciones (acceso / objetivos)', type: 'textarea', rows: 3 }
          ]},
        { key: 'oa', label: '3. Objetivos de Aprendizaje priorizados', icon: 'fa-bullseye',
          fields: [
            { id: 'oa_priorizados', label: 'OAs trabajados y estado de logro', type: 'textarea', rows: 5,
              placeholder: 'Ej: OA1 Lenguaje - Logrado / OA3 Matematica - En desarrollo / OA5 Historia - Por lograr' }
          ]},
        { key: 'evidencias', label: '4. Evidencias pedagogicas', icon: 'fa-folder-open',
          fields: [
            { id: 'evidencias', label: 'Trabajos, evaluaciones, observaciones', type: 'textarea', rows: 3 }
          ]},
        { key: 'estrategias', label: '5. Estrategias y ajustes', icon: 'fa-lightbulb',
          fields: [
            { id: 'estrategias_efectivas', label: 'Estrategias que funcionaron', type: 'textarea', rows: 2 },
            { id: 'estrategias_ajuste',    label: 'Estrategias que requieren ajuste', type: 'textarea', rows: 2 }
          ]},
        { key: 'recomendaciones', label: '6. Recomendaciones de ajuste al PACI/PAI', icon: 'fa-rotate',
          fields: [
            { id: 'recomendaciones', label: 'Recomendaciones', type: 'textarea', rows: 3 }
          ]}
      ]
    }
  }
};

// ============================================================
// REGLAS DE RECURRENCIA Y UNICIDAD (para checklist + dedup)
// ============================================================
// Cada doc tiene una "clave de unicidad" que evita duplicados:
//   once          : 1 por estudiante (Anamnesis, Autorización, etc.)
//   annual        : 1 por estudiante por año (PAI, Informe Psicopedagógico)
//   trimester     : 1 por estudiante por trimestre (PACI, Informe Avance)
//   semester      : 1 por estudiante por semestre (Informe Familia)
//   periodic-fur  : 1 cada N años según diagnóstico (FUR)
//   continuous    : Sin restricción (Reg. Colaborativo, Reg. Atención)
// Periodicidades alineadas a Cartilla 5 (2025) + Precisiones (feb 2026) + Cartilla 6
// (abr 2026): MINEDUC organiza el expediente por CICLOS DE REEVALUACION INTEGRAL
// (2 anos NEET/DI/RGD; 5 anos resto NEEP), no por renovacion anual uniforme.
// `mode` solo controla la clave de unicidad (dedup); `required` la obligatoriedad
// del checklist; `renewMonths` el aviso de "proximo a vencer".
window.DOC_RECURRENCE = {
  // Una sola vez al ingreso (se mantiene la misma del ano 1):
  anamnesis:                { mode: 'once',         renewMonths: 0,  required: true,  group: 'Ingreso' },
  autorizacion_familia:     { mode: 'once',         renewMonths: 0,  required: true,  group: 'Ingreso' },
  // Ingreso + cada reevaluacion integral + egreso (no anual):
  informe_psicopedagogico:  { mode: 'annual',       renewMonths: 0,  required: true,  group: 'Ingreso' },
  fudei:                    { mode: 'annual',       renewMonths: 0,  required: true,  group: 'Ingreso' },
  // Solo para diagnosticos que lo requieren (TL, FIL, DI, TEA, GARC):
  informe_especialista:     { mode: 'annual',       renewMonths: 0,  required: false, group: 'Ingreso' },
  // Se renueva por ciclo (2 anos NEET/DI; resto NEEP fin de ano 3-5). El FU es optativo:
  valoracion_salud:         { mode: 'annual',       renewMonths: 0,  required: true,  group: 'Ingreso' },

  pai:                      { mode: 'annual',       renewMonths: 12, required: true,  group: 'Planificación' },
  paci:                     { mode: 'trimester',    renewMonths: 4,  required: false, group: 'Planificación' },
  registro_colaborativo:    { mode: 'continuous',   renewMonths: 0,  required: false, group: 'Planificación' },
  registro_atencion:        { mode: 'continuous',   renewMonths: 0,  required: false, group: 'Planificación' },

  // Formato ministerial exigible en ingreso y egreso; el semestral es practica interna:
  informe_familia:          { mode: 'semester',     renewMonths: 0,  required: true,  group: 'Seguimiento' },
  // FUR: NEEP anual (cierre anos 1-4; ano 5 = reevaluacion integral); NEET solo fin ano 1.
  // DI/RGD ciclo de 2 anos. 4 medio: en octubre (incluye FUR + informe para PAES):
  fur:                      { mode: 'periodic-fur', renewMonths: 12, required: true,  group: 'Seguimiento' },
  informe_avance:           { mode: 'trimester',    renewMonths: 4,  required: false, group: 'Seguimiento' }
};

// Devuelve la "clave de unicidad" de un documento dado.
// Si dos documentos generan la misma clave para el mismo estudiante => duplicado.
window.docUnicidadKey = function(planType, trimester, fecha) {
  const rule = window.DOC_RECURRENCE[planType];
  if (!rule || rule.mode === 'continuous') return null; // sin restricción
  const d = fecha ? new Date(fecha) : new Date();
  const year = d.getFullYear();
  if (rule.mode === 'once')        return planType + ':once';
  if (rule.mode === 'annual')      return planType + ':' + year;
  if (rule.mode === 'trimester')   return planType + ':' + year + ':' + (trimester || 'sin-tri');
  if (rule.mode === 'semester')    {
    // Trimestres 1-2 = 1er semestre, 3 = 2do
    const semestre = (trimester && trimester.includes('3')) ? 'S2' : 'S1';
    return planType + ':' + year + ':' + semestre;
  }
  if (rule.mode === 'periodic-fur') return planType + ':' + year;
  return null;
};

window.DOC_TYPE_KEYS = Object.keys(window.DOC_TYPES);

window.getDocsByPhase = function(phaseKey) {
  return Object.values(window.DOC_TYPES).filter(d => d.phase === phaseKey);
};

window.isValidDocType = function(key) {
  return Object.prototype.hasOwnProperty.call(window.DOC_TYPES, key);
};
