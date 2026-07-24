import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as crypto from 'crypto';

// Types
interface Channel {
  id: string;
  title: string;
  logo?: string;
  cmd?: string;
  tv_genre_id: string;
  genre_title: string;
}

interface PortalConfig {
  serverUrl: string;
  macId: string;
  serial?: string;
  deviceId1?: string;
  deviceId2?: string;
  signature?: string;
  portalType?: string;
  debug?: boolean;
}

// ============================================================
// Enhanced Stalker Portal Core Class
// ============================================================

class StalkerPortal {
  public baseUrl: string;
  public macId: string;
  public serial: string;
  public deviceId1: string;
  public deviceId2: string;
  public signature: string;
  public portalType: string;
  public debug: boolean;
  public token: string = '';
  public random: string = '';
  public channels: Channel[] = [];
  public genres: Record<string, string> = {};
  public profile: any = {};
  public serverUrl: string = '';
  public macUrl: string = '';
  public activeUrlFormat: any = null;
  public handshakeDetails: string[] = [];

  private urlFormats: any[] = [];
  private userAgents: string[] = [
    'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
    'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG250 stbapp ver: 2 rev: 250 Safari/533.3',
    'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG322 stbapp ver: 2 rev: 250 Safari/533.3',
    'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG351 stbapp ver: 2 rev: 250 Safari/533.3',
  ];

  constructor(config: PortalConfig) {
    this.baseUrl = config.serverUrl.replace(/\/+$/, '');
    this.macId = config.macId.toUpperCase().trim();
    this.serial = config.serial || this.generateSerial();
    this.deviceId1 = config.deviceId1 || this.generateDeviceId();
    this.deviceId2 = config.deviceId2 || this.generateDeviceId();
    this.signature = config.signature || this.generateSignature();
    this.portalType = config.portalType || 'auto';
    this.debug = config.debug || false;
    this.handshakeDetails = [];
    this.buildUrlFormats();
  }

  private generateSerial(): string {
    return crypto.randomBytes(6).toString('hex').toUpperCase();
  }

  private generateDeviceId(): string {
    return crypto.randomBytes(8).toString('hex').toLowerCase();
  }

  private generateSignature(): string {
    return crypto.randomBytes(16).toString('hex').toLowerCase();
  }

