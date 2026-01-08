import { ConfidentialClientApplication } from '@azure/msal-node';
import { getMsalConfig } from './config.js';
import { DatabaseCachePlugin } from './cache.js';

let msalClient = null;

export function getMsalClient() {
  if (!msalClient) {
    const config = getMsalConfig();
    if (!config) {
      throw new Error('MSAL configuration not available');
    }
    
    const cachePlugin = new DatabaseCachePlugin();
    config.cache = {
      cachePlugin
    };
    
    msalClient = new ConfidentialClientApplication(config);
  }
  
  return msalClient;
}

export function resetMsalClient() {
  msalClient = null;
}
