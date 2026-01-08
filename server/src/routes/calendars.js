import express from 'express';
import { Client } from '@microsoft/microsoft-graph-client';
import { getMsalClient } from '../msal/client.js';
import { SCOPES } from '../msal/config.js';
import db from '../db/index.js';

const router = express.Router();

async function getGraphClient() {
  const msalClient = getMsalClient();
  const accounts = await msalClient.getTokenCache().getAllAccounts();
  
  if (accounts.length === 0) {
    throw new Error('Not authenticated');
  }
  
  const silentRequest = {
    account: accounts[0],
    scopes: SCOPES
  };
  
  const tokenResponse = await msalClient.acquireTokenSilent(silentRequest);
  
  return Client.init({
    authProvider: (done) => {
      done(null, tokenResponse.accessToken);
    }
  });
}

router.get('/', async (req, res) => {
  try {
    const client = await getGraphClient();
    
    const calendars = await client.api('/me/calendars').get();
    
    let calendarGroups = [];
    try {
      const groups = await client.api('/me/calendarGroups').get();
      for (const group of groups.value) {
        const groupCals = await client.api(`/me/calendarGroups/${group.id}/calendars`).get();
        calendarGroups.push(...groupCals.value);
      }
    } catch (err) {
      console.log('Could not fetch calendar groups:', err.message);
    }
    
    const allCalendars = [...calendars.value, ...calendarGroups];
    const uniqueCalendars = Array.from(
      new Map(allCalendars.map(cal => [cal.id, cal])).values()
    );
    
    const result = uniqueCalendars.map(cal => ({
      id: cal.id,
      name: cal.name,
      color: cal.hexColor || cal.color,
      owner: cal.owner?.name || cal.owner?.address,
      canEdit: cal.canEdit || false,
      canShare: cal.canShare || false,
      isDefaultCalendar: cal.isDefaultCalendar || false
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Calendars error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/selection', (req, res) => {
  try {
    const state = db.prepare('SELECT selected_calendar_ids_json FROM ui_state WHERE id = 1').get();
    const selected = state?.selected_calendar_ids_json 
      ? JSON.parse(state.selected_calendar_ids_json) 
      : [];
    res.json(selected);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/selection', (req, res) => {
  try {
    const { calendarIds } = req.body;
    
    if (!Array.isArray(calendarIds)) {
      return res.status(400).json({ error: 'calendarIds must be an array' });
    }
    
    db.prepare(`
      UPDATE ui_state 
      SET selected_calendar_ids_json = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = 1
    `).run(JSON.stringify(calendarIds));
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
