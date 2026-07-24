import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');
    const type = searchParams.get('type') || 'm3u';

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    const decodedUrl = decodeURIComponent(url);
    console.log('Proxying request to:', decodedUrl);

    // For M3U8 streams, we need to pass through the response
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': type === 'json' 
          ? 'application/json' 
          : type === 'm3u8'
          ? 'application/vnd.apple.mpegurl, application/x-mpegurl, */*'
          : 'application/x-mpegurl, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': decodedUrl,
        'Origin': new URL(decodedUrl).origin,
      },
      signal: AbortSignal.timeout(30000),
    });

    // Handle specific status codes
    if (response.status === 469) {
      console.error('Server returned 469 - Access blocked');
      return NextResponse.json(
        { 
          error: 'Access blocked (469). The server is blocking the request. This could be due to:\n- Too many requests\n- Invalid subscription\n- Blocked IP address\n- Server misconfiguration\n\nTry:\n- Using a VPN\n- Waiting a few minutes\n- Checking your credentials' 
        },
        { status: 469 }
      );
    }

    if (response.status === 403) {
      console.error('Server returned 403 - Forbidden');
      return NextResponse.json(
        { error: 'Access forbidden (403). The server is rejecting the request. Please check your credentials.' },
        { status: 403 }
      );
    }

    if (response.status === 404) {
      console.error('Server returned 404 - Not Found');
      return NextResponse.json(
        { error: 'Not found (404). The URL may be incorrect or the server is not responding.' },
        { status: 404 }
      );
    }

    if (!response.ok) {
      console.error(`Failed to fetch: ${response.status} ${response.statusText}`);
      
      // Try to get error message from response body
      let errorMessage = `Failed to fetch: ${response.status}`;
      try {
        const text = await response.text();
        if (text) {
          // Check if it's JSON
          try {
            const json = JSON.parse(text);
            if (json.error) errorMessage = json.error;
            else if (json.message) errorMessage = json.message;
          } catch {
            // Not JSON, use text if it's short
            if (text.length < 200) errorMessage = text;
          }
        }
      } catch (_e) {
        // Ignore error reading body
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    
    // For M3U8 streams, return the raw content
    if (type === 'm3u8' || contentType.includes('mpegurl') || contentType.includes('application/vnd.apple.mpegurl')) {
      const text = await response.text();
      
      // Check if the response is actually HTML (error page disguised as M3U)
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        // Try to extract error message from HTML
        const errorMatch = text.match(/error['"]?\s*[:=]\s*['"]?([^'"\s,}]+)/i);
        if (errorMatch) {
          return NextResponse.json(
            { error: `Server error: ${errorMatch[1]}` },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: 'Server returned HTML instead of playlist. The URL may be incorrect.' },
          { status: 400 }
        );
      }
      
      // Check if it's actually valid M3U
      if (!text.includes('#EXTM3U') && !text.includes('#EXTINF:')) {
        // Try to parse as JSON error
        try {
          const jsonData = JSON.parse(text);
          if (jsonData.error) {
            return NextResponse.json(
              { error: jsonData.error },
              { status: 400 }
            );
          }
          if (jsonData.message) {
            return NextResponse.json(
              { error: jsonData.message },
              { status: 400 }
            );
          }
        } catch (_e) {
          // Not JSON, continue
        }
        // If it's a short response, it might be an error message
        if (text.length < 200) {
          return NextResponse.json(
            { error: `Invalid response: ${text.substring(0, 100)}` },
            { status: 400 }
          );
        }
      }
      
      return new NextResponse(text, {
        headers: {
          'Content-Type': contentType || 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Range',
          'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
          'Cache-Control': 'no-cache',
        },
      });
    }
    
    // If it's JSON, parse and return as JSON
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
        },
      });
    }
    
    // Otherwise return as text
    const text = await response.text();
    return new NextResponse(text, {
      headers: {
        'Content-Type': contentType || 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error: any) {
    console.error('Proxy error:', error);
    
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout - server took too long to respond' },
        { status: 504 }
      );
    }
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      return NextResponse.json(
        { error: 'Cannot connect to server. The server may be offline or the URL is incorrect.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch from Xtream server: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
    },
  });
}