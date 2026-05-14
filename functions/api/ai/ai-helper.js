// Helper unificado para llamadas a IA con cascada de proveedores gratuitos.
// Orden: OpenRouter -> Groq -> Gemini. Si uno falla, prueba el siguiente.
// Todos los modelos usados son tier gratuito (cero costo).
//
// Por que cascada y no un solo proveedor:
// - Cada proveedor tiene cuota diaria limitada en su tier free.
// - Si OpenRouter satura o cae, Groq toma el relevo, despues Gemini.
// - Cuota efectiva combinada: ~16k mensajes/dia (cubre uso escolar masivo).

const MAX_CALLS_PER_DAY = 100;

// Modelos free de cada proveedor (verificados disponibles 2026-04-25).
const OPENROUTER_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'openai/gpt-oss-120b:free'
];
const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'gemma2-9b-it'
];
const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

// Rate limiting interno (separado de la cuota de cada proveedor).
// 100 consultas/dia/usuario es generoso pero protege contra abuso.
export async function checkRateLimit(env, userEmail) {
  const today = new Date().toISOString().split('T')[0];
  const key = `ai_rl:${userEmail}:${today}`;
  const count = parseInt(await env.PACI_USERS.get(key) || '0');

  if (count >= MAX_CALLS_PER_DAY) {
    return { allowed: false, remaining: 0, count };
  }

  await env.PACI_USERS.put(key, String(count + 1), { expirationTtl: 86400 });
  return { allowed: true, remaining: MAX_CALLS_PER_DAY - count - 1, count: count + 1 };
}

