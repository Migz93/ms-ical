import db from '../db/index.js';

let refreshIntervals = new Map();

export function startFeedRefreshScheduler() {
  console.log('Starting feed refresh scheduler...');
  
  // Load all feeds and set up their refresh schedules
  refreshAllFeedSchedules();
  
  // Check every minute if any feeds need refreshing
  setInterval(() => {
    checkAndRefreshFeeds();
  }, 60000); // Check every minute
}

function refreshAllFeedSchedules() {
  try {
    const feeds = db.prepare(`
      SELECT id, refresh_interval_hours, last_refreshed_at
      FROM feeds
      WHERE enabled = 1
    `).all();
    
    console.log(`Loaded ${feeds.length} active feeds for scheduling`);
  } catch (error) {
    console.error('Error loading feed schedules:', error);
  }
}

function checkAndRefreshFeeds() {
  try {
    const now = new Date();
    
    const feeds = db.prepare(`
      SELECT id, name, refresh_interval_hours, last_refreshed_at
      FROM feeds
      WHERE enabled = 1
    `).all();
    
    for (const feed of feeds) {
      const shouldRefresh = shouldRefreshFeed(feed, now);
      
      if (shouldRefresh) {
        console.log(`Refreshing feed: ${feed.name} (ID: ${feed.id})`);
        refreshFeed(feed.id);
      }
    }
  } catch (error) {
    console.error('Error checking feeds for refresh:', error);
  }
}

function shouldRefreshFeed(feed, now) {
  // If never refreshed, refresh on first check
  if (!feed.last_refreshed_at) {
    return true;
  }
  
  const lastRefreshed = new Date(feed.last_refreshed_at);
  const intervalMs = feed.refresh_interval_hours * 60 * 60 * 1000;
  const nextRefreshTime = new Date(lastRefreshed.getTime() + intervalMs);
  
  return now >= nextRefreshTime;
}

function refreshFeed(feedId) {
  try {
    // Update the last_refreshed_at timestamp
    db.prepare(`
      UPDATE feeds 
      SET last_refreshed_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(feedId);
    
    console.log(`Feed ${feedId} refreshed at ${new Date().toISOString()}`);
  } catch (error) {
    console.error(`Error refreshing feed ${feedId}:`, error);
  }
}

export function stopFeedRefreshScheduler() {
  // Clear all intervals
  for (const [feedId, intervalId] of refreshIntervals) {
    clearInterval(intervalId);
  }
  refreshIntervals.clear();
  console.log('Feed refresh scheduler stopped');
}