  private buildUrlFormats(): void {
    let base = this.baseUrl;
    this.handshakeDetails.push(`Base URL: ${base}`);

    // Remove trailing /c if present
    if (base.endsWith('/c')) base = base.slice(0, -2);
    if (base.endsWith('/c/')) base = base.slice(0, -3);
    if (base.endsWith('/server/load.php')) {
      base = base.replace('/server/load.php', '');
    }

    const formats = [];

    // Try to parse URL components
    let parsedUrl: URL | null = null;
    try {
      parsedUrl = new URL(base);
    } catch (_e) {}

    const root = parsedUrl ? `${parsedUrl.protocol}//${parsedUrl.host}` : base;

    // Standard format (most common)
    formats.push({
      server: `${base}/server/load.php`,
      mac: `${base}/c/`,
      name: 'standard'
    });

    // Stalker portal format
    formats.push({
      server: `${base}/stalker_portal/server/load.php`,
      mac: `${base}/stalker_portal/c/`,
      name: 'stalker_portal'
    });

    // Root format
    formats.push({
      server: `${root}/server/load.php`,
      mac: `${root}/c/`,
      name: 'root'
    });

    // Root stalker portal
    formats.push({
      server: `${root}/stalker_portal/server/load.php`,
      mac: `${root}/stalker_portal/c/`,
      name: 'root_stalker'
    });

    // If URL already has /c/ in it
    if (base.includes('/c/')) {
      formats.push({
        server: base.replace('/c/', '/server/load.php'),
        mac: base,
        name: 'existing_c'
      });
    }

    // If URL already has server/load.php
    if (base.includes('/server/load.php')) {
      formats.push({
        server: base,
        mac: base.replace('/server/load.php', '/c/'),
        name: 'existing_server'
      });
    }

    // Try with no path (just domain)
    if (parsedUrl) {
      formats.push({
        server: `${root}/c/server/load.php`,
        mac: `${root}/c/`,
        name: 'root_c'
      });
    }

    // Remove duplicates
    const seen = new Set();
    this.urlFormats = formats.filter((fmt) => {
      const key = fmt.server;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    this.handshakeDetails.push(`Generated ${this.urlFormats.length} URL formats to try`);
  }

  private getHeaders(customHeaders: any = {}): any {
    const headers: any = {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'User-Agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)],
      'X-User-Agent': 'Model: MAG250; Link: WiFi',
      'Cookie': `mac=${this.macId}; stb_lang=en; timezone=GMT`,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return { ...headers, ...customHeaders };
  }

  private getResponseText(data: any): string {
    if (typeof data === 'string') {
      return data;
    }
    if (Buffer.isBuffer(data)) {
      return data.toString('utf8');
    }
    if (data && typeof data === 'object') {
      return JSON.stringify(data);
    }
    return String(data);
  }

  private parseResponse(responseData: any): any {
    // Ensure we have a string
    const text = this.getResponseText(responseData);
    this.handshakeDetails.push(`Response length: ${text.length} chars`);
    
    // Log first 200 chars for debugging
    if (text.length > 0) {
      this.handshakeDetails.push(`Response preview: ${text.substring(0, 200)}...`);
    }

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(text);
      this.handshakeDetails.push('Successfully parsed as JSON');
      return parsed;
    } catch (_e) {
      this.handshakeDetails.push('Failed to parse as JSON, trying alternatives');
    }

    // Try to extract JSON from HTML
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        this.handshakeDetails.push('Extracted JSON from text');
        return parsed;
      } catch (_e) {}
    }

    // Try to extract JSON array from HTML
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        this.handshakeDetails.push('Extracted JSON array from text');
        return parsed;
      } catch (_e) {}
    }

    // Try to parse as query string
    try {
      const params = new URLSearchParams(text);
      if (params.toString()) {
        const obj: any = {};
        params.forEach((value, key) => {
          obj[key] = value;
        });
        this.handshakeDetails.push('Parsed as query string');
        return obj;
      }
    } catch (_e) {}

    // Check for token in HTML
    const tokenMatch = text.match(/token["']?\s*[:=]\s*["']?([^"'\&\s,}]+)/i);
    if (tokenMatch) {
      this.handshakeDetails.push(`Found token in HTML: ${tokenMatch[1].substring(0, 20)}`);
      return { token: tokenMatch[1] };
    }

    // Check for session in HTML
    const sessionMatch = text.match(/session["']?\s*[:=]\s*["']?([^"'\&\s,}]+)/i);
    if (sessionMatch) {
      this.handshakeDetails.push(`Found session in HTML: ${sessionMatch[1].substring(0, 20)}`);
      return { token: sessionMatch[1] };
    }

    // Check for any hex string that could be a token
    const hexMatch = text.match(/[a-fA-F0-9]{16,}/);
    if (hexMatch) {
      this.handshakeDetails.push(`Found hex string: ${hexMatch[0].substring(0, 20)}`);
      return { token: hexMatch[0] };
    }

    this.handshakeDetails.push('Returning raw text');
    return { raw: text };
  }

  async handshake(): Promise<{ success: boolean; token?: string; random?: string; error?: string }> {
    this.handshakeDetails.push('=== Starting Handshake ===');
    this.handshakeDetails.push(`MAC ID: ${this.macId}`);
    this.handshakeDetails.push(`Portal Type: ${this.portalType}`);

    // Try each URL format
    for (let i = 0; i < this.urlFormats.length; i++) {
      const urlFormat = this.urlFormats[i];
      this.handshakeDetails.push(`\n--- Trying format ${i + 1}/${this.urlFormats.length}: ${urlFormat.name} ---`);
      this.handshakeDetails.push(`Server: ${urlFormat.server}`);
      this.handshakeDetails.push(`MAC URL: ${urlFormat.mac}`);

      const result = await this.tryHandshakeFormat(urlFormat);
      if (result.success) {
        this.token = result.token!;
        this.random = result.random || '';
        this.activeUrlFormat = urlFormat;
        this.serverUrl = urlFormat.server;
        this.macUrl = urlFormat.mac;

        this.handshakeDetails.push(`✅ SUCCESS! Token: ${this.token.substring(0, 20)}...`);
        this.handshakeDetails.push(`✅ Server: ${this.serverUrl}`);
        return result;
      }
      this.handshakeDetails.push(`❌ Failed: ${result.error || 'Unknown error'}`);
    }

    // Try aggressive handshake
    this.handshakeDetails.push('\n--- Trying Aggressive Handshake ---');
    return this.aggressiveHandshake();
  }

  private async tryHandshakeFormat(urlFormat: any): Promise<{ success: boolean; token?: string; random?: string; error?: string }> {
    const serverUrl = urlFormat.server;
    const macUrl = urlFormat.mac;

    const tokenValues = ['', 'null', '0', 'undefined'];

    for (const tokenVal of tokenValues) {
      const url = `${serverUrl}?type=stb&action=handshake&token=${tokenVal}&JsHttpRequest=1-xml`;
      this.handshakeDetails.push(`  Trying token: "${tokenVal}"`);

      try {
        const response = await axios.get(url, {
          headers: this.getHeaders({ Referer: macUrl }),
          timeout: 15000,
          validateStatus: () => true,
          responseType: 'text',
        });

        this.handshakeDetails.push(`  Status: ${response.status}`);

        if (response.status === 200) {
          const data = this.parseResponse(response.data);
          this.handshakeDetails.push(`  Response keys: ${Object.keys(data).join(', ')}`);

          // Check for token in various formats
          if (data.js && data.js.token) {
            this.handshakeDetails.push(`  Found token in js.token`);
            return { success: true, token: data.js.token, random: data.js.random || '' };
          }

          if (data.token) {
            this.handshakeDetails.push(`  Found token in token`);
            return { success: true, token: data.token, random: data.random || '' };
          }

          if (data.js && typeof data.js === 'object') {
            // Try to find token in js object values
            for (const [key, value] of Object.entries(data.js)) {
              if (typeof value === 'string' && value.length > 10 && /^[a-fA-F0-9]{10,}$/.test(value)) {
                this.handshakeDetails.push(`  Found possible token in js.${key}`);
                return { success: true, token: value, random: data.js.random || '' };
              }
            }
          }

          // Try regex extraction from raw data
          const rawText = this.getResponseText(response.data);
          const tokenMatch = rawText.match(/token["']?\s*[:=]\s*["']?([^"'\&\s,}]+)/i);
          if (tokenMatch) {
            this.handshakeDetails.push(`  Found token via regex: ${tokenMatch[1].substring(0, 20)}`);
            return { success: true, token: tokenMatch[1], random: '' };
          }

          // If we get HTML with a success message, try to extract from cookies
          if (response.headers['set-cookie']) {
            const cookies = response.headers['set-cookie'];
            this.handshakeDetails.push(`  Found cookies: ${JSON.stringify(cookies)}`);
            for (const cookie of cookies) {
              const tokenMatch = cookie.match(/token=([^;]+)/i);
              if (tokenMatch) {
                this.handshakeDetails.push(`  Found token in cookie`);
                return { success: true, token: tokenMatch[1], random: '' };
              }
            }
          }

          // If we get a successful response but no token, the portal might be using a different flow
          if (response.data && response.data.length > 0 && response.data.length < 5000) {
            this.handshakeDetails.push(`  Response seems valid but no token found`);
            // Try to use the response as token
            const hash = crypto.createHash('md5').update(response.data).digest('hex');
            return { success: true, token: hash, random: '' };
          }
        } else if (response.status === 302 || response.status === 301) {
          this.handshakeDetails.push(`  Redirect: ${response.headers.location}`);
          // Follow redirect
          try {
            const redirectResponse = await axios.get(response.headers.location, {
              headers: this.getHeaders({ Referer: macUrl }),
              timeout: 15000,
              maxRedirects: 5,
              responseType: 'text',
            });
            this.handshakeDetails.push(`  Redirect status: ${redirectResponse.status}`);
            if (redirectResponse.status === 200) {
              const data = this.parseResponse(redirectResponse.data);
              if (data.token || data.js?.token) {
                const token = data.token || data.js?.token;
                this.handshakeDetails.push(`  Found token after redirect`);
                return { success: true, token, random: data.random || data.js?.random || '' };
              }
            }
          } catch (_e) {
            this.handshakeDetails.push(`  Redirect error`);
          }
        }
      } catch (error: any) {
        this.handshakeDetails.push(`  Error: ${error.message}`);
        if (this.debug) console.log(`  Error: ${error.message}`);
      }
    }

    return { success: false, error: 'No token found in response' };
  }

  private async aggressiveHandshake(): Promise<{ success: boolean; token?: string; random?: string; error?: string }> {
    this.handshakeDetails.push('Starting aggressive handshake...');

    const testUrls = [
      `${this.baseUrl}/server/load.php?type=stb&action=handshake`,
      `${this.baseUrl}/c/`,
      `${this.baseUrl}/stalker_portal/server/load.php?type=stb&action=handshake`,
      `${this.baseUrl}/server/load.php?action=handshake&type=stb`,
      `${this.baseUrl}/api/v1/`,
      `${this.baseUrl}/api/`,
      `${this.baseUrl}/`,
    ];

    for (const url of testUrls) {
      this.handshakeDetails.push(`  Trying: ${url}`);
      try {
        const response = await axios.get(url, {
          headers: this.getHeaders(),
          timeout: 10000,
          validateStatus: () => true,
          responseType: 'text',
        });

        this.handshakeDetails.push(`  Status: ${response.status}`);

        if (response.status === 200) {
          const data = this.parseResponse(response.data);
          const rawText = this.getResponseText(response.data);

          if (data.token) {
            this.handshakeDetails.push(`  Found token in response`);
            this.token = data.token;
            this.serverUrl = url;
            this.macUrl = url.replace('/server/load.php', '/c/');
            return { success: true, token: this.token, random: data.random || '' };
          }

          if (data.js && data.js.token) {
            this.handshakeDetails.push(`  Found token in js.token`);
            this.token = data.js.token;
            this.serverUrl = url;
            this.macUrl = url.replace('/server/load.php', '/c/');
            return { success: true, token: this.token, random: data.js.random || '' };
          }

          // Try regex
          const tokenMatch = rawText.match(/token[=:]\s*([a-fA-F0-9]+)/i);
          if (tokenMatch) {
            this.handshakeDetails.push(`  Found token via regex`);
            this.token = tokenMatch[1];
            this.serverUrl = url;
            this.macUrl = url.replace('/server/load.php', '/c/');
            return { success: true, token: this.token, random: '' };
          }

          // Try session ID
          const sessionMatch = rawText.match(/session["']?\s*[:=]\s*["']?([^"'\&\s,}]+)/i);
          if (sessionMatch) {
            this.handshakeDetails.push(`  Found session ID`);
            this.token = sessionMatch[1];
            this.serverUrl = url;
            this.macUrl = url.replace('/server/load.php', '/c/');
            return { success: true, token: this.token, random: '' };
          }

          // Check if it's a portal login page
          if (rawText.includes('login') || rawText.includes('auth')) {
            this.handshakeDetails.push(`  Found login page - portal requires authentication`);
            return { 
              success: false, 
              error: 'Portal requires authentication. Please check if the MAC ID is valid and registered.' 
            };
          }
        }
      } catch (error: any) {
        this.handshakeDetails.push(`  Error: ${error.message}`);
        if (this.debug) console.log(`  Error: ${error.message}`);
      }
    }

    this.handshakeDetails.push('❌ All aggressive handshake attempts failed');
    return { 
      success: false, 
      error: 'All handshake attempts failed. The portal may require a different authentication method.' 
    };
  }

  async getProfile(): Promise<any> {
    if (!this.token) {
      const result = await this.handshake();
      if (!result.success) throw new Error('Handshake failed');
    }

    const url = `${this.serverUrl}?${this.buildProfileParams()}`;
    const headers = this.getHeaders({ Referer: this.macUrl });

    this.handshakeDetails.push(`Getting profile: ${url}`);

    try {
      const response = await axios.get(url, { 
        headers, 
        timeout: 10000,
        responseType: 'text',
      });
      const data = this.parseResponse(response.data);
      this.handshakeDetails.push(`Profile response keys: ${Object.keys(data).join(', ')}`);

      if (data.js) {
        this.profile = {
          name: data.js.fname || data.js.name || '',
          expiry: data.js.expirydate || data.js.expire_billing_date || '',
          username: data.js.login || '',
          password: data.js.password || '',
        };
        this.handshakeDetails.push(`Profile: ${JSON.stringify(this.profile)}`);
        return this.profile;
      }
      return {};
    } catch (error: any) {
      this.handshakeDetails.push(`Profile error: ${error.message}`);
      if (this.debug) console.log(`Profile error: ${error.message}`);
      return {};
    }
  }

  private buildProfileParams(): string {
    const params = {
      type: 'stb',
      action: 'get_profile',
      hd: '1',
      ver: 'ImageDescription: 0.2.18-r14-pub-250; ImageDate: Fri Jan 15 15:20:44 EET 2016; PORTAL version: 5.1.0; API Version: JS API version: 328; STB API version: 134; Player Engine version: 0x566',
      num_banks: '2',
      sn: this.serial,
      stb_type: 'MAG250',
      image_version: '218',
      video_out: 'hdmi',
      device_id: this.deviceId1,
      device_id2: this.deviceId2,
      signature: this.signature,
      auth_second_step: '1',
      hw_version: '1.7-BD-00',
      not_valid_token: '0',
      client_type: 'STB',
      hw_version_2: '36da041e6358ee8f8801105e36a63474',
      timestamp: String(Math.floor(Date.now() / 1000)),
      api_signature: '263',
      metrics: JSON.stringify({
        mac: this.macId,
        sn: this.serial,
        model: 'MAG250',
        type: 'STB',
        uid: '',
        random: this.random,
      }),
      JsHttpRequest: '1-xml',
    };

    return Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');
  }

  async getGenres(): Promise<Record<string, string>> {
    if (!this.token) await this.handshake();

    const url = `${this.serverUrl}?type=itv&action=get_genres&JsHttpRequest=1-xml`;
    const headers = this.getHeaders({ Referer: this.macUrl });

    try {
      const response = await axios.get(url, { 
        headers, 
        timeout: 10000,
        responseType: 'text',
      });
      const data = this.parseResponse(response.data);

      if (data.js && Array.isArray(data.js)) {
        this.genres = {};
        for (const genre of data.js) {
          if (genre.id && genre.title) {
            this.genres[String(genre.id)] = genre.title;
          }
        }
        return this.genres;
      }
      return {};
    } catch (error: any) {
      if (this.debug) console.log(`Genres error: ${error.message}`);
      return {};
    }
  }

  async getAllChannels(): Promise<Channel[]> {
    if (!this.token) await this.handshake();

    const url = `${this.serverUrl}?type=itv&action=get_all_channels&JsHttpRequest=1-xml`;
    const headers = this.getHeaders({ Referer: this.macUrl });

    try {
      const response = await axios.get(url, { 
        headers, 
        timeout: 15000,
        responseType: 'text',
      });
      const data = this.parseResponse(response.data);

      if (data.js?.data && Array.isArray(data.js.data)) {
        this.channels = data.js.data.map((ch: any) => ({
          id: String(ch.id || ''),
          title: ch.name || '',
          logo: ch.logo || '',
          cmd: ch.cmd || '',
          tv_genre_id: String(ch.tv_genre_id || '0'),
          genre_title: this.genres[String(ch.tv_genre_id || '0')] || 'Uncategorized',
        }));
        return this.channels;
      }

      if (data.data && Array.isArray(data.data)) {
        this.channels = data.data.map((ch: any) => ({
          id: String(ch.id || ''),
          title: ch.name || '',
          logo: ch.logo || '',
          cmd: ch.cmd || '',
          tv_genre_id: String(ch.tv_genre_id || '0'),
          genre_title: this.genres[String(ch.tv_genre_id || '0')] || 'Uncategorized',
        }));
        return this.channels;
      }

      return [];
    } catch (error: any) {
      if (this.debug) console.log(`Channels error: ${error.message}`);
      throw error;
    }
  }

  async getPlaybackUrl(channelId: string): Promise<string | null> {
    const channel = this.channels.find((ch) => String(ch.id) === String(channelId));
    if (!channel) return null;

    if (!this.token) await this.handshake();

    const url = `${this.serverUrl}?type=itv&action=create_link&cmd=${encodeURIComponent(channel.cmd || '')}&JsHttpRequest=1-xml`;
    const headers = this.getHeaders({ Referer: this.macUrl });

    try {
      const response = await axios.get(url, { 
        headers, 
        timeout: 10000,
        responseType: 'text',
      });
      const data = this.parseResponse(response.data);

      let playbackUrl = data.js?.cmd || data.cmd || null;

      if (playbackUrl) {
        playbackUrl = this.sanitizeUrl(playbackUrl);
      }

      return playbackUrl;
    } catch (error: any) {
      if (this.debug) console.log(`Playback URL error: ${error.message}`);
      throw error;
    }
  }

  private sanitizeUrl(url: string): string {
    url = url.replace('ffmpeg ', '');

    if (url.includes('jiotv.be') && url.includes('.ts')) {
      url = url.replace('.ts.ts', '.m3u8').replace('.ts', '.m3u8');
      try {
        const parsed = new URL(url);
        const pathParts = parsed.pathname.split('/');
        if (pathParts.length > 8) {
          const newPath = '/' + pathParts.slice(1, 4).join('/') + '/' + pathParts[8];
          url = `${parsed.protocol}//${parsed.host}${newPath}${parsed.search}`;
        }
      } catch (_e) {}
    }

    return url;
  }

  async fetchAllData(): Promise<{ channels: Channel[]; genres: Record<string, string>; profile: any }> {
    await this.getGenres();
    await this.getProfile();
    const channels = await this.getAllChannels();
    return { channels, genres: this.genres, profile: this.profile };
  }

  getHandshakeDetails(): string[] {
    return this.handshakeDetails;
  }
}

