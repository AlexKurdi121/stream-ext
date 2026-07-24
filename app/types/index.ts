// app/types/index.ts

export interface Channel {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string | null;
  added: string;
  is_adult: number | string;
  category_id: string;
  category_ids?: number[];
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
}

export interface StalkerChannel {
  id: string;
  title: string;
  logo?: string;
  cmd?: string;
  tv_genre_id: string;
  genre_title: string;
}

export interface M3UChannel {
  id: string;
  name: string;
  logo: string;
  group: string;
  tvgId: string;
  tvgName: string;
  url: string;
  raw: string;
  m3u8Url: string;
}

export interface StalkerData {
  channels: StalkerChannel[];
  genres: Record<string, string>;
  profile: {
    name?: string;
    expiry?: string;
    username?: string;
    password?: string;
  };
  token: string;
  server_url: string;
  mac_url: string;
  mac_id: string;
  serial: string;
  device_id1: string;
  device_id2: string;
  signature: string;
  handshake_details?: string[];
}

export interface StreamCredentials {
  serverUrl: string;
  username: string;
  password: string;
}

export interface StalkerCredentials {
  serverUrl: string;
  macId: string;
}