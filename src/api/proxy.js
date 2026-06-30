export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Internal-API-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const API_URL = 'https://saferoute-api-m4i5.onrender.com';
  
  // Construir la URL destino
  const targetUrl = `${API_URL}${req.url.replace('/api', '')}`;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization && { 'Authorization': req.headers.authorization }),
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Error de conexion con la API' });
  }
}