// app/components/ChannelDetailsModal.tsx
'use client';

import { Channel, StalkerChannel, M3UChannel } from '../types';

interface ChannelDetailsModalProps {
  channel: Channel | StalkerChannel | M3UChannel;
  onClose: () => void;
  type: 'xtream' | 'stalker' | 'm3u';
  generateM3u8Url?: (id: string | number) => string;
  stalkerData?: any;
  m3uFileName?: string;
  copyToClipboard: (text: string, type: string) => void;
  copyImageUrl: (url: string) => void;
}

export default function ChannelDetailsModal({
  channel,
  onClose,
  type,
  generateM3u8Url,
  stalkerData,
  copyToClipboard,
  copyImageUrl
}: ChannelDetailsModalProps) {
  const truncateUrl = (url: string | undefined, maxLength: number = 50): string => {
    if (!url) return 'N/A';
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatArray = (value: number[] | undefined): string => {
    if (!value || value.length === 0) return '[]';
    return `[${value.join(', ')}]`;
  };

  // Helper function to safely get image URL
  const getImageUrl = (): string => {
    if (type === 'xtream') {
      return (channel as Channel).stream_icon || '';
    } else if (type === 'stalker') {
      return (channel as StalkerChannel).logo || '';
    } else {
      return (channel as M3UChannel).logo || '';
    }
  };

  // Helper function to get channel name
  const getChannelName = (): string => {
    if (type === 'xtream') {
      return (channel as Channel).name;
    } else if (type === 'stalker') {
      return (channel as StalkerChannel).title;
    } else {
      return (channel as M3UChannel).name;
    }
  };

  // Helper function to get channel ID/Number
  const getChannelId = (): string => {
    if (type === 'xtream') {
      return String((channel as Channel).num);
    } else if (type === 'stalker') {
      return (channel as StalkerChannel).id;
    } else {
      return (channel as M3UChannel).id;
    }
  };

  // Helper function to get stream ID for URL generation
  const getStreamId = (): string | number => {
    if (type === 'xtream') {
      return (channel as Channel).stream_id;
    } else if (type === 'stalker') {
      return (channel as StalkerChannel).id;
    } else {
      return (channel as M3UChannel).id;
    }
  };

  // Helper function to safely copy URL
  const handleCopy = (text: string | undefined, type: string) => {
    if (text) {
      copyToClipboard(text, type);
    }
  };

  const imageUrl = getImageUrl();
  const streamId = getStreamId();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="sticky top-4 float-right mr-4 mt-4 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2 transition-colors z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 pt-0">
          {/* Banner */}
         

          <h2 className="text-2xl font-bold text-white mb-1">{getChannelName()}</h2>
          <p className="text-sm text-gray-400 mb-4">Channel #{getChannelId()}</p>

          <div className="space-y-2">
            {/* Xtream Details */}
            {type === 'xtream' && (
              <>
                <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">num</span>
                  <span className="text-sm text-white">{(channel as Channel).num}</span>
                </div>
                <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">name</span>
                  <span className="text-sm text-white">{(channel as Channel).name}</span>
                </div>
                <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">stream_type</span>
                  <span className="text-sm text-white capitalize">{(channel as Channel).stream_type}</span>
                </div>
                <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">stream_id</span>
                  <span className="text-sm text-white font-mono">{(channel as Channel).stream_id}</span>
                </div>
                <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">m3u8 url</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-blue-400 break-all">
                        {generateM3u8Url ? generateM3u8Url(streamId) : 'N/A'}
                      </span>
                      {generateM3u8Url && (
                        <button
                          onClick={() => handleCopy(generateM3u8Url(streamId), 'm3u8 URL')}
                          className="flex-shrink-0 text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded transition-colors"
                        >
                          📋 Copy URL
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">stream_icon</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-blue-400 hover:underline break-all">
                        {(channel as Channel).stream_icon ? (
                          <a href={(channel as Channel).stream_icon} target="_blank" rel="noopener noreferrer">
                            {truncateUrl((channel as Channel).stream_icon)}
                          </a>
                        ) : 'N/A'}
                      </span>
                      {(channel as Channel).stream_icon && (
                        <button
                          onClick={() => handleCopy((channel as Channel).stream_icon, 'Image URL')}
                          className="flex-shrink-0 text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded transition-colors"
                        >
                          📋 Copy Image
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">epg_channel_id</span>
                  <span className="text-sm text-white">{(channel as Channel).epg_channel_id || 'null'}</span>
                </div>
                <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">added</span>
                  <span className="text-sm text-white">
                    {(channel as Channel).added} ({formatDate((channel as Channel).added)})
                  </span>
                </div>
                <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">is_adult</span>
                  <span className="text-sm text-white">
                    {(channel as Channel).is_adult === 1 || (channel as Channel).is_adult === '1' ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">category_id</span>
                  <span className="text-sm text-white">{(channel as Channel).category_id}</span>
                </div>
                <div className="flex items-start gap-4 py-2">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">category_ids</span>
                  <span className="text-sm text-white">{formatArray((channel as Channel).category_ids)}</span>
                </div>
              </>
            )}

            {/* Stalker Details */}
            {type === 'stalker' && (
              <>
                <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">id</span>
                  <span className="text-sm text-white font-mono">{(channel as StalkerChannel).id}</span>
                </div>
                <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">title</span>
                  <span className="text-sm text-white">{(channel as StalkerChannel).title}</span>
                </div>
                <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">genre_title</span>
                  <span className="text-sm text-purple-400">{(channel as StalkerChannel).genre_title}</span>
                </div>
                <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">tv_genre_id</span>
                  <span className="text-sm text-white">{(channel as StalkerChannel).tv_genre_id}</span>
                </div>
                <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">m3u8 url</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-blue-400 break-all">
                        {generateM3u8Url ? generateM3u8Url(streamId) : 'N/A'}
                      </span>
                      {generateM3u8Url && (
                        <button
                          onClick={() => handleCopy(generateM3u8Url(streamId), 'm3u8 URL')}
                          className="flex-shrink-0 text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded transition-colors"
                        >
                          📋 Copy URL
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">logo</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-blue-400 hover:underline break-all">
                        {(channel as StalkerChannel).logo ? (
                          <a href={(channel as StalkerChannel).logo} target="_blank" rel="noopener noreferrer">
                            {truncateUrl((channel as StalkerChannel).logo)}
                          </a>
                        ) : 'N/A'}
                      </span>
                      {(channel as StalkerChannel).logo && (
                        <button
                          onClick={() => handleCopy((channel as StalkerChannel).logo, 'Image URL')}
                          className="flex-shrink-0 text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded transition-colors"
                        >
                          📋 Copy Image
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">cmd</span>
                  <span className="text-sm text-white font-mono break-all">{(channel as StalkerChannel).cmd || 'N/A'}</span>
                </div>
                {stalkerData?.profile && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Profile Info</h3>
                    {stalkerData.profile.name && (
                      <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                        <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">name</span>
                        <span className="text-sm text-white">{stalkerData.profile.name}</span>
                      </div>
                    )}
                    {stalkerData.profile.expiry && (
                      <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                        <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">expiry</span>
                        <span className="text-sm text-white">{stalkerData.profile.expiry}</span>
                      </div>
                    )}
                    {stalkerData.profile.username && (
                      <div className="flex items-start gap-4 py-2">
                        <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">username</span>
                        <span className="text-sm text-white">{stalkerData.profile.username}</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* M3U Details */}
            {type === 'm3u' && (
              <>
                <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">id</span>
                  <span className="text-sm text-white font-mono">{(channel as M3UChannel).id}</span>
                </div>
                <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">name</span>
                  <span className="text-sm text-white">{(channel as M3UChannel).name}</span>
                </div>
                <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">group</span>
                  <span className="text-sm text-purple-400">{(channel as M3UChannel).group}</span>
                </div>
                <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">tvg-id</span>
                  <span className="text-sm text-white font-mono">{(channel as M3UChannel).tvgId || 'N/A'}</span>
                </div>
                <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">tvg-name</span>
                  <span className="text-sm text-white">{(channel as M3UChannel).tvgName || 'N/A'}</span>
                </div>

                <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">logo</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-blue-400 hover:underline break-all">
                        {(channel as M3UChannel).logo ? (
                          <a href={(channel as M3UChannel).logo} target="_blank" rel="noopener noreferrer">
                            {truncateUrl((channel as M3UChannel).logo)}
                          </a>
                        ) : 'N/A'}
                      </span>
                      {(channel as M3UChannel).logo && (
                        <button
                          onClick={() => handleCopy((channel as M3UChannel).logo, 'Image URL')}
                          className="flex-shrink-0 text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded transition-colors"
                        >
                          📋 Copy Image
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Original URL */}
                <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">url</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-blue-400 break-all">
                        {(channel as M3UChannel).url || 'N/A'}
                      </span>
                      {(channel as M3UChannel).url && (
                        <button
                          onClick={() => handleCopy((channel as M3UChannel).url, 'Stream URL')}
                          className="flex-shrink-0 text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded transition-colors"
                        >
                          📋 Copy URL
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* M3U8 URL - Generated from server/username/password */}
                {(channel as M3UChannel).m3u8Url && (
                  <div className="flex items-start gap-4 py-2 border-b border-gray-700">
                    <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">m3u8 url</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-blue-400 break-all">
                          {(channel as M3UChannel).m3u8Url}
                        </span>
                        <button
                          onClick={() => handleCopy((channel as M3UChannel).m3u8Url, 'm3u8 URL')}
                          className="flex-shrink-0 text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded transition-colors"
                        >
                          📋 Copy URL
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-4 py-2">
                  <span className="text-sm font-medium text-gray-400 w-32 flex-shrink-0">raw</span>
                  <span className="text-sm text-gray-300 font-mono break-all text-xs">
                    {(channel as M3UChannel).raw || 'N/A'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}