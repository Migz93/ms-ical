import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, '../../../config/app.db');
const dbDir = dirname(DB_PATH);

if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const isNewDatabase = !existsSync(DB_PATH);

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      encryption_key TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      base_url TEXT,
      ms_client_id TEXT,
      ms_client_secret_enc TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_home_id TEXT UNIQUE,
      access_token_enc TEXT,
      refresh_token_enc TEXT,
      expires_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS feeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      calendar_ids_json TEXT NOT NULL,
      include_past_days INTEGER DEFAULT 30,
      include_future_days INTEGER DEFAULT 365,
      refresh_interval_hours INTEGER DEFAULT 6,
      last_refreshed_at DATETIME,
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ui_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      selected_calendar_ids_json TEXT,
      last_view TEXT DEFAULT 'month',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS msal_cache (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      cache_data TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO settings (id) VALUES (1);
    INSERT OR IGNORE INTO ui_state (id) VALUES (1);
    INSERT OR IGNORE INTO msal_cache (id) VALUES (1);
  `);

  // Generate encryption key on first run
  if (isNewDatabase) {
    const encryptionKey = crypto.randomBytes(32).toString('hex');
    db.prepare('INSERT INTO app_config (id, encryption_key) VALUES (1, ?)').run(encryptionKey);
    console.log('Generated new encryption key');
  }

  console.log('Database initialized at:', DB_PATH);
}

export function getEncryptionKey() {
  const config = db.prepare('SELECT encryption_key FROM app_config WHERE id = 1').get();
  return config?.encryption_key || null;
}

export default db;
