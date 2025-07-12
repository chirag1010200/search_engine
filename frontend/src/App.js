import React, { useState, useEffect } from 'react';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [stats, setStats] = useState({
    total_indexed_pages: 0,
    pending_crawls: 0,
    completed_crawls: 0,
    failed_crawls: 0
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  const [pages, setPages] = useState([]);

  const API_BASE = 'https://searchengine-production-93d9.up.railway.app/';

  // Check URL parameter for admin mode on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
      setIsAdmin(true);
    }
  }, []);

  // Key combination listener for admin toggle (Ctrl+Shift+A)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'A') {
        event.preventDefault();
        setIsAdmin(!isAdmin);
        console.log(`Admin mode: ${!isAdmin ? 'ON' : 'OFF'}`);
        
        // Show notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        notification.textContent = `Admin mode: ${!isAdmin ? 'ON' : 'OFF'}`;
        document.body.appendChild(notification);
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 2000);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAdmin]);

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Fetch indexed pages
  const fetchPages = async () => {
    try {
      const response = await fetch(`${API_BASE}/pages`);
      const data = await response.json();
      setPages(data);
    } catch (error) {
      console.error('Error fetching pages:', error);
    }
  };

  // Load data when admin mode is activated
  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      fetchPages();
    }
  }, [isAdmin]);

  // Search function
  const search = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key for search
  const handleSearchKeyPress = (event) => {
    if (event.key === 'Enter') {
      search();
    }
  };

  // Add URL to crawl queue
  const addUrl = async () => {
    if (!newUrl.trim()) return;
    
    try {
      const response = await fetch(`${API_BASE}/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: newUrl }),
      });
      
      const data = await response.json();
      if (response.ok) {
        setNewUrl('');
        fetchStats();
        alert('URL added to crawl queue!');
      } else {
        alert(data.error || 'Error adding URL');
      }
    } catch (error) {
      console.error('Error adding URL:', error);
      alert('Error adding URL');
    }
  };

  // Start crawling
  const startCrawling = async () => {
    setCrawling(true);
    try {
      const response = await fetch(`${API_BASE}/crawl/start`, { method: 'POST' });
      const data = await response.json();
      alert(data.message);
      fetchStats();
      fetchPages();
    } catch (error) {
      console.error('Error starting crawl:', error);
      alert('Error starting crawl');
    } finally {
      setCrawling(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Highlight search terms
  const highlightQuery = (text, query) => {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? 
        <mark key={index} className="bg-yellow-200 px-1 rounded">{part}</mark> : 
        part
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">SearchEngine</h1>
              {isAdmin && (
                <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                  Admin Mode
                </span>
              )}
            </div>
            
            {isAdmin && (
              <nav className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('search')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'search' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Search
                </button>
                <button
                  onClick={() => setActiveTab('crawl')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'crawl' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Crawl
                </button>
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'stats' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Stats
                </button>
                <button
                  onClick={() => setActiveTab('pages')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'pages' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Pages
                </button>
              </nav>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Section - Always visible or when search tab is active */}
        {(!isAdmin || activeTab === 'search') && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">Search</h2>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  placeholder="Enter your search query..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={search}
                  disabled={loading}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-6">
                  <div className="text-sm text-gray-600 mb-4">
                    Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                  </div>
                  <div className="space-y-4">
                    {searchResults.map((result, index) => (
                      <div key={index} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <h3 className="text-xl font-semibold text-blue-600 hover:text-blue-800 mb-2">
                          <a href={result.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                            {highlightQuery(result.title, searchQuery)}
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </h3>
                        <div className="text-sm text-green-600 font-medium mb-2">
                          {result.url}
                        </div>
                        <p className="text-gray-700 leading-relaxed mb-2">
                          {highlightQuery(result.snippet || result.description, searchQuery)}
                        </p>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>Relevance Score: {result.score}</span>
                          <span>Crawled: {formatDate(result.crawled_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.length === 0 && searchQuery && !loading && (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-gray-600">No results found for "{searchQuery}"</p>
                  <p className="text-sm text-gray-500 mt-2">Try different keywords or add more content to crawl</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admin Sections */}
        {isAdmin && (
          <>
            {/* Crawl Tab */}
            {activeTab === 'crawl' && (
              <div className="space-y-8">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-4">Add URLs to Crawl</h2>
                  
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <input
                        type="url"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                      <button
                        onClick={addUrl}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add URL
                      </button>
                    </div>
                    
                    <button
                      onClick={startCrawling}
                      disabled={crawling}
                      className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-5-9V3m0 0V1m0 2h4m-4 0H7" />
                      </svg>
                      {crawling ? 'Crawling...' : 'Start Crawling'}
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">Crawl Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{stats.pending_crawls || 0}</div>
                      <div className="text-sm text-yellow-700">Pending</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{stats.completed_crawls || 0}</div>
                      <div className="text-sm text-green-700">Completed</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{stats.failed_crawls || 0}</div>
                      <div className="text-sm text-red-700">Failed</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && (
              <div className="space-y-8">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <h2 className="text-xl font-semibold">Search Engine Statistics</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
                      <div className="text-3xl font-bold">{stats.total_indexed_pages || 0}</div>
                      <div className="text-blue-100">Total Pages Indexed</div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
                      <div className="text-3xl font-bold">{stats.completed_crawls || 0}</div>
                      <div className="text-green-100">Successful Crawls</div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 rounded-lg text-white">
                      <div className="text-3xl font-bold">{stats.pending_crawls || 0}</div>
                      <div className="text-yellow-100">Pending Crawls</div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 rounded-lg text-white">
                      <div className="text-3xl font-bold">{stats.failed_crawls || 0}</div>
                      <div className="text-red-100">Failed Crawls</div>
                    </div>
                  </div>
                  
                  <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-2">Quick Actions</h3>
                    <div className="flex gap-4">
                      <button
                        onClick={fetchStats}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                      >
                        Refresh Stats
                      </button>
                      <button
                        onClick={() => setActiveTab('crawl')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                      >
                        Add More URLs
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pages Tab */}
            {activeTab === 'pages' && (
              <div className="space-y-8">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold">Indexed Pages</h2>
                    <button
                      onClick={fetchPages}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Refresh
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {pages.map((page, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold text-blue-600 hover:text-blue-800 mb-2">
                          <a href={page.url} target="_blank" rel="noopener noreferrer">
                            {page.title || 'No Title'}
                          </a>
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">{page.url}</p>
                        <p className="text-xs text-gray-500">
                          Crawled: {formatDate(page.crawled_at)}
                        </p>
                      </div>
                    ))}
                    
                    {pages.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No pages indexed yet. Add URLs to crawl first.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Instructions */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">
            {isAdmin ? 'Admin Mode Active' : 'User Instructions'}
          </h3>
          <div className="text-sm text-blue-700 space-y-1">
            {isAdmin ? (
              <>
                <p>• You have access to all admin features including URL management and crawling</p>
                <p>• Press <kbd className="px-2 py-1 bg-blue-200 rounded">Ctrl+Shift+A</kbd> to toggle admin mode</p>
                <p>• Use the tabs above to navigate between different admin sections</p>
              </>
            ) : (
              <>
                <p>• Use the search box to find content from indexed pages</p>
                <p>• Press <kbd className="px-2 py-1 bg-blue-200 rounded">Ctrl+Shift+A</kbd> to access admin features</p>
                <p>• Or add <code className="px-2 py-1 bg-blue-200 rounded">?admin=true</code> to the URL</p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
