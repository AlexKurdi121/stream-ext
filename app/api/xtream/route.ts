// app/api/xtream/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

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
    
    // Remove any protocol prefix from the URL if present in the path
    // Handle URLs like http://1@android.dragonsdog.com:80
    if (baseUrl.includes('@')) {
      // Extract just the domain part
      const match = baseUrl.match(/https?:\/\/(?:[^@]+@)?([^\/]+)/);
      if (match) {
        const protocol = baseUrl.startsWith('https') ? 'https' : 'http';
        baseUrl = `${protocol}://${match[1]}`;
      }
    }

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
      const response = await axios.get(apiUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
        },
        validateStatus: (status) => status < 500,
      });

      // Check if response is JSON
      if (typeof response.data === 'string' && response.data.startsWith('{')) {
        try {
          const jsonData = JSON.parse(response.data);
          if (jsonData && typeof jsonData === 'object') {
            if (jsonData.error || jsonData.message) {
              return NextResponse.json({
                success: false,
                error: jsonData.error || jsonData.message || 'Invalid credentials',
                data: jsonData
              }, { status: 401 });
            }
            return NextResponse.json({
              success: true,
              data: jsonData
            });
          }
        } catch (parseError) {
          // Not JSON, treat as error
          return NextResponse.json({
            success: false,
            error: 'Invalid response format from server',
            raw: response.data.substring(0, 500)
          }, { status: 500 });
        }
      }

      // If response is an array (channels list)
      if (Array.isArray(response.data)) {
        return NextResponse.json({
          success: true,
          data: response.data
        });
      }

      // If response is an object but not JSON
      if (typeof response.data === 'object' && response.data !== null) {
        return NextResponse.json({
          success: true,
          data: response.data
        });
      }

      // Try to parse as JSON if it's a string
      if (typeof response.data === 'string') {
        try {
          const parsed = JSON.parse(response.data);
          return NextResponse.json({
            success: true,
            data: parsed
          });
        } catch (e) {
          // Not JSON, return as text
          return NextResponse.json({
            success: false,
            error: 'Invalid response format',
            raw: response.data.substring(0, 500)
          }, { status: 500 });
        }
      }

      return NextResponse.json({
        success: false,
        error: 'Unexpected response format',
        data: response.data
      }, { status: 500 });

    } catch (axiosError: any) {
      console.error('Axios error:', axiosError.message);
      
      if (axiosError.code === 'ECONNABORTED') {
        return NextResponse.json({
          success: false,
          error: 'Connection timeout - The server is taking too long to respond'
        }, { status: 408 });
      }
      
      if (axiosError.code === 'ENOTFOUND') {
        return NextResponse.json({
          success: false,
          error: 'Server not found - Please check the server URL'
        }, { status: 404 });
      }

      if (axiosError.response) {
        return NextResponse.json({
          success: false,
          error: `Server responded with status ${axiosError.response.status}: ${axiosError.response.statusText}`,
          details: axiosError.response.data
        }, { status: axiosError.response.status });
      }

      return NextResponse.json({
        success: false,
        error: axiosError.message || 'Failed to connect to server'
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