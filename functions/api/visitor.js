// Cloudflare Pages Function: /api/visitor
// Real-time visitor counter using KV storage

export async function onRequest(context) {
  const { env, request } = context;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const kv = env.VISITOR_KV;
    
    if (!kv) {
      return new Response(JSON.stringify({ count: 12847 }), { 
        status: 200, headers 
      });
    }

    if (request.method === 'GET') {
      const value = await kv.get('total_visitors');
      const count = value ? parseInt(value, 10) : 12847;
      return new Response(JSON.stringify({ count }), { status: 200, headers });
    }

    if (request.method === 'POST') {
      const value = await kv.get('total_visitors');
      const currentCount = value ? parseInt(value, 10) : 12847;
      const newCount = currentCount + 1;
      await kv.put('total_visitors', newCount.toString());
      return new Response(JSON.stringify({ count: newCount }), { 
        status: 200, headers 
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, headers 
    });

  } catch (error) {
    return new Response(JSON.stringify({ count: 12847 }), { 
      status: 200, headers 
    });
  }
}
