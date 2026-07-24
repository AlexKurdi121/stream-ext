import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    // For M3U8 files, fetch and rewrite segment URLs
    if (url.includes('.m3u8')) {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'http://spacetvee.com:8080',
          'Origin': 'http://spacetvee.com:8080',
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch M3U8: ${response.status}` },
          { status: response.status }
        );
      }

      const data = await response.text();
      
      // Get base URL for resolving relative paths
      const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
      let processedData = data;
      
      // Replace .ts segment URLs with proxied URLs
      processedData = processedData.replace(
        /^(?!http)([^#\s]+\.(?:ts|m3u8))$/gm,
        (match, segment) => {
          const absoluteUrl = new URL(segment, baseUrl).toString();
          return `/api/stream?url=${encodeURIComponent(absoluteUrl)}`;
        }
      );
      
      // Handle URLs starting with slash
      processedData = processedData.replace(
        /^\/([^#\s]+\.(?:ts|m3u8))$/gm,
        (match, segment) => {
          const absoluteUrl = new URL(segment, baseUrl).toString();
          return `/api/stream?url=${encodeURIComponent(absoluteUrl)}`;
        }
      );

      return new NextResponse(processedData, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
        },
      });
    } else {
      // For TS files, proxy the data
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'http://spacetvee.com:8080',
          'Origin': 'http://spacetvee.com:8080',
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch segment: ${response.status}` },
          { status: response.status }
        );
      }

      const data = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'video/MP2T';

      return new NextResponse(data, {
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Length': data.byteLength.toString(),
        },
      });
    }
  } catch (error) {
    console.error('Stream proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stream' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range, Accept-Encoding',
      'Access-Control-Max-Age': '86400',
    },
  });
}