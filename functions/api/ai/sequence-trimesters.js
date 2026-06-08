import { getUser } from '../auth-helper.js';
import { checkRateLimit, callAI, sanitizeForPrompt, extractJSON } from './ai-helper.js';

// POST /api/ai/sequence-trimesters
// Recibe la lista de modulos anuales + contexto del estudiante.
// Devuelve la distribucion sugerida de cada modulo en uno de los 3 trimestres
// segun progresion de habilidades (T1 fundacional -> T2 desarrollo -> T3 consolidacion).
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
    const { modulos, studentLevel, diagnosis, contextual, evaluacion } = body;

    if (!Array.isArray(modulos) || !modulos.length) {
      return new Response(JSON.stringify({ ok: false, error: 'Se requiere al menos un modulo.' }), { status: 400, headers });
    }

    // Resumir los modulos con sus OAs para alimentar al modelo.
    const modulosResumidos = modulos.slice(0, 20).map((m, i) => {
      const asig = sanitizeForPrompt(m.asig || '');
      const unit = sanitizeForPrompt(m.unit || '');
      const oas = (m.oas || []).slice(0, 6).map(o => {
        const code = sanitizeForPrompt(o.code || '');
        const texto = sanitizeForPrompt(o.textoAdecuado || o.textoOriginal || o.text || '');
        return `${code}: ${texto.slice(0, 180)}`;
      }).join(' | ');
      return `Modulo ${i + 1} (id=${sanitizeForPrompt(String(m.id || i + 1))}): ${asig} - ${unit}. OAs: ${oas}`;
    }).join('\n');

    const ctxEscuela = sanitizeForPrompt((contextual && contextual.escuela) || '');
    const ctxHogar = sanitizeForPrompt((contextual && contextual.hogar) || '');
    const evFortalezas = sanitizeForPrompt((evaluacion && evaluacion.fortalezas) || '');
    const evDificultades = sanitizeForPrompt((evaluacion && evaluacion.dificultades) || '');

    const messages = [
      {
        role: 'system',
        content: `# CONTEXTO
Eres un asistente experto en Educacion Especial en Chile (Decreto 83/2015, PIE, curriculum MINEDUC). Tu rol es secuenciar la planificacion ANUAL de un estudiante PIE en 3 trimestres con progresion PAULATINA Y ORDENADA segun complejidad de habilidades.

# TAREA
Recibes una lista de modulos (cada modulo agrupa OAs de una asignatura/unidad). Decide en que trimestre va cada modulo siguiendo esta logica:
- 1er Trimestre (FUNDACIONAL): habilidades basicas, exploracion, activacion de conocimientos previos, OAs de menor complejidad cognitiva.
- 2do Trimestre (DESARROLLO): profundizacion, conexion entre conceptos, practica guiada, habilidades intermedias que requieren las del T1.
- 3er Trimestre (CONSOLIDACION): aplicacion autonoma, sintesis, transferencia, OAs de mayor complejidad o que integran lo aprendido en T1 y T2.

# REGLAS
1. Considera el diagnostico, nivel real y contexto del estudiante para calibrar el ritmo.
2. La progresion debe respetar dependencias (no asignar a T1 algo que depende de habilidades de T3).
3. Si hay 3 modulos por asignatura: idealmente uno por trimestre. Si hay 6: dos por trimestre. Distribucion equilibrada cuando sea posible.
4. Usa terminologia tecnica pedagogica (NEE, DUA, andamiaje, etc.) en las justificaciones.
5. Responder SIEMPRE en espanol.
6. Responder ESTRICTAMENTE en formato JSON.`
      },
      {
        role: 'user',
        content: `Distribuye los siguientes modulos en 3 trimestres con progresion ordenada y paulatina.

Estudiante:
- Diagnostico: ${sanitizeForPrompt(diagnosis || 'NEE no especificada')}
- Nivel real / trabajo: ${sanitizeForPrompt(studentLevel || 'no especificado')}
- Contexto escolar: ${ctxEscuela || 'no especificado'}
- Contexto hogar: ${ctxHogar || 'no especificado'}
- Fortalezas: ${evFortalezas || 'no especificadas'}
- Dificultades: ${evDificultades || 'no especificadas'}

Modulos a distribuir:
${modulosResumidos}

Devuelve EXACTAMENTE este JSON (sin texto fuera del JSON):
{
  "asignaciones": [
    {
      "moduloId": "id del modulo",
      "trimestre": "1er Trimestre" | "2do Trimestre" | "3er Trimestre",
      "justificacion": "breve razon pedagogica (max 25 palabras) explicando por que va en ese trimestre segun progresion de habilidades"
    }
  ],
  "resumen": "1-2 oraciones describiendo la logica global de la secuencia anual."
}`
      }
    ];

    const result = await callAI(env, messages, {
      temperature: 0.4,
      maxTokens: 3000,
      jsonMode: true
    });

    if (!result.ok) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'No se pudo generar la secuencia. Intenta de nuevo.'
      }), { status: 502, headers });
    }

    let parsed;
    try {
      parsed = typeof result.content === 'string' ? extractJSON(result.content) : result.content;
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: 'Respuesta IA invalida.' }), { status: 502, headers });
    }

    if (!parsed || !Array.isArray(parsed.asignaciones)) {
      return new Response(JSON.stringify({ ok: false, error: 'Respuesta IA sin asignaciones.' }), { status: 502, headers });
    }

    // Normalizar etiquetas de trimestre por si la IA usa variantes.
    const norm = (t) => {
      const s = String(t || '').toLowerCase();
      if (s.includes('1') || s.includes('uno') || s.includes('primer')) return '1er Trimestre';
      if (s.includes('2') || s.includes('dos') || s.includes('segundo')) return '2do Trimestre';
      if (s.includes('3') || s.includes('tres') || s.includes('tercer')) return '3er Trimestre';
      return '1er Trimestre';
    };
    const asignaciones = parsed.asignaciones.map(a => ({
      moduloId: String(a.moduloId || a.id || ''),
      trimestre: norm(a.trimestre),
      justificacion: sanitizeForPrompt(a.justificacion || '').slice(0, 240)
    }));

    return new Response(JSON.stringify({
      ok: true,
      asignaciones,
      resumen: sanitizeForPrompt(parsed.resumen || '').slice(0, 400),
      remaining: rl.remaining
    }), { headers });
  } catch (e) {
    console.error('Error en sequence-trimesters:', e);
    return new Response(JSON.stringify({ ok: false, error: 'Error interno.' }), { status: 500, headers });
  }
}
