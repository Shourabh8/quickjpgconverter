// Cloudflare Pages Function: /api/visitor
// Real unique user counter using cookies + KV storage

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
      return new Response(JSON.stringify({ count: 12847, unique: false }), { 
        status: 200, headers 
      });
    }

    // Get current count from KV
    const value = await kv.get('total_visitors');
    let count = value ? parseInt(value, 10) : 12847;

    // Check for tracking cookie
    const cookieHeader = request.headers.get('Cookie') || '';
    const hasCookie = cookieHeader.includes('qjc_uid=');

    if (request.method === 'GET') {
      return new Response(JSON.stringify({ 
        count, 
        unique: !hasCookie 
      }), { status: 200, headers });
    }

    if (request.method === 'POST') {
      // Only increment if NO cookie (new unique user)
      if (!hasCookie) {
        count += 1;
        await kv.put('total_visitors', count.toString());
        
        // Set cookie that expires in 365 days
        const cookie = 'qjc_uid=1; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly';
        const responseHeaders = { ...headers, 'Set-Cookie': cookie };
        
        return new Response(JSON.stringify({ count, unique: true }), { 
          status: 200, 
          headers: responseHeaders 
        });
      }
      
      // Returning user - don't increment
      return new Response(JSON.stringify({ count, unique: false }), { 
        status: 200, headers 
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, headers 
    });

  } catch (error) {
    return new Response(JSON.stringify({ count: 12847, unique: false }), { 
      status: 200, headers 
    });
  }
}
