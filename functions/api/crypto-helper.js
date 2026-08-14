// ==========================================
// CIFRADO EN REPOSO - AES-256-GCM
// ==========================================
// Los datos sensibles (RUT, diagnostico, nombre) se cifran ANTES
// de guardarse en D1 y se descifran DESPUES de leerlos.
// Si alguien roba la base de datos, solo vera texto cifrado.

// La llave de cifrado se guarda como secret en Cloudflare (env.ENCRYPTION_KEY)
// Nunca esta en el codigo ni en la BD.

const ALGO = 'AES-GCM';

// Cache de la CryptoKey derivada: PBKDF2 con 100k iteraciones es CARO (decenas de
// ms de CPU). Sin cache, listar 30+ estudiantes deriva la llave ~90 veces (una por
// campo cifrado) y revienta el limite de CPU del worker (Cloudflare devuelve una
// pagina HTML de error y el frontend ve "Unexpected token '<'"). Con cache se
// deriva UNA vez por isolate y el resto son solo AES (microsegundos).
const keyCache = new Map();

// Derivar una CryptoKey desde el secret string (memoizada por valor de llave)
function getKey(envKey) {
  let cached = keyCache.get(envKey);
  if (!cached) {
    const encoder = new TextEncoder();
    cached = crypto.subtle.importKey(
      'raw', encoder.encode(envKey), 'PBKDF2', false, ['deriveKey']
    ).then(keyMaterial => crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: encoder.encode('paci-salt-v1'), iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: ALGO, length: 256 },
      false,
      ['encrypt', 'decrypt']
    ));
    // Si la derivacion falla, no dejar una promesa rota cacheada.
    cached.catch(() => keyCache.delete(envKey));
    keyCache.set(envKey, cached);
  }
  return cached;
}

// Cifrar un texto plano → retorna string base64 (iv:ciphertext)
export async function encrypt(plaintext, envKey) {
  if (!plaintext || !envKey) return plaintext;
  try {
    const key = await getKey(envKey);
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: ALGO, iv },
      key,
      encoder.encode(plaintext)
    );
    // Formato: iv_base64.ciphertext_base64
    const ivB64 = btoa(String.fromCharCode(...iv));
    const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
    return `enc:${ivB64}.${ctB64}`;
  } catch (e) {
    // Si falla, se guarda sin cifrar (fallback) pero se registra para detectar
    // una ENCRYPTION_KEY mal configurada (sin loggear el dato).
    console.error('encrypt() fallo; persistiendo sin cifrar:', e.name || 'error');
    return plaintext;
  }
}

// Descifrar un texto cifrado → retorna string plano
export async function decrypt(ciphertext, envKey) {
  if (!ciphertext || !envKey || !ciphertext.startsWith('enc:')) return ciphertext;
  try {
    const key = await getKey(envKey);
    const parts = ciphertext.slice(4).split('.');
    if (parts.length !== 2) return ciphertext;

    const iv = Uint8Array.from(atob(parts[0]), c => c.charCodeAt(0));
    const ct = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0));

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGO, iv },
      key,
      ct
    );
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    return ciphertext; // Si falla descifrar, retornar como esta
  }
}

// Cifrar campos sensibles de un objeto estudiante
export async function encryptStudentFields(student, envKey) {
  if (!envKey) return student;
  const s = { ...student };
  if (s.rut) s.rut = await encrypt(s.rut, envKey);
  if (s.diagnosis) s.diagnosis = await encrypt(s.diagnosis, envKey);
  if (s.guardian) s.guardian = await encrypt(s.guardian, envKey);
  if (s.observations) s.observations = await encrypt(s.observations, envKey);
  return s;
}

// Descifrar campos sensibles de un objeto estudiante
export async function decryptStudentFields(student, envKey) {
  if (!envKey || !student) return student;
  const s = { ...student };
  if (s.rut) s.rut = await decrypt(s.rut, envKey);
  if (s.diagnosis) s.diagnosis = await decrypt(s.diagnosis, envKey);
  if (s.guardian) s.guardian = await decrypt(s.guardian, envKey);
  if (s.observations) s.observations = await decrypt(s.observations, envKey);
  return s;
}
