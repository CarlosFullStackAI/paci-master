// Helper compartido para llamadas a Groq API
// URL: https://api.groq.com/openai/v1/chat/completions
// Modelo: llama-3.3-70b-versatile (tier gratuito)

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const MAX_CALLS_PER_DAY = 20;

// Rate limiting: max 20 llamadas/dia/usuario
export async function checkRateLimit(env, userEmail) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const key = `ai_rl:${userEmail}:${today}`;
  const count = parseInt(await env.PACI_USERS.get(key) || '0');

  if (count >= MAX_CALLS_PER_DAY) {
    return { allowed: false, remaining: 0, count };
  }

  // Incrementar contador (expira en 24h)
  await env.PACI_USERS.put(key, String(count + 1), { expirationTtl: 86400 });

  return { allowed: true, remaining: MAX_CALLS_PER_DAY - count - 1, count: count + 1 };
}

// Llamar a Groq API
export async function callGroq(env, messages, options = {}) {
  const apiKey = env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY no configurada. Agregar el secret en Cloudflare Dashboard.');
  }

  const body = {
    model: options.model || GROQ_MODEL,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens || 2048,
    top_p: options.topP || 1,
    stream: false
  };

  // Si se pide respuesta JSON
  if (options.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (!data.choices || !data.choices.length) {
    throw new Error('Groq API no retorno respuesta.');
  }

  return {
    content: data.choices[0].message.content,
    usage: data.usage || {},
    model: data.model
  };
}

// Sanitizar texto del usuario antes de incluir en prompts (prevenir prompt injection)
export function sanitizeForPrompt(text) {
  if (!text) return '';
  return String(text)
    .replace(/```/g, '')  // evitar bloques de codigo que alteren el formato
    .replace(/\n{3,}/g, '\n\n')  // normalizar saltos de linea
    .trim()
    .substring(0, 500);  // limitar longitud
}
