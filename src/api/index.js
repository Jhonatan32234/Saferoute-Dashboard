// api/index.js
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Internal-API-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const API_URL = 'https://saferoute-api-m4i5.onrender.com';
  
  // Construir URL destino
  const path = req.url.replace('/api', '');
  const targetUrl = `${API_URL}${path}`;

  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    const fetchOptions = {
      method: req.method,
      headers: headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(502).json({ error: 'Error de conexion' });
  }
}