// Sanitizar texto del usuario contra prompt injection antes de incluir en prompts.
// maxLength permite ampliar el limite cuando el campo legitimamente puede ser
// mas grande (ej. un bloque markdown consolidado de varios campos).
export function sanitizeForPrompt(text, maxLength = 500) {
  if (!text) return '';
  return String(text)
    .replace(/```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .substring(0, maxLength);
}

// Extrae y parsea el primer JSON balanceado del contenido.
// Maneja casos comunes: envoltura ```json ... ```, texto antes/despues del JSON,
// y respuestas degeneradas (algunos modelos free responden basura tipo ":::::").
// Retorna objeto parseado o null si no se pudo extraer JSON valido.
export function extractJSON(content) {
  if (!content) return null;
  let cleaned = String(content).trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }
  cleaned = cleaned.substring(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    return null;
  }
}

// Funcion publica: llama a IA con cascada automatica entre proveedores.
// Si un proveedor falla por rate limit, error o caida, prueba el siguiente.
export async function callAI(env, messages, options = {}) {
  const errors = [];
  const providers = [];

  if (env.OPENROUTER_API_KEY) providers.push({ name: 'OpenRouter', fn: callOpenRouter });
  if (env.GROQ_API_KEY) providers.push({ name: 'Groq', fn: callGroq });
  if (env.GEMINI_API_KEY) providers.push({ name: 'Gemini', fn: callGemini });

  if (!providers.length) {
    throw new Error('Ningun proveedor IA configurado. Agregar OPENROUTER_API_KEY, GROQ_API_KEY o GEMINI_API_KEY como secret.');
  }

  for (const provider of providers) {
    try {
      const result = await provider.fn(env, messages, options);
      return { ...result, provider: provider.name };
    } catch (e) {
      errors.push(`${provider.name}: ${e.message}`);
    }
  }

  throw new Error(`Todos los proveedores IA fallaron. ${errors.join(' | ')}`);
}

// --- Implementaciones especificas por proveedor ---

async function callOpenRouter(env, messages, options) {
  const apiKey = env.OPENROUTER_API_KEY;
  const modelsToTry = options.openrouterModel ? [options.openrouterModel] : OPENROUTER_MODELS;
  let lastError = '';

  for (const model of modelsToTry) {
    const body = {
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      // max_tokens SIEMPRE explicito (regla ia-openrouter.md)
      max_tokens: options.maxTokens || 2000,
      top_p: options.topP || 1,
      stream: false
    };
    if (options.jsonMode) body.response_format = { type: 'json_object' };

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://proyecto-paci.pages.dev',
        'X-Title': 'Proyecto PACI'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errorText = await res.text();
      lastError = `${model}: HTTP ${res.status} - ${errorText.substring(0, 200)}`;
      continue;
    }
    const data = await res.json();
    if (!data.choices || !data.choices.length) {
      lastError = `${model}: respuesta sin choices`;
      continue;
    }
    const content = data.choices[0].message.content;
    if (!content || !content.trim() || content.trim() === 'null') {
      lastError = `${model}: respuesta vacia`;
      continue;
    }
    // Si pedimos JSON, validar que el modelo no genero basura degenerada.
    // Si el JSON no parsea, tratar como falla del modelo y pasar al siguiente.
    if (options.jsonMode) {
      const parsed = extractJSON(content);
      if (!parsed) {
        lastError = `${model}: JSON malformado en respuesta`;
        continue;
      }
      return {
        content: JSON.stringify(parsed),
        usage: data.usage || {},
        model: data.model || model
      };
    }
    return {
      content,
      usage: data.usage || {},
      model: data.model || model
    };
  }
  throw new Error(lastError || 'OpenRouter: todos los modelos fallaron');
}

async function callGroq(env, messages, options) {
  const apiKey = env.GROQ_API_KEY;
  const modelsToTry = options.groqModel ? [options.groqModel] : GROQ_MODELS;
  let lastError = '';

  for (const model of modelsToTry) {
    const body = {
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens || 2000,
      top_p: options.topP || 1,
      stream: false
    };
    if (options.jsonMode) body.response_format = { type: 'json_object' };

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errorText = await res.text();
      lastError = `${model}: HTTP ${res.status} - ${errorText.substring(0, 200)}`;
      continue;
    }
    const data = await res.json();
    if (!data.choices || !data.choices.length) {
      lastError = `${model}: respuesta sin choices`;
      continue;
    }
    const content = data.choices[0].message.content;
    if (!content || !content.trim() || content.trim() === 'null') {
      lastError = `${model}: respuesta vacia`;
      continue;
    }
    if (options.jsonMode) {
      const parsed = extractJSON(content);
      if (!parsed) {
        lastError = `${model}: JSON malformado en respuesta`;
        continue;
      }
      return {
        content: JSON.stringify(parsed),
        usage: data.usage || {},
        model: data.model || model
      };
    }
    return {
      content,
      usage: data.usage || {},
      model: data.model || model
    };
  }
  throw new Error(lastError || 'Groq: todos los modelos fallaron');
}

async function callGemini(env, messages, options) {
  const apiKey = env.GEMINI_API_KEY;
  const modelsToTry = options.geminiModel ? [options.geminiModel] : GEMINI_MODELS;
  let lastError = '';

  // Gemini usa formato distinto a OpenAI: separa systemInstruction del contents.
  const systemMsgs = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const userAssistantMsgs = messages.filter(m => m.role !== 'system');
  const contents = userAssistantMsgs.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  for (const model of modelsToTry) {
    const body = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens || 2000,
        topP: options.topP || 1
      }
    };
    if (systemMsgs) {
      body.systemInstruction = { parts: [{ text: systemMsgs }] };
    }
    if (options.jsonMode) {
      body.generationConfig.responseMimeType = 'application/json';
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errorText = await res.text();
      lastError = `${model}: HTTP ${res.status} - ${errorText.substring(0, 200)}`;
      continue;
    }
    const data = await res.json();
    const candidate = data.candidates && data.candidates[0];
    const text = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text;
    if (!text || !text.trim() || text.trim() === 'null') {
      lastError = `${model}: respuesta vacia`;
      continue;
    }
    if (options.jsonMode) {
      const parsed = extractJSON(text);
      if (!parsed) {
        lastError = `${model}: JSON malformado en respuesta`;
        continue;
      }
      return {
        content: JSON.stringify(parsed),
        usage: data.usageMetadata || {},
        model
      };
    }
    return {
      content: text,
      usage: data.usageMetadata || {},
      model
    };
  }
  throw new Error(lastError || 'Gemini: todos los modelos fallaron');
}
