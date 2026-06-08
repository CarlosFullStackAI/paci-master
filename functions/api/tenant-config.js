// Endpoint para obtener la configuracion del establecimiento (tenant).
// Retorna los datos basicos, branding y textos legales.

export async function onRequestGet(context) {
  const { env } = context;
  
  // Por ahora hardcodeado a lcm-pulebu, pero preparado para ser dinamico via subdominio o header
  const tenantId = 'lcm-pulebu';
  
  try {
    // Intentamos cargar el archivo desde el sistema de archivos (Cloudflare Pages Assets)
    // En Cloudflare Pages, los archivos estaticos en /data/ son accesibles via fetch interno
    // si el build los incluye en la carpeta de salida.
    
    // Como alternativa mas robusta para el backend, podriamos tener esto en KV,
    // pero para Fase 2 usaremos el JSON estatico que ya existe.
    
    // Nota: El backend de Cloudflare Functions no puede leer el FS directamente con fs.readFile.
    // Necesitamos que el frontend pida el JSON directamente o inyectarlo.
    
    // Sin embargo, para mantener la logica en el servidor y permitir personalizacion por rol:
    // Retornamos un objeto base que el frontend podra usar.
    
    const config = {
      id: "lcm-pulebu",
      nombre: "Escuela Luis Cruz Martínez",
      nombre_corto: "LCM Pulebu",
      localidad: "Pulebu",
      region: "Biobio",
      branding: {
        color_primario: "#091845",
        color_secundario: "#1240c4"
      }
    };

    return new Response(JSON.stringify(config), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
