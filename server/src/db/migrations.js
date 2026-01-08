import db from './index.js';
import crypto from 'crypto';

export function runMigrations() {
  // Check if columns exist and add them if they don't
  const feedsTableInfo = db.prepare("PRAGMA table_info(feeds)").all();
  const feedsColumnNames = feedsTableInfo.map(col => col.name);
  
  if (!feedsColumnNames.includes('refresh_interval_hours')) {
    console.log('Adding refresh_interval_hours column to feeds table');
    db.exec(`ALTER TABLE feeds ADD COLUMN refresh_interval_hours INTEGER DEFAULT 6`);
  }
  
  if (!feedsColumnNames.includes('last_refreshed_at')) {
    console.log('Adding last_refreshed_at column to feeds table');
    db.exec(`ALTER TABLE feeds ADD COLUMN last_refreshed_at DATETIME`);
  }
  
  // Migrate settings table
  const settingsTableInfo = db.prepare("PRAGMA table_info(settings)").all();
  const settingsColumnNames = settingsTableInfo.map(col => col.name);
  
  if (!settingsColumnNames.includes('base_url')) {
    console.log('Adding base_url column to settings table');
    db.exec(`ALTER TABLE settings ADD COLUMN base_url TEXT`);
  }
  
  // Migrate to app_config table for encryption key
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='app_config'").all();
  if (tables.length === 0) {
    console.log('Creating app_config table and migrating encryption key');
    db.exec(`
      CREATE TABLE app_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        encryption_key TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Generate encryption key for existing databases
    const encryptionKey = crypto.randomBytes(32).toString('hex');
    db.prepare('INSERT INTO app_config (id, encryption_key) VALUES (1, ?)').run(encryptionKey);
    console.log('Generated encryption key for existing database');
  }
  
  console.log('Migrations completed');
}
