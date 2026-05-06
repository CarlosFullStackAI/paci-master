import { getUser } from '../auth-helper.js';
import { checkRateLimit, callAI, sanitizeForPrompt } from './ai-helper.js';

// POST /api/ai/generate-classes
// Genera N clases pedagogicas DUA personalizadas usando IA en base a los OAs adaptados.
//
// Estrategia: si numClases > LOTE_SIZE, divide en lotes y los pide a la IA en cascada.
// Cada lote es una llamada IA independiente; callAI internamente prueba
// OpenRouter -> Groq -> Gemini si alguno falla. Si despues de todos los lotes
// faltan clases, las completa con plantillas procedurales en el frontend.
//
// Ventaja: sin limite duro de clases. 27, 40, 60+ clases funcionan.
// Cuesta: 1 sola consulta del rate limit (independiente de cuantos lotes IA se hagan).
//
// Body: { oas, asignatura, nivel, diagnosisId, diagnosisName, studentLevel, numClases, esParvularia }

const LOTE_SIZE = 12; // Clases por llamada IA. Balance entre calidad y max_tokens.
const MAX_CLASES = 60; // Tope sano. Cualquier PACI normal cabe ahi.

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    const rl = await checkRateLimit(env, user.email);
    if (!rl.allowed) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Has alcanzado el limite diario de consultas IA (100/dia). Intenta manana.',
        remaining: 0
      }), { status: 429, headers });
    }

    const body = await request.json();
    const {
      oas, asignatura, nivel, diagnosisId, diagnosisName,
      studentLevel, numClases, esParvularia
    } = body;

    if (!Array.isArray(oas) || !oas.length) {
      return new Response(JSON.stringify({ ok: false, error: 'Se requiere al menos un OA.' }), { status: 400, headers });
    }
    if (!numClases || numClases < 1 || numClases > MAX_CLASES) {
      return new Response(JSON.stringify({ ok: false, error: `numClases debe estar entre 1 y ${MAX_CLASES}.` }), { status: 400, headers });
    }

    // Sanitizar inputs comunes a todos los lotes
    const oasFormateados = oas.slice(0, 8).map(oa => {
      const code = sanitizeForPrompt(oa.code || '');
      const texto = sanitizeForPrompt(oa.textoAdecuado || oa.textoOriginal || oa.text || '');
      return `- ${code}: ${texto}`;
    }).join('\n');

    const ctx = {
      asignatura: sanitizeForPrompt(asignatura || 'General'),
      nivel: sanitizeForPrompt(nivel || ''),
      diagnostico: sanitizeForPrompt(diagnosisName || diagnosisId || 'NEE no especificada'),
      studentLevel: sanitizeForPrompt(studentLevel || nivel || ''),
      ambitoLabel: esParvularia ? 'Nucleo de Aprendizaje' : 'Asignatura',
      oasFormateados,
      total: numClases
    };

    // Calcular cuantos lotes y rangos
    const numLotes = Math.ceil(numClases / LOTE_SIZE);
    const todasLasClases = [];
    const proveedoresUsados = [];
    const erroresLotes = [];

    for (let lote = 0; lote < numLotes; lote++) {
      const desde = lote * LOTE_SIZE + 1;
      const hasta = Math.min((lote + 1) * LOTE_SIZE, numClases);
      const cantidadLote = hasta - desde + 1;

      try {
        // Pasar las ultimas 12 clases ya generadas como contexto anti-repeticion.
        // Si todasLasClases.length > 12, solo las ultimas 12 (suficientes para evitar repeticion)
        const clasesPrevias = todasLasClases.slice(-12);
        const lotResult = await generarLote(env, ctx, { desde, hasta, cantidadLote, lote, numLotes, clasesPrevias });
        todasLasClases.push(...lotResult.clases);
        if (lotResult.provider) proveedoresUsados.push(lotResult.provider);
      } catch (e) {
        // Si un lote falla, lo registramos pero seguimos con los siguientes.
        // Las clases faltantes se completan en el frontend con plantillas procedurales.
        erroresLotes.push(`Lote ${lote + 1} (clases ${desde}-${hasta}): ${e.message}`);
      }
    }

    if (todasLasClases.length === 0) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'La IA no genero ninguna clase. ' + (erroresLotes[0] || 'Intenta de nuevo.'),
        erroresLotes
      }), { status: 502, headers });
    }

    return new Response(JSON.stringify({
      ok: true,
      clases: todasLasClases.slice(0, numClases),
      remaining: rl.remaining,
      lotes: numLotes,
      lotesExitosos: numLotes - erroresLotes.length,
      proveedores: [...new Set(proveedoresUsados)],
      erroresLotes: erroresLotes.length ? erroresLotes : undefined
    }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error IA: ' + e.message }), { status: 500, headers });
  }
}

