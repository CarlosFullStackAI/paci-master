// Endpoint publico que retorna el GOOGLE_CLIENT_ID configurado en env vars.
// El frontend lo consulta para inicializar el boton "Sign in with Google".
// El Client ID es publico por diseno (Google lo expone en el HTML), no es secreto.

export async function onRequest(context) {
  const { env } = context;
  const raw = env.GOOGLE_CLIENT_ID || '';
  // Considerar valido solo si parece un Client ID real (formato Google: digits-alphanum.apps.googleusercontent.com)
  // Esto evita que el frontend intente cargar GIS con el placeholder.
  const isReal = /^[\w-]+\.apps\.googleusercontent\.com$/.test(raw);
  return new Response(
    JSON.stringify({
      client_id: isReal ? raw : null,
      enabled: isReal
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      }
    }
  );
}
