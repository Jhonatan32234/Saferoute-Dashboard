// api/[...path].js
export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // Si es OPTIONS, responder con CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Internal-API-Key',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const API_URL = 'https://saferoute-api-m4i5.onrender.com';
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '/api/');
  const targetUrl = `${API_URL}${path}${url.search}`;

  try {
    // Preparar headers
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    
    if (request.headers.get('authorization')) {
      headers.set('Authorization', request.headers.get('authorization'));
    }

    // Preparar body
    let body = undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.text();
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: body,
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error de conexion con la API' }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}