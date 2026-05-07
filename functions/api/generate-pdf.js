// Genera un PDF del documento PACI usando Cloudflare Browser Rendering (Puppeteer
// headless real). El navegador renderiza el HTML aplicando @media print y devuelve
// un PDF identico al que produciria el dialogo de impresion del navegador, pero
// sin requerir interaccion del usuario.
//
// Requisitos:
//   - Browser Rendering activado en Cloudflare Dashboard
//   - wrangler.jsonc debe tener: "browser": { "binding": "BROWSER" }
//   - package.json debe incluir: "@cloudflare/puppeteer"
//
// Limites del tier gratis: 10 minutos de browser time / dia, 3 sesiones concurrentes.

import puppeteer from '@cloudflare/puppeteer';
import { getUser } from './auth-helper.js';

// onRequest catch-all (filtramos metodo dentro). Workaround para un edge-case del
// build de Pages Functions donde onRequestPOST no se enruta correctamente en
// algunos casos. onRequest siempre funciona.
export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Solo se acepta POST' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 1. AUTH: solo usuarios autenticados pueden generar PDFs (evita abuso de cuota)
  const session = await getUser(request, env);
  if (!session) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 2. PAYLOAD
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body invalido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { html, filename } = body;
  if (!html || typeof html !== 'string') {
    return new Response(JSON.stringify({ error: 'HTML requerido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (html.length > 5 * 1024 * 1024) {
    return new Response(JSON.stringify({ error: 'HTML excede tamano maximo (5MB)' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!env.BROWSER) {
    return new Response(JSON.stringify({
      error: 'Browser Rendering no esta activado. Activalo en Cloudflare Dashboard > Workers & Pages > proyecto-paci > Settings > Functions.'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const safeFilename = (filename || 'PACI').replace(/[\\/:*?"<>|]/g, '').trim() || 'PACI';

  // 3. RENDER PDF
  let browser;
  try {
    browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();

    // Activar @media print: equivalente al dialogo Ctrl+P del navegador
    await page.emulateMediaType('print');

    // Cargar el HTML completo (incluye estilos embebidos del frontend)
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

    const pdfBuffer = await page.pdf({
      format: 'letter',
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false
    });

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}.pdf"`,
        'Cache-Control': 'no-store',
        'X-PDF-Generator': 'cloudflare-browser-rendering'
      }
    });
  } catch (err) {
    console.error('Error generando PDF server-side:', err);
    return new Response(JSON.stringify({
      error: 'Error generando PDF',
      detail: err && err.message ? err.message : String(err)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}
