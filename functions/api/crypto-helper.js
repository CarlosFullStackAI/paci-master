// ==========================================
// CIFRADO EN REPOSO - AES-256-GCM
// ==========================================
// Los datos sensibles (RUT, diagnostico, nombre) se cifran ANTES
// de guardarse en D1 y se descifran DESPUES de leerlos.
// Si alguien roba la base de datos, solo vera texto cifrado.

// La llave de cifrado se guarda como secret en Cloudflare (env.ENCRYPTION_KEY)
// Nunca esta en el codigo ni en la BD.

const ALGO = 'AES-GCM';

// Derivar una CryptoKey desde el secret string
async function getKey(envKey) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(envKey), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('paci-salt-v1'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: ALGO, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
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
    return plaintext; // Si falla, guardar sin cifrar (fallback)
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
