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
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [m3uUrlInput, setM3uUrlInput] = useState('');
  
  const [credentials, setCredentials] = useState<StreamCredentials>({
    serverUrl: 'http://1@android.dragonsdog.com:80',
    username: '01E8M34c60',
    password: 'alessiojaco'
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
    const savedExpiry = localStorage.getItem('xtreamExpiry');
    if (savedExpiry) {
      setExpiryDate(savedExpiry);
    }
    const savedAccountInfo = localStorage.getItem('xtreamAccountInfo');
    if (savedAccountInfo) {
      setAccountInfo(JSON.parse(savedAccountInfo));
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

  // Parse M3U URL to extract server URL, username, and password
  const parseM3uUrl = (url: string): { serverUrl: string; username: string; password: string } | null => {
    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);
      
      let username = params.get('username');
      let password = params.get('password');
      
      if (username && password) {
        const serverUrl = `${urlObj.protocol}//${urlObj.host}`;
        return { serverUrl, username, password };
      }
      
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      if (pathParts.length >= 2) {
        const [user, pass] = pathParts.slice(-2);
        const serverUrl = `${urlObj.protocol}//${urlObj.host}`;
        if (user && pass && user.length < 50 && pass.length < 50) {
          return { serverUrl, username: user, password: pass };
        }
      }
      
      return null;
    } catch {
      return null;
    }
  };

  // Handle M3U URL input for auto-parse
  const handleM3uUrlInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setM3uUrlInput(url);
    
    if (url) {
      const parsed = parseM3uUrl(url);
      if (parsed) {
        setCredentials({
          serverUrl: parsed.serverUrl,
          username: parsed.username,
          password: parsed.password
        });
        setError('');
      } else {
        setError('Could not auto-parse. Please enter credentials manually.');
      }
    }
  };

  // Fetch account info to get expiry date
  const fetchAccountInfo = useCallback(async () => {
    try {
      // Use the proxy API
      const response = await axios.post('/api/xtream', {
        serverUrl: credentials.serverUrl,
        username: credentials.username,
        password: credentials.password,
        action: 'get_live_streams'
      });

      if (response.data.success && response.data.data) {
        const data = response.data.data;
        
        if (data.account_info) {
          setAccountInfo(data.account_info);
          localStorage.setItem('xtreamAccountInfo', JSON.stringify(data.account_info));
          
          const expiry = data.account_info.exp_date || 
                        data.account_info.expiry_date || 
                        data.account_info.expires;
          if (expiry) {
            setExpiryDate(expiry);
            localStorage.setItem('xtreamExpiry', expiry);
          }
        }
        if (data.user_info) {
          const expiry = data.user_info.exp_date || 
                        data.user_info.expiry_date;
          if (expiry) {
            setExpiryDate(expiry);
            localStorage.setItem('xtreamExpiry', expiry);
          }
        }
      }
    } catch (err) {
      console.log('Could not fetch account info:', err);
    }
  }, [credentials]);

  // Fetch channels using the proxy API
  const fetchChannels = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Use the proxy API route instead of direct call
      const response = await axios.post('/api/xtream', {
        serverUrl: credentials.serverUrl,
        username: credentials.username,
        password: credentials.password,
        action: 'get_live_streams'
      });

      if (response.data.success) {
        const data = response.data.data;
        
        // Handle different response formats
        let channelsData = null;
        
        if (Array.isArray(data)) {
          channelsData = data;
        } else if (data && typeof data === 'object') {
          channelsData = data.channels || data.list || data.items || data;
          if (!Array.isArray(channelsData)) {
            // Try to find any array in the response
            for (const key of Object.keys(data)) {
              if (Array.isArray(data[key])) {
                channelsData = data[key];
                break;
              }
            }
          }
        }

        if (Array.isArray(channelsData) && channelsData.length > 0) {
          setChannels(channelsData);
          setFilteredChannels(channelsData);
          setCurrentPage(1);
          setIsLoggedIn(true);
          localStorage.setItem('streamCredentials', JSON.stringify(credentials));
          localStorage.setItem('xtreamChannels', JSON.stringify(channelsData));
          
          // Fetch account info for expiry
          await fetchAccountInfo();
        } else {
          setError('No channels found. Please check your credentials.');
        }
      } else {
        setError(response.data.error || 'Failed to fetch channels');
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to fetch channels. Please check your credentials.');
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  }, [credentials, fetchAccountInfo]);

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
    setExpiryDate(null);
    setAccountInfo(null);
    setM3uUrlInput('');
    localStorage.removeItem('streamCredentials');
    localStorage.removeItem('xtreamChannels');
    localStorage.removeItem('xtreamExpiry');
    localStorage.removeItem('xtreamAccountInfo');
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

  const isExpired = (): boolean => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    return expiry < now;
  };

  const getDaysUntilExpiry = (): number | null => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatExpiryDate = (): string => {
    if (!expiryDate) return 'Not available';
    try {
      const date = new Date(expiryDate);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return expiryDate;
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
            {/* M3U URL Input with Auto-Parse */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Or paste M3U URL (auto-parse)
              </label>
              <input
                type="text"
                value={m3uUrlInput}
                onChange={handleM3uUrlInput}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all"
                placeholder="http://xlion.net:8080/get.php?username=XXX&password=XXX&type=m3u_plus"
              />
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-400">Auto-extracts: Host, Username, Password</p>
                {m3uUrlInput && (
                  <span className="text-xs text-green-400">✓ Parsed</span>
                )}
              </div>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <p className="text-xs text-gray-400 text-center mb-4">Or enter manually</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Server URL</label>
              <input
                type="text"
                name="serverUrl"
                value={credentials.serverUrl}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all"
                placeholder="http://1@android.dragonsdog.com:80"
                required
              />
              {credentials.serverUrl && (
                <div className="mt-1 text-xs text-gray-400">
                  🌎 Host: {credentials.serverUrl}
                </div>
              )}
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
              {credentials.username && (
                <div className="mt-1 text-xs text-gray-400">
                  👤 User: {credentials.username}
                </div>
              )}
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
              {credentials.password && (
                <div className="mt-1 text-xs text-gray-400">
                  🔐 Pass: {credentials.password.substring(0, 8)}...
                </div>
              )}
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
              {expiryDate && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  isExpired() ? 'bg-red-600' : 'bg-green-600'
                }`}>
                  {isExpired() ? 'Expired' : `${getDaysUntilExpiry()}d`}
                </span>
              )}
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
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">🌎 Host</div>
                      <div className="text-white text-sm break-all font-mono">{credentials.serverUrl}</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-xl p-4">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">👤 Username</div>
                      <div className="text-white text-sm font-mono">{credentials.username}</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-xl p-4">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">🔐 Password</div>
                      <div className="text-white text-sm font-mono">••••••••</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-xl p-4">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">📺 Total Channels</div>
                      <div className="text-white text-sm font-bold">{channels.length.toLocaleString()}</div>
                    </div>
                    
                    <div className={`rounded-xl p-4 border ${
                      isExpired() 
                        ? 'bg-red-900/30 border-red-700' 
                        : expiryDate 
                          ? 'bg-green-900/30 border-green-700' 
                          : 'bg-gray-700/50 border-gray-600'
                    }`}>
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">📅 Account Status</div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">
                          {expiryDate ? (
                            isExpired() ? (
                              <span className="text-red-400">⚠️ EXPIRED</span>
                            ) : (
                              <span className="text-green-400">✅ Active</span>
                            )
                          ) : (
                            <span className="text-gray-400">Unknown</span>
                          )}
                        </span>
                        {expiryDate && !isExpired() && (
                          <span className="text-sm text-green-400">
                            {getDaysUntilExpiry()} days remaining
                          </span>
                        )}
                      </div>
                      {expiryDate && (
                        <div className="mt-2 text-sm">
                          <span className="text-gray-400">Expires: </span>
                          <span className={`font-mono ${isExpired() ? 'text-red-400' : 'text-white'}`}>
                            {formatExpiryDate()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className={`rounded-xl p-4 border ${
                      isExpired() 
                        ? 'bg-red-900/30 border-red-700' 
                        : 'bg-green-900/30 border-green-700'
                    }`}>
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Status</div>
                      <div className={`text-sm font-semibold flex items-center gap-2 ${
                        isExpired() ? 'text-red-400' : 'text-green-400'
                      }`}>
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          isExpired() ? 'bg-red-400' : 'bg-green-400'
                        } animate-pulse`}></span>
                        {isExpired() ? 'Expired - Please renew your subscription' : 'Connected'}
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