import db from '../db/index.js';

export class DatabaseCachePlugin {
  beforeCacheAccess(cacheContext) {
    return new Promise((resolve, reject) => {
      try {
        const row = db.prepare('SELECT cache_data FROM msal_cache WHERE id = 1').get();
        if (row && row.cache_data) {
          cacheContext.tokenCache.deserialize(row.cache_data);
        }
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  afterCacheAccess(cacheContext) {
    return new Promise((resolve, reject) => {
      if (cacheContext.cacheHasChanged) {
        try {
          const cacheData = cacheContext.tokenCache.serialize();
          db.prepare(`
            UPDATE msal_cache 
            SET cache_data = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = 1
          `).run(cacheData);
          resolve();
        } catch (err) {
          reject(err);
        }
      } else {
        resolve();
      }
    });
  }
}
