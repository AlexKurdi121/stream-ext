// app/files/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import ChannelGrid from '../components/ChannelGrid';
import ChannelDetailsModal from '../components/ChannelDetailsModal';
import { M3UChannel } from '../types';

const CHANNELS_PER_PAGE = 100;

export default function FilesPage() {
  const [channels, setChannels] = useState<M3UChannel[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<M3UChannel[]>([]);
  const [displayedChannels, setDisplayedChannels] = useState<M3UChannel[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<M3UChannel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [m3uFileName, setM3uFileName] = useState<string>('');
  const [m3uServerUrl, setM3uServerUrl] = useState<string>('');
  const [m3uUsername, setM3uUsername] = useState<string>('');
  const [m3uPassword, setM3uPassword] = useState<string>('');
  const [showProfile, setShowProfile] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedM3uChannels = localStorage.getItem('m3uChannels');
    if (savedM3uChannels) {
      const data = JSON.parse(savedM3uChannels);
      setChannels(data);
      setFilteredChannels(data);
      setM3uFileName(localStorage.getItem('m3uFileName') || '');
      setM3uServerUrl(localStorage.getItem('m3uServerUrl') || '');
      setM3uUsername(localStorage.getItem('m3uUsername') || '');
      setM3uPassword(localStorage.getItem('m3uPassword') || '');
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    const startIndex = (currentPage - 1) * CHANNELS_PER_PAGE;
    const endIndex = startIndex + CHANNELS_PER_PAGE;
    const pageChannels = filteredChannels.slice(startIndex, endIndex);
    setDisplayedChannels(pageChannels);
    setTotalPages(Math.ceil(filteredChannels.length / CHANNELS_PER_PAGE));
  }, [filteredChannels, currentPage]);

  useEffect(() => {
    const searchChannels = () => {
      setIsSearching(true);
      if (searchTerm.trim() === '') {
        setFilteredChannels(channels);
      } else {
        const filtered = channels.filter(channel => 
          channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          channel.group.toLowerCase().includes(searchTerm.toLowerCase()) ||
          channel.tvgId.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredChannels(filtered);
      }
      setCurrentPage(1);
      setIsSearching(false);
    };

    const debounceTimeout = setTimeout(searchChannels, 300);
    return () => clearTimeout(debounceTimeout);
  }, [searchTerm, channels]);

  const convertToM3u8Url = (url: string): string => {
    if (!url) return '';
    
    if (url.includes('/live/') && url.endsWith('.m3u8')) {
      return url;
    }

    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      
      if (pathParts.length >= 3) {
        const [username, password, streamId] = pathParts.slice(-3);
        const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
        return `${baseUrl}/live/${username}/${password}/${streamId}.m3u8`;
      }
      
      const match = url.match(/\/([^\/]+)\/([^\/]+)\/(\d+)/);
      if (match) {
        const [, username, password, streamId] = match;
        const baseUrl = urlObj.origin;
        return `${baseUrl}/live/${username}/${password}/${streamId}.m3u8`;
      }
    } catch (e) {
      const match = url.match(/\/([^\/]+)\/([^\/]+)\/(\d+)/);
      if (match) {
        const [, username, password, streamId] = match;
        const baseMatch = url.match(/^(https?:\/\/[^\/]+)/);
        if (baseMatch) {
          const baseUrl = baseMatch[1];
          return `${baseUrl}/live/${username}/${password}/${streamId}.m3u8`;
        }
      }
    }
    
    return '';
  };

  const parseM3U = (content: string): M3UChannel[] => {
    const lines = content.split('\n');
    const channels: M3UChannel[] = [];
    let currentChannel: Partial<M3UChannel> = {};
    let currentGroup = 'Uncategorized';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#EXTGRP:')) {
        currentGroup = line.replace('#EXTGRP:', '').trim();
        continue;
      }

      if (line.startsWith('#EXTINF:')) {
        const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
        const tvgId = tvgIdMatch ? tvgIdMatch[1] : '';
        
        const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
        const tvgName = tvgNameMatch ? tvgNameMatch[1] : '';
        
        const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
        const logo = tvgLogoMatch ? tvgLogoMatch[1] : '';
        
        const groupMatch = line.match(/group-title="([^"]*)"/);
        const group = groupMatch ? groupMatch[1] : currentGroup;
        
        const nameMatch = line.match(/,([^,]*)$/);
        const name = nameMatch ? nameMatch[1].trim() : 'Unknown';

        currentChannel = {
          id: '',
          name: name,
          logo: logo || '',
          group: group,
          tvgId: tvgId,
          tvgName: tvgName,
          url: '',
          raw: line,
          m3u8Url: ''
        };
        continue;
      }

      if (line && !line.startsWith('#') && currentChannel.name) {
        currentChannel.url = line;
        const idMatch = line.match(/id=(\d+)/);
        if (idMatch) {
          currentChannel.id = idMatch[1];
        } else {
          const urlParts = line.split('/');
          const lastPart = urlParts[urlParts.length - 1];
          if (lastPart && !isNaN(Number(lastPart))) {
            currentChannel.id = lastPart;
          } else {
            currentChannel.id = `m3u_${channels.length + 1}`;
          }
        }
        
        currentChannel.m3u8Url = convertToM3u8Url(line);
        
        if (!currentChannel.m3u8Url && m3uServerUrl && m3uUsername && m3uPassword) {
          const baseUrl = m3uServerUrl.replace(/\/+$/, '');
          currentChannel.m3u8Url = `${baseUrl}/live/${m3uUsername}/${m3uPassword}/${currentChannel.id}.m3u8`;
        }
        
        channels.push(currentChannel as M3UChannel);
        currentChannel = {};
      }
    }

    return channels;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedChannels = parseM3U(content);
        
        if (parsedChannels.length > 0) {
          setChannels(parsedChannels);
          setFilteredChannels(parsedChannels);
          setCurrentPage(1);
          setIsLoggedIn(true);
          setM3uFileName(file.name);
          localStorage.setItem('m3uChannels', JSON.stringify(parsedChannels));
          localStorage.setItem('m3uFileName', file.name);
          localStorage.setItem('m3uServerUrl', m3uServerUrl);
          localStorage.setItem('m3uUsername', m3uUsername);
          localStorage.setItem('m3uPassword', m3uPassword);
        } else {
          setError('No channels found in the M3U file.');
        }
      } catch (error) {
        console.error('Error parsing M3U:', error);
        setError('Error parsing M3U file. Please check the format.');
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'serverUrl') setM3uServerUrl(value);
    else if (name === 'username') setM3uUsername(value);
    else if (name === 'password') setM3uPassword(value);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setChannels([]);
    setFilteredChannels([]);
    setDisplayedChannels([]);
    setSelectedChannel(null);
    setCurrentPage(1);
    setSearchTerm('');
    setM3uFileName('');
    setShowProfile(false);
    localStorage.removeItem('m3uChannels');
    localStorage.removeItem('m3uFileName');
    localStorage.removeItem('m3uServerUrl');
    localStorage.removeItem('m3uUsername');
    localStorage.removeItem('m3uPassword');
  };

  const showChannelDetails = (channel: M3UChannel) => {
    setSelectedChannel(channel);
  };

  const closeDetails = () => {
    setSelectedChannel(null);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`${type} copied to clipboard!`);
    }).catch(() => {
      alert('Failed to copy');
    });
  };

  const copyImageUrl = (url: string) => {
    if (url) {
      copyToClipboard(url, 'Image URL');
    }
  };

  return (
    <Layout>
      {!isLoggedIn ? (
        <div className="max-w-md mx-auto bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
          
          
          <div className="space-y-4">
            
          
            
            
            <div className="border-t border-gray-700 pt-4">
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Select M3U File
              </label>
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".m3u,.m3u8,.txt"
                  onChange={handleFileUpload}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-white file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 transition-all cursor-pointer"
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Upload a .m3u file to view channels. m3u8 URLs will be auto-converted.
              </p>
            </div>
            
            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 flex justify-end gap-3">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-xl transition-all duration-200 text-sm flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              <span>👤</span> Profile Info
            </button>
          </div>

          {showProfile && (
            <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-gray-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative border border-gray-700 shadow-2xl">
                <button
                  onClick={() => setShowProfile(false)}
                  className="sticky top-4 float-right mr-4 mt-4 text-white hover:text-gray-300 bg-black/50 rounded-full p-2 transition-colors z-10"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="p-6 pt-0">
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-2">👤</div>
                    <h2 className="text-2xl font-bold text-white">Profile Info</h2>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-gray-700/50 rounded-xl p-4">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">File Name</div>
                      <div className="text-white text-sm font-mono">{m3uFileName}</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-xl p-4">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Server URL</div>
                      <div className="text-white text-sm break-all font-mono">{m3uServerUrl || 'Not set'}</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-xl p-4">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Username</div>
                      <div className="text-white text-sm font-mono">{m3uUsername || 'Not set'}</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-xl p-4">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Channels</div>
                      <div className="text-white text-sm font-bold">{channels.length.toLocaleString()}</div>
                    </div>
                    <div className="bg-green-900/30 border border-green-700 rounded-xl p-4">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Status</div>
                      <div className="text-green-400 text-sm font-semibold flex items-center gap-2">
                        <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        Loaded
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <ChannelGrid
            channels={displayedChannels}
            totalChannels={channels.length}
            filteredTotal={filteredChannels.length}
            currentPage={currentPage}
            totalPages={totalPages}
            searchTerm={searchTerm}
            isSearching={isSearching}
            onSearchChange={setSearchTerm}
            onPageChange={goToPage}
            onChannelClick={showChannelDetails}
            type="m3u"
            m3uFileName={m3uFileName}
            onLogout={handleLogout}
          />
        </>
      )}
      
      {selectedChannel && (
        <ChannelDetailsModal
          channel={selectedChannel}
          onClose={closeDetails}
          type="m3u"
          copyToClipboard={copyToClipboard}
          copyImageUrl={copyImageUrl}
        />
      )}
    </Layout>
  );
}