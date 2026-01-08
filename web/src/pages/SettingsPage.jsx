import { useState, useEffect } from 'react';
import { Check, Copy, RefreshCw, Trash2, Plus, ExternalLink, Edit2, X, Save } from 'lucide-react';

function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [authStatus, setAuthStatus] = useState(null);
  const [feeds, setFeeds] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [editingFeedId, setEditingFeedId] = useState(null);
  const [editingCalendarIds, setEditingCalendarIds] = useState([]);

  const [newFeed, setNewFeed] = useState({
    name: '',
    calendarIds: [],
    includePastDays: 30,
    includeFutureDays: 365,
    timezone: 'Europe/Jersey',
    refreshIntervalHours: 6
  });

  useEffect(() => {
    async function loadAllData() {
      setLoading(true);
      await Promise.all([
        loadSettings(),
        loadAuthStatus(),
        loadFeeds(),
        loadCalendars()
      ]);
      setLoading(false);
    }
    loadAllData();
  }, []);

  async function loadSettings() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  }

  async function handleSaveAndLogin() {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_url: settings.base_url,
          ms_client_id: settings.ms_client_id,
          ms_client_secret: settings.ms_client_secret
        })
      });

      if (res.ok) {
        // Redirect to Microsoft login
        window.location.href = '/auth/login';
      } else {
        alert('Error saving settings');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  async function loadAuthStatus() {
    try {
      const res = await fetch('/auth/status');
      if (res.ok) {
        const data = await res.json();
        setAuthStatus(data);
      }
    } catch (err) {
      console.error('Error loading auth status:', err);
    }
  }

  async function loadFeeds() {
    try {
      const res = await fetch('/api/feeds');
      if (res.ok) {
        const data = await res.json();
        setFeeds(data);
      }
    } catch (err) {
      console.error('Error loading feeds:', err);
    }
  }

  async function loadCalendars() {
    try {
      const res = await fetch('/api/calendars');
      if (res.ok) {
        const data = await res.json();
        setCalendars(data);
      }
    } catch (err) {
      console.error('Error loading calendars:', err);
    }
  }

  async function handleTestConnection() {
    setLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings/test', { method: 'POST' });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateFeed() {
    if (!newFeed.name || newFeed.calendarIds.length === 0) {
      alert('Please enter a feed name and select at least one calendar');
      return;
    }

    try {
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFeed)
      });

      if (res.ok) {
        setNewFeed({
          name: '',
          calendarIds: [],
          includePastDays: 30,
          includeFutureDays: 365,
          timezone: 'Europe/Jersey'
        });
        loadFeeds();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  async function handleRegenerateToken(feedId) {
    if (!confirm('Regenerate token? The old URL will stop working.')) return;

    try {
      const res = await fetch(`/api/feeds/${feedId}/regenerate-token`, {
        method: 'POST'
      });

      if (res.ok) {
        loadFeeds();
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  async function handleDeleteFeed(feedId) {
    if (!confirm('Delete this feed?')) return;

    try {
      const res = await fetch(`/api/feeds/${feedId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        loadFeeds();
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  function copyToClipboard(text, id) {
    navigator.clipboard.writeText(text);
    setCopiedUrl(id);
    setTimeout(() => setCopiedUrl(null), 2000);
  }

  const [editingRefreshInterval, setEditingRefreshInterval] = useState(6);
  const [refreshingFeedId, setRefreshingFeedId] = useState(null);

  function startEditingFeed(feed) {
    setEditingFeedId(feed.id);
    setEditingCalendarIds(feed.calendarIds);
    setEditingRefreshInterval(feed.refreshIntervalHours || 6);
  }

  function cancelEditingFeed() {
    setEditingFeedId(null);
    setEditingCalendarIds([]);
    setEditingRefreshInterval(6);
  }

  async function saveEditingFeed(feedId) {
    try {
      const res = await fetch(`/api/feeds/${feedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          calendarIds: editingCalendarIds,
          refreshIntervalHours: editingRefreshInterval
        })
      });

      if (res.ok) {
        loadFeeds();
        setEditingFeedId(null);
        setEditingCalendarIds([]);
        setEditingRefreshInterval(6);
      } else {
        alert('Error updating feed');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  function toggleEditingCalendar(calId) {
    setEditingCalendarIds(prev =>
      prev.includes(calId)
        ? prev.filter(id => id !== calId)
        : [...prev, calId]
    );
  }

  async function handleRefreshFeed(feedId) {
    setRefreshingFeedId(feedId);
    try {
      const res = await fetch(`/api/feeds/${feedId}/refresh`, {
        method: 'POST'
      });

      if (res.ok) {
        loadFeeds();
      } else {
        alert('Error refreshing feed');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setRefreshingFeedId(null);
    }
  }

  function formatLastRefreshed(timestamp) {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  }

  function getRefreshIntervalLabel(hours) {
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''}`;
    const days = hours / 24;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''}`;
    const weeks = days / 7;
    return `${weeks} week${weeks > 1 ? 's' : ''}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  console.log('Auth Status:', authStatus);
  console.log('Settings:', settings);

  return (
    <div className="space-y-6">
      <div className="bg-background-paper rounded-lg shadow-lg border border-gray-700 p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-100">Microsoft Authentication</h2>
        
        {authStatus?.authenticated ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-green-400">
                <Check className="w-5 h-5" />
                <div>
                  <span className="block">Authenticated</span>
                  {authStatus.name && (
                    <span className="text-sm text-gray-400">{authStatus.name}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => fetch('/auth/logout', { method: 'POST' }).then(() => window.location.reload())}
                className="px-3 py-1.5 bg-gray-700 text-gray-200 text-sm rounded hover:bg-gray-600"
              >
                Sign Out
              </button>
            </div>

            <div className="p-4 bg-background rounded border border-gray-700">
              <h3 className="font-semibold mb-2 text-gray-100">Configuration</h3>
              <div className="text-sm space-y-1 text-gray-400">
                {authStatus?.username && (
                  <p>Username: {authStatus.username}</p>
                )}
                {settings?.ms_client_id && (
                  <p>Client ID: {settings.ms_client_id}</p>
                )}
                {settings?.redirect_uri && (
                  <p>Redirect URI: {settings.redirect_uri}</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-300">
              Configure your Microsoft Azure application credentials to enable authentication.
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-200">Base URL</label>
                <input
                  type="text"
                  placeholder="https://your-domain.com"
                  value={settings?.base_url || ''}
                  onChange={(e) => setSettings({ ...settings, base_url: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 placeholder-gray-400 focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <p className="text-xs text-gray-500 mt-1">The public URL where this app is accessible</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-200">Microsoft Client ID</label>
                <input
                  type="text"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={settings?.ms_client_id || ''}
                  onChange={(e) => setSettings({ ...settings, ms_client_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 placeholder-gray-400 focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <p className="text-xs text-gray-500 mt-1">From your Azure App Registration</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-200">Microsoft Client Secret</label>
                <input
                  type="password"
                  placeholder="Enter client secret"
                  value={settings?.ms_client_secret || ''}
                  onChange={(e) => setSettings({ ...settings, ms_client_secret: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 placeholder-gray-400 focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <p className="text-xs text-gray-500 mt-1">From your Azure App Registration</p>
              </div>

              <button
                onClick={handleSaveAndLogin}
                disabled={!settings?.base_url || !settings?.ms_client_id || !settings?.ms_client_secret}
                className="w-full flex items-center justify-center px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-500"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Save & Login with Microsoft
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-background-paper rounded-lg shadow-lg border border-gray-700 p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-100">iCal Feeds</h2>

        <div className="mb-6 p-4 bg-background rounded border border-gray-700">
          <h3 className="font-semibold mb-3 text-gray-100">Create New Feed</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Feed name"
              value={newFeed.name}
              onChange={(e) => setNewFeed({ ...newFeed, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 placeholder-gray-400 focus:border-primary focus:ring-1 focus:ring-primary"
            />
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-200">Select Calendars</label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {calendars.map(cal => (
                  <label key={cal.id} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newFeed.calendarIds.includes(cal.id)}
                      onChange={(e) => {
                        const ids = e.target.checked
                          ? [...newFeed.calendarIds, cal.id]
                          : newFeed.calendarIds.filter(id => id !== cal.id);
                        setNewFeed({ ...newFeed, calendarIds: ids });
                      }}
                      className="rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-200">{cal.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-200">Refresh Interval</label>
              <select
                value={newFeed.refreshIntervalHours}
                onChange={(e) => setNewFeed({ ...newFeed, refreshIntervalHours: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value={1}>Every 1 hour</option>
                <option value={2}>Every 2 hours</option>
                <option value={4}>Every 4 hours</option>
                <option value={6}>Every 6 hours</option>
                <option value={12}>Every 12 hours</option>
                <option value={24}>Every 24 hours</option>
                <option value={168}>Every 1 week</option>
                <option value={336}>Every 2 weeks</option>
                <option value={672}>Every 4 weeks</option>
              </select>
            </div>

            <button
              onClick={handleCreateFeed}
              className="flex items-center px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Feed
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {feeds.length === 0 ? (
            <p className="text-gray-400">No feeds created yet</p>
          ) : (
            feeds.map(feed => (
              <div key={feed.id} className="border border-gray-700 bg-background rounded p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-100">{feed.name}</h3>
                    
                    {editingFeedId === feed.id ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm text-gray-300 font-medium">Select calendars for this feed:</p>
                        <div className="space-y-1 max-h-48 overflow-y-auto bg-background-paper p-3 rounded border border-gray-700">
                          {calendars.map(cal => (
                            <label key={cal.id} className="flex items-start space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editingCalendarIds.includes(cal.id)}
                                onChange={() => toggleEditingCalendar(cal.id)}
                                className="mt-0.5 rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary"
                              />
                              <span className="text-sm text-gray-200">{cal.name}</span>
                            </label>
                          ))}
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-200">Refresh Interval</label>
                          <select
                            value={editingRefreshInterval}
                            onChange={(e) => setEditingRefreshInterval(parseInt(e.target.value))}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 focus:border-primary focus:ring-1 focus:ring-primary"
                          >
                            <option value={1}>Every 1 hour</option>
                            <option value={2}>Every 2 hours</option>
                            <option value={4}>Every 4 hours</option>
                            <option value={6}>Every 6 hours</option>
                            <option value={12}>Every 12 hours</option>
                            <option value={24}>Every 24 hours</option>
                            <option value={168}>Every 1 week</option>
                            <option value={336}>Every 2 weeks</option>
                            <option value={672}>Every 4 weeks</option>
                          </select>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => saveEditingFeed(feed.id)}
                            className="flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            <Save className="w-3.5 h-3.5 mr-1.5" />
                            Save
                          </button>
                          <button
                            onClick={cancelEditingFeed}
                            className="flex items-center px-3 py-1.5 bg-gray-700 text-gray-200 text-sm rounded hover:bg-gray-600"
                          >
                            <X className="w-3.5 h-3.5 mr-1.5" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mt-1 space-y-2">
                          <div>
                            <p className="text-sm text-gray-400">
                              {feed.calendarIds.length} calendar(s)
                            </p>
                            {feed.calendarIds.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {feed.calendarIds.map(calId => {
                                  const cal = calendars.find(c => c.id === calId);
                                  return cal ? (
                                    <span key={calId} className="text-xs bg-background-paper text-gray-300 px-2 py-0.5 rounded">
                                      {cal.name}
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <div className="text-gray-400">
                              <span>Refreshes: {getRefreshIntervalLabel(feed.refreshIntervalHours)}</span>
                              <span className="mx-2">•</span>
                              <span>Last updated: {formatLastRefreshed(feed.lastRefreshedAt)}</span>
                            </div>
                            <button
                              onClick={() => handleRefreshFeed(feed.id)}
                              disabled={refreshingFeedId === feed.id}
                              className="flex items-center px-2 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 disabled:opacity-50"
                              title="Refresh now"
                            >
                              <RefreshCw className={`w-3 h-3 mr-1 ${refreshingFeedId === feed.id ? 'animate-spin' : ''}`} />
                              {refreshingFeedId === feed.id ? 'Refreshing...' : 'Refresh'}
                            </button>
                          </div>
                        </div>
                        
                        <div className="mt-2 flex items-center space-x-2">
                          <input
                            type="text"
                            value={feed.url}
                            readOnly
                            className="flex-1 px-2 py-1 text-sm bg-background-paper border border-gray-700 rounded text-gray-300"
                          />
                          <button
                            onClick={() => copyToClipboard(feed.url, feed.id)}
                            className="p-2 text-gray-400 hover:text-gray-200"
                            title="Copy URL"
                          >
                            {copiedUrl === feed.id ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex space-x-2 ml-4">
                    {editingFeedId !== feed.id && (
                      <>
                        <button
                          onClick={() => startEditingFeed(feed)}
                          className="p-2 text-gray-400 hover:text-gray-200"
                          title="Edit feed"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRegenerateToken(feed.id)}
                          className="p-2 text-gray-400 hover:text-gray-200"
                          title="Regenerate token"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteFeed(feed.id)}
                          className="p-2 text-red-500 hover:text-red-400"
                          title="Delete feed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
