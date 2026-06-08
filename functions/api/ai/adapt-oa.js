import { getUser } from '../auth-helper.js';
import { checkRateLimit, callAI, sanitizeForPrompt } from './ai-helper.js';

// POST /api/ai/adapt-oa
// Recibe un OA + nivel del estudiante + diagnostico
// Retorna sugerencias de adaptacion (simplificacion, graduacion)
export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };

  try {
    const user = await getUser(request, env);
    if (!user) return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), { status: 401, headers });

    // Rate limiting
    const rl = await checkRateLimit(env, user.email);
    if (!rl.allowed) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Has alcanzado el limite diario de consultas IA (100/dia). Intenta manana.',
        remaining: 0
      }), { status: 429, headers });
    }

    const body = await request.json();
    const { oaCode, oaText, studentLevel, targetLevel, diagnosisId, diagnosisName } = body;

    if (!oaText || !studentLevel) {
      return new Response(JSON.stringify({ ok: false, error: 'oaText y studentLevel requeridos.' }), { status: 400, headers });
    }

    // Sanitizar inputs
    const safeOaText = sanitizeForPrompt(oaText);
    const safeDiagnosis = sanitizeForPrompt(diagnosisName || diagnosisId || '');
    const safeLevel = sanitizeForPrompt(studentLevel);
    const safeTarget = sanitizeForPrompt(targetLevel || '');

    const messages = [
      {
        role: 'system',
        content: `# CONTEXTO
Eres un asistente experto en Educacion Especial en Chile, con dominio profundo del Decreto 83/2015, la normativa del Programa de Integracion Escolar (PIE) y el curriculum nacional vigente del MINEDUC. Tu objetivo es generar documentacion pedagogica tecnica, precisa y centrada en el estudiante, actuando como un colaborador para educadores diferenciales.

# REGLAS DE ORO (MANDATOS)
1. Normativa: Toda adecuacion curricular debe seguir las directrices del Decreto 83 (acceso y objetivos). No inventes objetivos de aprendizaje; siempre cita los del curriculum vigente del MINEDUC.
2. Cartillas vigentes: Aplica las Cartillas MINEDUC actualizadas 2025-2026 (Cartilla 4 Informe Psicopedagogico 2025, Cartilla 5 Respaldo Documental + Precisiones feb 2026, Cartilla 6 Consideraciones Tecnicas PIE abril 2026, Instructivo Integracion FUDEI-PIE 2026).
3. Lenguaje: Usa terminologia tecnica pedagogica (NEE, DUA, Barreras, Apoyos). Tono profesional, objetivo, constructivo y libre de etiquetas estigmatizantes.
3. Estructura tecnica del OA: mantener HABILIDAD + CONTENIDO + ACTITUD en cada adaptacion.
4. Tipos de adecuacion (Decreto 83): acceso (presentacion, respuesta, entorno, tiempo) y en OA (graduacion, priorizacion, temporalizacion, enriquecimiento, eliminacion).
5. Las adaptaciones deben ser realistas y aplicables en un aula regular con apoyo PIE.
6. Responder SIEMPRE en espanol.
7. Para esta tarea: responder en formato JSON estricto, sin texto fuera del JSON.

# ANTEPONER pedagogia inclusiva sobre carga administrativa.`
      },
      {
        role: 'user',
        content: `Adapta el siguiente Objetivo de Aprendizaje para un estudiante con ${safeDiagnosis || 'NEE'}.

OA Original: ${safeOaText}
Nivel del estudiante: ${safeLevel}
${safeTarget ? 'Nivel de trabajo (PACI): ' + safeTarget : ''}

Genera exactamente este JSON:
{
  "oa_original": "el OA sin modificar",
  "adaptaciones": [
    {
      "tipo": "simplificacion",
      "oa_adaptado": "el OA simplificado manteniendo habilidad+contenido+actitud",
      "justificacion": "por que esta adaptacion es apropiada"
    },
    {
      "tipo": "graduacion",
      "oa_adaptado": "el OA graduado (nivel intermedio) manteniendo estructura",
      "justificacion": "por que esta graduacion es apropiada"
    },
    {
      "tipo": "priorizacion",
      "oa_adaptado": "el OA priorizado (foco en lo esencial)",
      "justificacion": "que se prioriza y por que"
    }
  ],
  "estrategias_apoyo": ["estrategia 1", "estrategia 2", "estrategia 3"],
  "criterios_evaluacion": ["criterio adaptado 1", "criterio adaptado 2"]
}`
      }
    ];

    const result = await callAI(env, messages, {
      temperature: 0.6,
      maxTokens: 1500,
      jsonMode: true
    });

    // Parsear respuesta JSON
    let parsed;
    try {
      parsed = JSON.parse(result.content);
    } catch (e) {
      // Si no es JSON valido, retornar el texto raw
      parsed = { raw: result.content, error: 'Respuesta no es JSON valido' };
    }

    return new Response(JSON.stringify({
      ok: true,
      adaptations: parsed,
      remaining: rl.remaining,
      model: result.model
    }), { status: 200, headers });

  } catch (e) {
    console.error('Error en adapt-oa:', e);
    return new Response(JSON.stringify({ ok: false, error: 'Error al generar la adaptacion con IA.' }), { status: 500, headers });
  }
}
