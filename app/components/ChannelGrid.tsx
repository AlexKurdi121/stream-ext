// app/components/ChannelGrid.tsx
'use client';

import { Channel, StalkerChannel, M3UChannel } from '../types';

interface ChannelGridProps {
  channels: any[];
  totalChannels: number;
  filteredTotal: number;
  currentPage: number;
  totalPages: number;
  searchTerm: string;
  isSearching: boolean;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onChannelClick: (channel: any) => void;
  type: 'xtream' | 'stalker' | 'm3u';
  stalkerData?: any;
  m3uFileName?: string;
  onLogout?: () => void;
}

const CHANNELS_PER_PAGE = 100;

export default function ChannelGrid({
  channels,
  totalChannels,
  filteredTotal,
  currentPage,
  totalPages,
  searchTerm,
  isSearching,
  onSearchChange,
  onPageChange,
  onChannelClick,
  type,
  stalkerData,
  m3uFileName,
  onLogout
}: ChannelGridProps) {
  const getPageRange = () => {
    const range: (number | string)[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    if (start > 1) {
      range.push(1);
      if (start > 2) range.push('...');
    }
    
    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    
    if (end < totalPages) {
      if (end < totalPages - 1) range.push('...');
      range.push(totalPages);
    }
    
    return range;
  };

  return (
    <div>
      {/* Stats and Search with Logout */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="text-sm text-gray-400">
            <span className="text-white font-bold">{totalChannels.toLocaleString()}</span> Total Channels
            {type === 'm3u' && m3uFileName && (
              <span className="ml-2 text-green-400">📁 {m3uFileName}</span>
            )}
            {searchTerm && (
              <span className="ml-2">
                | Found: <span className="text-white font-bold">{filteredTotal.toLocaleString()}</span>
              </span>
            )}
            <span className="ml-2">
              | Showing: <span className="text-white font-bold">
                {Math.min((currentPage - 1) * CHANNELS_PER_PAGE + 1, filteredTotal)} - 
                {Math.min(currentPage * CHANNELS_PER_PAGE, filteredTotal)}
              </span>
            </span>
            {isSearching && <span className="ml-2 text-yellow-400">Searching...</span>}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-96">
              <input
                type="text"
                placeholder="Search among all channels..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white pl-10"
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchTerm && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition-colors text-sm whitespace-nowrap"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Channel Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
        {channels.map((channel) => {
          let name = '';
          let num = 0;
          let icon = '';
          let id = '';
          let genreTitle = '';
          let isM3u = false;

          if (type === 'xtream') {
            name = (channel as Channel).name;
            num = (channel as Channel).num;
            icon = (channel as Channel).stream_icon;
            id = String((channel as Channel).stream_id);
          } else if (type === 'stalker') {
            name = (channel as StalkerChannel).title;
            num = parseInt((channel as StalkerChannel).id);
            icon = (channel as StalkerChannel).logo || '';
            id = (channel as StalkerChannel).id;
            genreTitle = (channel as StalkerChannel).genre_title;
          } else {
            name = (channel as M3UChannel).name;
            num = parseInt((channel as M3UChannel).id) || 0;
            icon = (channel as M3UChannel).logo;
            id = (channel as M3UChannel).id;
            genreTitle = (channel as M3UChannel).group;
            isM3u = true;
          }

          return (
            <div
              key={id}
              onClick={() => onChannelClick(channel)}
              className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105 border border-gray-700 group"
            >
              <div className="aspect-video bg-gray-700 flex items-center justify-center relative">
                {icon ? (
                  <img
                    src={icon}
                    alt={name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="169" viewBox="0 0 300 169"%3E%3Crect width="300" height="169" fill="%23333"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                ) : (
                  <div className="text-gray-500 text-center p-4">
                    <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs">No Image</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                  <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium bg-blue-600 px-3 py-1 rounded-full">
                    View Details
                  </span>
                </div>
              </div>
              <div className="p-2">
                <h3 className="font-medium text-xs sm:text-sm truncate" title={name}>
                  {name}
                </h3>
                <p className="text-xs text-gray-400 mt-1">#{num}</p>
                {genreTitle && (
                  <p className="text-xs text-purple-400 mt-0.5 truncate">{genreTitle}</p>
                )}
                {isM3u && (
                  <p className="text-xs text-green-400 mt-0.5 truncate">📁 M3U</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {channels.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xl">No channels found</p>
          <p className="text-sm mt-2">Try adjusting your search</p>
        </div>
      )}

      {/* Pagination */}
      {filteredTotal > CHANNELS_PER_PAGE && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-400">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              ← Previous
            </button>
            
            {getPageRange().map((page, index) => (
              <button
                key={index}
                onClick={() => typeof page === 'number' ? onPageChange(page) : null}
                className={`px-3 py-2 rounded-md transition-colors text-sm min-w-[40px] ${
                  page === currentPage
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : page === '...' 
                    ? 'bg-transparent cursor-default'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                disabled={page === '...'}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}