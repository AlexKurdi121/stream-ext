// app/api/xtream/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverUrl, username, password, action } = body;

    if (!serverUrl || !username || !password) {
      return NextResponse.json(
        { success: false, error: 'Server URL, username, and password are required' },
        { status: 400 }
      );
    }

    // Clean the server URL
    let baseUrl = serverUrl.replace(/\/+$/, '');
    
    // If the URL contains @, extract the actual domain
    if (baseUrl.includes('@')) {
      const match = baseUrl.match(/^(https?:\/\/)(?:[^@]+@)?(.+)$/);
      if (match) {
        const protocol = match[1];
        const domain = match[2];
        baseUrl = `${protocol}${domain}`;
      }
    }

    // Build the API URL
    let apiUrl = '';
    if (action === 'get_live_streams') {
      apiUrl = `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_live_streams`;
    } else if (action === 'get_vod_streams') {
      apiUrl = `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_vod_streams`;
    } else if (action === 'get_series') {
      apiUrl = `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_series`;
    } else {
      apiUrl = `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_live_streams`;
    }

    console.log('Fetching from:', apiUrl);

    try {
      // Use fetch API instead of axios (built-in, no dependency issues)
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        console.error('Response status:', response.status);
        const text = await response.text();
        console.error('Response text:', text.substring(0, 200));
        
        return NextResponse.json({
          success: false,
          error: `Server responded with status ${response.status}: ${response.statusText}`,
          details: text.substring(0, 500)
        }, { status: response.status });
      }

      // Get the response as text first
      const text = await response.text();
      
      // Try to parse as JSON
      try {
        const jsonData = JSON.parse(text);
        
        // Check if it's an error response
        if (jsonData.error || jsonData.message) {
          return NextResponse.json({
            success: false,
            error: jsonData.error || jsonData.message || 'Invalid credentials',
            data: jsonData
          }, { status: 401 });
        }
        
        // If it's an array (channels list)
        if (Array.isArray(jsonData)) {
          return NextResponse.json({
            success: true,
            data: jsonData
          });
        }
        
        // If it's an object
        if (jsonData && typeof jsonData === 'object') {
          // Check if it contains an array of channels
          const channelsArray = jsonData.channels || jsonData.list || jsonData.items || jsonData.data;
          if (Array.isArray(channelsArray)) {
            return NextResponse.json({
              success: true,
              data: channelsArray
            });
          }
          
          // Check if any key contains an array
          for (const key of Object.keys(jsonData)) {
            if (Array.isArray(jsonData[key]) && jsonData[key].length > 0) {
              return NextResponse.json({
                success: true,
                data: jsonData[key]
              });
            }
          }
          
          // Return the whole object
          return NextResponse.json({
            success: true,
            data: jsonData
          });
        }
        
        return NextResponse.json({
          success: false,
          error: 'Unexpected response format',
          raw: text.substring(0, 500)
        }, { status: 500 });
        
      } catch (parseError) {
        // Not JSON - check if it's HTML
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          return NextResponse.json({
            success: false,
            error: 'Server returned HTML instead of JSON. Please check the URL.',
            raw: text.substring(0, 200)
          }, { status: 500 });
        }
        
        return NextResponse.json({
          success: false,
          error: 'Invalid response format from server',
          raw: text.substring(0, 500)
        }, { status: 500 });
      }

    } catch (fetchError: any) {
      console.error('Fetch error:', fetchError.message);
      
      if (fetchError.name === 'AbortError' || fetchError.name === 'TimeoutError') {
        return NextResponse.json({
          success: false,
          error: 'Connection timeout - The server is taking too long to respond'
        }, { status: 408 });
      }
      
      if (fetchError.message.includes('ENOTFOUND') || fetchError.message.includes('getaddrinfo')) {
        return NextResponse.json({
          success: false,
          error: 'Server not found - Please check the server URL'
        }, { status: 404 });
      }

      if (fetchError.message.includes('ECONNREFUSED')) {
        return NextResponse.json({
          success: false,
          error: 'Connection refused - The server is not accepting connections'
        }, { status: 503 });
      }

      return NextResponse.json({
        success: false,
        error: fetchError.message || 'Failed to connect to server'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'An unexpected error occurred'
    }, { status: 500 });
  }
}