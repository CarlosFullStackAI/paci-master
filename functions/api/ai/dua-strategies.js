import { getUser } from '../auth-helper.js';
import { checkRateLimit, callGroq, sanitizeForPrompt } from './groq-helper.js';

// POST /api/ai/dua-strategies
// Recibe barreras de aprendizaje y retorna estrategias DUA
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
    const { barriers, diagnosisId, diagnosisName, subject, level } = body;

    if (!barriers || !barriers.length) {
      return new Response(JSON.stringify({ ok: false, error: 'Se requiere al menos una barrera de aprendizaje.' }), { status: 400, headers });
    }

    // Sanitizar inputs
    const safeBarriers = barriers.map(b => sanitizeForPrompt(b)).filter(Boolean);
    const safeDiagnosis = sanitizeForPrompt(diagnosisName || diagnosisId || '');
    const safeSubject = sanitizeForPrompt(subject || '');
    const safeLevel = sanitizeForPrompt(level || '');

    const messages = [
      {
        role: 'system',
        content: `Eres un experto en Diseno Universal para el Aprendizaje (DUA) aplicado al contexto educativo chileno, especificamente para el Programa de Integracion Escolar (PIE).

El DUA tiene 3 principios:
1. REPRESENTACION: Multiples formas de presentar la informacion
2. ACCION Y EXPRESION: Multiples formas de expresar el aprendizaje
3. IMPLICACION: Multiples formas de motivar y comprometer al estudiante

REGLAS:
- Generar estrategias especificas, concretas y aplicables en un aula chilena regular
- Incluir materiales y recursos concretos cuando sea posible
- Las estrategias deben ser realizables por un docente sin recursos especializados costosos
- Considerar el contexto de educacion publica chilena
- Responder SIEMPRE en espanol
- Responder en formato JSON`
      },
      {
        role: 'user',
        content: `Genera estrategias DUA para un estudiante con las siguientes caracteristicas:

Diagnostico: ${safeDiagnosis || 'NEE no especificada'}
Asignatura: ${safeSubject || 'General'}
Nivel: ${safeLevel || 'No especificado'}

Barreras de aprendizaje identificadas:
${safeBarriers.map((b, i) => (i + 1) + '. ' + b).join('\n')}

Genera exactamente este JSON:
{
  "representacion": [
    {
      "estrategia": "descripcion de la estrategia",
      "materiales": ["material 1", "material 2"],
      "aplicacion": "como implementarla en el aula"
    }
  ],
  "accion_expresion": [
    {
      "estrategia": "descripcion de la estrategia",
      "materiales": ["material 1"],
      "aplicacion": "como implementarla"
    }
  ],
  "implicacion": [
    {
      "estrategia": "descripcion de la estrategia",
      "materiales": ["material 1"],
      "aplicacion": "como implementarla"
    }
  ],
  "recomendaciones_generales": ["recomendacion 1", "recomendacion 2"]
}

Genera al menos 3 estrategias por principio DUA.`
      }
    ];

    const result = await callGroq(env, messages, {
      temperature: 0.7,
      maxTokens: 2000,
      jsonMode: true
    });

    // Parsear respuesta JSON
    let parsed;
    try {
      parsed = JSON.parse(result.content);
    } catch (e) {
      parsed = { raw: result.content, error: 'Respuesta no es JSON valido' };
    }

    return new Response(JSON.stringify({
      ok: true,
      strategies: parsed,
      remaining: rl.remaining,
      model: result.model
    }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Error IA: ' + e.message }), { status: 500, headers });
  }
}
