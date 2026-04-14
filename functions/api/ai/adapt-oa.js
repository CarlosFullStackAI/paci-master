import { getUser } from '../auth-helper.js';
import { checkRateLimit, callGroq, sanitizeForPrompt } from './groq-helper.js';

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
        error: 'Has alcanzado el limite diario de consultas IA (20/dia). Intenta manana.',
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
        content: `Eres un experto en educacion diferencial chilena, especializado en la creacion de Planes de Adecuacion Curricular Individual (PACI) segun el Decreto 83/2015 y Decreto 170/2009.

Tu tarea es adaptar Objetivos de Aprendizaje (OA) del curriculum chileno para estudiantes con Necesidades Educativas Especiales (NEE).

REGLAS:
- Mantener la estructura tecnica de cada OA: HABILIDAD + CONTENIDO + ACTITUD
- Las adaptaciones deben ser realistas y aplicables en un aula regular con apoyo PIE
- Usar vocabulario educativo chileno formal
- Respetar los tipos de adecuacion del Decreto 83: eliminacion, graduacion, simplificacion, priorizacion
- Responder SIEMPRE en espanol
- Responder en formato JSON`
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

    const result = await callGroq(env, messages, {
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
    return new Response(JSON.stringify({ ok: false, error: 'Error IA: ' + e.message }), { status: 500, headers });
  }
}
