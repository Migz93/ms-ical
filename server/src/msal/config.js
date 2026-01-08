import db from '../db/index.js';
import { decrypt } from '../utils/crypto.js';

export function getMsalConfig() {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  
  const clientId = settings?.ms_client_id;
  const clientSecret = settings?.ms_client_secret_enc ? decrypt(settings.ms_client_secret_enc) : null;
  const authority = 'https://login.microsoftonline.com/consumers';
  
  if (!clientId || !clientSecret) {
    return null;
  }
  
  return {
    auth: {
      clientId,
      authority,
      clientSecret
    },
    system: {
      loggerOptions: {
        loggerCallback(loglevel, message, containsPii) {
          if (!containsPii) {
            console.log(message);
          }
        },
        piiLoggingEnabled: false,
        logLevel: 3
      }
    }
  };
}

export const SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'Calendars.Read'
];

export function getRedirectUri() {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  const baseUrl = settings?.base_url || 'http://localhost:5600';
  return `${baseUrl}/auth/callback`;
}
