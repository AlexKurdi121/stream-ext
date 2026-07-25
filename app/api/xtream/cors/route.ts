// app/api/xtream/cors/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverUrl, username, password, action } = body;

    if (!serverUrl || !username || !password) {
      return NextResponse.json(
        { success: false, error: 'Server URL, username, and password are required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Clean the server URL
    let baseUrl = serverUrl.replace(/\/+$/, '');
    
    if (baseUrl.includes('@')) {
      const match = baseUrl.match(/^(https?:\/\/)(?:[^@]+@)?(.+)$/);
      if (match) {
        const protocol = match[1];
        const domain = match[2];
        baseUrl = `${protocol}${domain}`;
      }
    }

    let apiUrl = `${baseUrl}/player_api.php?username=${username}&password=${password}&action=${action || 'get_live_streams'}`;

    console.log('Fetching from:', apiUrl);

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
        },
        signal: AbortSignal.timeout(30000),
      });

      const text = await response.text();

      if (!response.ok) {
        return NextResponse.json({
          success: false,
          error: `Server error: ${response.status} - ${response.statusText}`,
          raw: text.substring(0, 200)
        }, { 
          status: response.status,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        });
      }

      try {
        const jsonData = JSON.parse(text);
        return NextResponse.json({
          success: true,
          data: jsonData
        }, {
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        });
      } catch {
        return NextResponse.json({
          success: false,
          error: 'Invalid JSON response from server',
          raw: text.substring(0, 200)
        }, { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        });
      }

    } catch (fetchError: any) {
      console.error('Fetch error:', fetchError.message);
      return NextResponse.json({
        success: false,
        error: fetchError.message || 'Failed to connect to server'
      }, { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'An unexpected error occurred'
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}