// GET /api/weather?lat=-36.827&lon=-73.05
// Proxy server-side para el clima. Evita problemas de CORS/rate limit/bloqueos
// que el cliente puede tener al llamar directamente a Open-Meteo desde el navegador.
// Cachea con CF Cache 15 minutos por coordenada redondeada.

export async function onRequestGet(context) {
  const { request } = context;
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' };

  const url = new URL(request.url);
  let lat = parseFloat(url.searchParams.get('lat'));
  let lon = parseFloat(url.searchParams.get('lon'));
  if (isNaN(lat) || isNaN(lon)) { lat = -36.827; lon = -73.050; } // default Concepción

  // Redondeamos a 2 decimales para mejorar cache hit-rate
  lat = Math.round(lat * 100) / 100;
  lon = Math.round(lon * 100) / 100;

  try {
    // 1) Clima actual (formato nuevo Open-Meteo)
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`;
    const wRes = await fetch(weatherUrl, { cf: { cacheTtl: 600, cacheEverything: true } });
    if (!wRes.ok) throw new Error('open-meteo ' + wRes.status);
    const wData = await wRes.json();

    let temp = null, code = null, isDay = null;
    if (wData && wData.current) {
      temp = wData.current.temperature_2m;
      code = wData.current.weather_code;
      isDay = wData.current.is_day;
    }
    if (temp == null) throw new Error('no current data');

    // 2) Geocoding reverso para nombre de ciudad. BigDataCloud (gratis, sin key, CORS OK).
    // Open-Meteo no tiene endpoint /reverse; solo /search forward geocoding.
    let ciudad = '';
    try {
      const geoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`;
      const gRes = await fetch(geoUrl, { cf: { cacheTtl: 86400, cacheEverything: true } });
      if (gRes.ok) {
        const geo = await gRes.json();
        const loc = geo && (geo.city || geo.locality || geo.principalSubdivision);
        const region = geo && geo.principalSubdivision;
        if (loc) {
          ciudad = loc + (region && region !== loc ? ', ' + region : '');
        }
      }
    } catch (e) { /* sigue sin ciudad */ }

    return new Response(JSON.stringify({
      ok: true,
      temperature: Math.round(temp),
      code: code,
      isDay: isDay === 1,
      city: ciudad || null,
      lat, lon
    }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({
      ok: false,
      error: e && e.message ? e.message : 'weather service unavailable'
    }), { status: 502, headers });
  }
}
