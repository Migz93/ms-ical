import express from 'express';
import { z } from 'zod';
import db from '../db/index.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { resetMsalClient } from '../msal/client.js';

const router = express.Router();

const settingsSchema = z.object({
  base_url: z.string().optional(),
  ms_client_id: z.string().optional(),
  ms_client_secret: z.string().optional()
});

router.get('/', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    
    const baseUrl = settings?.base_url || '';
    
    res.json({
      base_url: baseUrl,
      ms_client_id: settings?.ms_client_id || '',
      redirect_uri: baseUrl ? `${baseUrl}/auth/callback` : ''
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const validated = settingsSchema.parse(req.body);
    
    const updates = {};
    if (validated.base_url) {
      updates.base_url = validated.base_url;
    }
    if (validated.ms_client_id) {
      updates.ms_client_id = validated.ms_client_id;
    }
    if (validated.ms_client_secret) {
      updates.ms_client_secret_enc = encrypt(validated.ms_client_secret);
    }
    
    if (Object.keys(updates).length > 0) {
      const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      
      db.prepare(`
        UPDATE settings 
        SET ${setClauses}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = 1
      `).run(...values);
      
      resetMsalClient();
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/test', async (req, res) => {
  try {
    const { getMsalClient } = await import('../msal/client.js');
    const { Client } = await import('@microsoft/microsoft-graph-client');
    const { SCOPES } = await import('../msal/config.js');
    
    const msalClient = getMsalClient();
    const accounts = await msalClient.getTokenCache().getAllAccounts();
    
    if (accounts.length === 0) {
      return res.status(401).json({ 
        error: 'Not authenticated. Please sign in first.' 
      });
    }
    
    const silentRequest = {
      account: accounts[0],
      scopes: SCOPES
    };
    
    const tokenResponse = await msalClient.acquireTokenSilent(silentRequest);
    
    const client = Client.init({
      authProvider: (done) => {
        done(null, tokenResponse.accessToken);
      }
    });
    
    const user = await client.api('/me').get();
    const calendars = await client.api('/me/calendars').get();
    
    res.json({
      success: true,
      user: {
        displayName: user.displayName,
        mail: user.mail || user.userPrincipalName
      },
      calendars: calendars.value.map(cal => ({
        id: cal.id,
        name: cal.name,
        owner: cal.owner?.name
      }))
    });
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.toString()
    });
  }
});

export default router;
