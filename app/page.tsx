// app/page.tsx
'use client';

import Link from 'next/link';
import Layout from './components/Layout';

export default function Home() {
  return (
    <Layout showHomeButton={false}>
      <div className="text-center py-16">
        <div className="text-6xl mb-6">📺</div>
        <h2 className="text-3xl font-bold text-white mb-4">Welcome to IPTV Channel List</h2>
        <p className="text-gray-400 text-lg mb-12">
          Choose a source from the options below to get started
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Link href="/xtream" className="group">
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 hover:border-blue-500 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-2xl">
              <div className="text-5xl mb-4">📡</div>
              <h3 className="text-xl font-bold text-blue-400 mb-2">Xtream</h3>
              <p className="text-gray-400 text-sm">Login with your Xtream API credentials</p>
              <div className="mt-4 text-blue-400 group-hover:translate-x-2 transition-transform">→</div>
            </div>
          </Link>
          
          <Link href="/macstalker" className="group">
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 hover:border-purple-500 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-2xl">
              <div className="text-5xl mb-4">📺</div>
              <h3 className="text-xl font-bold text-purple-400 mb-2">MAC Stalker</h3>
              <p className="text-gray-400 text-sm">Login with your MAC address</p>
              <div className="mt-4 text-purple-400 group-hover:translate-x-2 transition-transform">→</div>
            </div>
          </Link>
          
          <Link href="/files" className="group">
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 hover:border-green-500 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-2xl">
              <div className="text-5xl mb-4">📁</div>
              <h3 className="text-xl font-bold text-green-400 mb-2">M3U Files</h3>
              <p className="text-gray-400 text-sm">Upload and view M3U playlists</p>
              <div className="mt-4 text-green-400 group-hover:translate-x-2 transition-transform">→</div>
            </div>
          </Link>
        </div>
      </div>
    </Layout>
  );
}