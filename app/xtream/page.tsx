// app/xtream/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import ChannelGrid from '../components/ChannelGrid';
import ChannelDetailsModal from '../components/ChannelDetailsModal';
import { Channel, StreamCredentials } from '../types';

const CHANNELS_PER_PAGE = 100;

export default function XtreamPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<Channel[]>([]);
  const [displayedChannels, setDisplayedChannels] = useState<Channel[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  const [credentials, setCredentials] = useState<StreamCredentials>({
    serverUrl: '',
    username: '',
    password: ''
  });

  useEffect(() => {
    const savedCredentials = localStorage.getItem('streamCredentials');
    if (savedCredentials) {
      setCredentials(JSON.parse(savedCredentials));
    }
    const savedChannels = localStorage.getItem('xtreamChannels');
    if (savedChannels) {
      const data = JSON.parse(savedChannels);
      setChannels(data);
      setFilteredChannels(data);
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
          channel.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredChannels(filtered);
      }
      setCurrentPage(1);
      setIsSearching(false);
    };

    const debounceTimeout = setTimeout(searchChannels, 300);
    return () => clearTimeout(debounceTimeout);
  }, [searchTerm, channels]);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const apiUrl = `${credentials.serverUrl}/player_api.php?username=${credentials.username}&password=${credentials.password}&action=get_live_streams`;
      const response = await axios.get(apiUrl);
      
      if (Array.isArray(response.data)) {
        setChannels(response.data);
        setFilteredChannels(response.data);
        setCurrentPage(1);
        setIsLoggedIn(true);
        localStorage.setItem('streamCredentials', JSON.stringify(credentials));
        localStorage.setItem('xtreamChannels', JSON.stringify(response.data));
      } else {
        setError('Invalid response format');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch channels');
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  }, [credentials]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (credentials.serverUrl && credentials.username && credentials.password) {
      fetchChannels();
    } else {
      setError('Please fill in all fields');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setChannels([]);
    setFilteredChannels([]);
    setDisplayedChannels([]);
    setSelectedChannel(null);
    setCurrentPage(1);
    setSearchTerm('');
    setShowProfile(false);
    localStorage.removeItem('streamCredentials');
    localStorage.removeItem('xtreamChannels');
  };

  const showChannelDetails = (channel: Channel) => {
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

  const generateM3u8Url = (id: string | number): string => {
    const streamId = typeof id === 'string' ? parseInt(id) : id;
    const baseUrl = credentials.serverUrl.replace(/\/+$/, '');
    return `${baseUrl}/live/${credentials.username}/${credentials.password}/${streamId}.m3u8`;
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
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📡</div>
            <h2 className="text-2xl font-bold text-blue-400">Xtream API Login</h2>
            <p className="text-gray-400 text-sm mt-2">Enter your Xtream credentials to access channels</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Server URL</label>
              <input
                type="text"
                name="serverUrl"
                value={credentials.serverUrl}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all"
                placeholder=""
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Username</label>
              <input
                type="text"
                name="username"
                value={credentials.username}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all"
                placeholder="Enter username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Password</label>
              <input
                type="password"
                name="password"
                value={credentials.password}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all"
                placeholder="Enter password"
                required
              />
            </div>
            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Connecting...
                </span>
              ) : (
                'Connect'
              )}
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="mb-6 flex justify-end gap-3">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl transition-all duration-200 text-sm flex items-center gap-2 shadow-lg hover:shadow-xl"
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
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Server URL</div>
                      <div className="text-white text-sm break-all font-mono">{credentials.serverUrl}</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-xl p-4">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Username</div>
                      <div className="text-white text-sm font-mono">{credentials.username}</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-xl p-4">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Channels</div>
                      <div className="text-white text-sm font-bold">{channels.length.toLocaleString()}</div>
                    </div>
                    <div className="bg-green-900/30 border border-green-700 rounded-xl p-4">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Status</div>
                      <div className="text-green-400 text-sm font-semibold flex items-center gap-2">
                        <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        Connected
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
            type="xtream"
            onLogout={handleLogout}
          />
        </>
      )}
      
      {selectedChannel && (
        <ChannelDetailsModal
          channel={selectedChannel}
          onClose={closeDetails}
          type="xtream"
          generateM3u8Url={generateM3u8Url}
          copyToClipboard={copyToClipboard}
          copyImageUrl={copyImageUrl}
        />
      )}
    </Layout>
  );
}