// Genera un lote de clases (entre desde y hasta) llamando a la IA con cascada de proveedores.
// clasesPrevias: clases ya generadas (max 12) para evitar repeticion entre lotes.
async function generarLote(env, ctx, { desde, hasta, cantidadLote, lote, numLotes, clasesPrevias }) {
  // Indicacion de continuidad pedagogica si hay mas de un lote
  let contextoLote = '';
  if (numLotes > 1) {
    if (lote === 0) {
      contextoLote = `Estas son las PRIMERAS ${cantidadLote} clases (${desde} a ${hasta}) de un total de ${ctx.total}. Deben ser introductorias, presentando los conceptos base y activando conocimientos previos.`;
    } else if (lote === numLotes - 1) {
      contextoLote = `Estas son las ULTIMAS ${cantidadLote} clases (${desde} a ${hasta}) de un total de ${ctx.total}. Deben enfocarse en sintesis, aplicacion final y evaluacion.`;
    } else {
      contextoLote = `Estas son las clases INTERMEDIAS ${desde} a ${hasta} de un total de ${ctx.total}. Deben profundizar y aplicar progresivamente lo introducido.`;
    }
  }

  // Resumen de clases ya generadas para evitar repeticiones (lotes 2 en adelante)
  let resumenPrevias = '';
  if (clasesPrevias && clasesPrevias.length > 0) {
    resumenPrevias = `\n\nCLASES YA GENERADAS PREVIAMENTE (NO REPITAS estas actividades, materiales ni enfoques):\n` +
      clasesPrevias.map(cl => {
        const actCorto = String(cl.act || '').replace(/\s+/g, ' ').substring(0, 100);
        return `- Clase ${cl.n}: ${actCorto}...`;
      }).join('\n') +
      `\n\nINSTRUCCION CRITICA ANTI-REPETICION: Las nuevas clases deben tener actividades, materiales y enfoques COMPLETAMENTE DISTINTOS de las clases listadas arriba. Varia el tipo de actividad (lectura, escritura, oral, manipulativo, juego, exploracion, dramatizacion, dibujo, etc.), los materiales y la estructura. Cada clase debe ser unica.`;
  }

  const messages = [
    {
      role: 'system',
      content: `Eres un experto en educacion diferencial chilena, especializado en planificacion pedagogica DUA (Diseno Universal para el Aprendizaje) para estudiantes con Necesidades Educativas Especiales segun Decreto 83/2015 y Decreto 170/2009.

Tu tarea es generar una secuencia de clases pedagogicas adaptadas, basadas en los Objetivos de Aprendizaje (OA) entregados.

REGLAS OBLIGATORIAS:
- Cada clase debe seguir estructura DUA: INICIO (activar conocimientos previos, propósito), DESARROLLO (modelado, práctica guiada, práctica autónoma con apoyo visual y andamiaje), CIERRE (síntesis, metacognición).
- Las clases deben ser realizables en aula chilena con apoyo PIE (sin recursos costosos).
- Adaptar el nivel de complejidad al diagnóstico y nivel real del estudiante.
- Variar las actividades entre clases (no repetir la misma estructura idéntica).
- Usar vocabulario educativo chileno formal.
- Incluir materiales concretos y específicos.
- Responder SIEMPRE en español.
- Responder ESTRICTAMENTE en formato JSON valido.`
    },
    {
      role: 'user',
      content: `Genera ${cantidadLote} clases pedagogicas (numeradas de ${desde} a ${hasta}) para:

${ctx.ambitoLabel}: ${ctx.asignatura}
Nivel de trabajo: ${ctx.nivel}
Estudiante: diagnostico "${ctx.diagnostico}", nivel real "${ctx.studentLevel}".

Objetivos de Aprendizaje a trabajar:
${ctx.oasFormateados}

${contextoLote}${resumenPrevias}

Devuelve EXACTAMENTE este JSON (sin texto adicional fuera del JSON):
{
  "clases": [
    {
      "n": ${desde},
      "act": "Actividad central completa: Inicio (~2 lineas) + Desarrollo (~4-5 lineas con modelado, practica guiada y autonoma) + Cierre (~2 lineas con sintesis y metacognicion).",
      "c": "Contenidos conceptuales especificos",
      "p": "Contenidos procedimentales especificos",
      "a": "Contenidos actitudinales",
      "materiales": ["material 1", "material 2", "material 3"]
    }
  ]
}

Genera EXACTAMENTE ${cantidadLote} objetos en "clases", numerados de ${desde} a ${hasta}.`
    }
  ];

  // max_tokens dinamico para este lote: ~280 tokens por clase + 800 estructura.
  const tokensEstimados = Math.max(1500, cantidadLote * 320 + 800);
  const result = await callAI(env, messages, {
    temperature: 0.7,
    maxTokens: Math.min(tokensEstimados, 8000),
    jsonMode: true
  });

  // Limpiar respuesta (algunos modelos envuelven en ```json ... ```)
  const rawContent = (result.content || '').trim();
  let cleaned = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  let parsed = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error('JSON invalido: ' + e.message);
  }

  const clases = (parsed && Array.isArray(parsed.clases)) ? parsed.clases : [];
  if (!clases.length) {
    throw new Error('respuesta sin clases');
  }

  // Normalizar campos
  const clasesNorm = clases.slice(0, cantidadLote).map((cl, i) => ({
    n: typeof cl.n === 'number' ? cl.n : (desde + i),
    act: String(cl.act || ''),
    c: String(cl.c || ''),
    p: String(cl.p || ''),
    a: String(cl.a || ''),
    materiales: Array.isArray(cl.materiales) ? cl.materiales.map(m => String(m)) : []
  }));

  return { clases: clasesNorm, provider: result.provider, model: result.model };
}