// ============================================================
// API Route Handler
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'fetch') {
      return await handleFetch(body);
    } else if (action === 'extract') {
      return await handleExtract(body);
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "fetch" or "extract".' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

async function handleFetch(body: any) {
  const {
    serverUrl,
    macId,
    serial,
    deviceId1,
    deviceId2,
    signature,
    portalType = 'auto',
    debug = false,
  } = body;

  if (!serverUrl || !macId) {
    return NextResponse.json(
      { success: false, error: 'Server URL and MAC ID are required' },
      { status: 400 }
    );
  }

  try {
    const portal = new StalkerPortal({
      serverUrl,
      macId,
      serial,
      deviceId1,
      deviceId2,
      signature,
      portalType,
      debug,
    });

    const handshakeResult = await portal.handshake();
    
    if (!handshakeResult.success) {
      const details = portal.getHandshakeDetails();
      return NextResponse.json(
        {
          success: false,
          error: handshakeResult.error || 'Handshake failed. Please check your credentials and URL.',
          details: details,
          debug: debug ? details : undefined,
        },
        { status: 401 }
      );
    }

    const profile = await portal.getProfile();
    const genres = await portal.getGenres();
    const channels = await portal.getAllChannels();

    if (!channels.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'No channels found. The MAC ID may not have an active subscription.',
          details: portal.getHandshakeDetails(),
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        channels,
        genres,
        profile,
        token: portal.token,
        server_url: portal.serverUrl,
        mac_url: portal.macUrl,
        mac_id: portal.macId,
        serial: portal.serial,
        device_id1: portal.deviceId1,
        device_id2: portal.deviceId2,
        signature: portal.signature,
        handshake_details: debug ? portal.getHandshakeDetails() : undefined,
      },
    });
  } catch (error: any) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch channels',
        details: debug ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

async function handleExtract(body: any) {
  const { portalData, channelId } = body;

  if (!portalData || !channelId) {
    return NextResponse.json(
      { success: false, error: 'Portal data and channel ID are required' },
      { status: 400 }
    );
  }

  try {
    const portal = new StalkerPortal({
      serverUrl: portalData.server_url,
      macId: portalData.mac_id,
      serial: portalData.serial,
      deviceId1: portalData.device_id1,
      deviceId2: portalData.device_id2,
      signature: portalData.signature,
      portalType: 'auto',
      debug: false,
    });

    portal.token = portalData.token;
    portal.channels = portalData.channels || [];
    portal.genres = portalData.genres || {};
    portal.profile = portalData.profile || {};
    portal.serverUrl = portalData.server_url;
    portal.macUrl = portalData.mac_url;

    const url = await portal.getPlaybackUrl(channelId);

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Could not get playback URL for channel' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      url,
    });
  } catch (error: any) {
    console.error('Extract error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to extract M3U8 URL',
      },
      { status: 500 }
    );
  }
}