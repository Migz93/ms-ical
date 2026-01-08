import express from 'express';
import { Client } from '@microsoft/microsoft-graph-client';
import { getMsalClient } from '../msal/client.js';
import { SCOPES } from '../msal/config.js';

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
    const { from, to, calIds } = req.query;
    
    if (!from || !to) {
      return res.status(400).json({ error: 'from and to parameters required' });
    }
    
    const calendarIds = calIds ? calIds.split(',') : [];
    
    if (calendarIds.length === 0) {
      return res.json([]);
    }
    
    const client = await getGraphClient();
    const allEvents = [];
    
    for (const calId of calendarIds) {
      try {
        const events = await client
          .api(`/me/calendars/${calId}/calendarView`)
          .query({
            startDateTime: from,
            endDateTime: to
          })
          .top(250)
          .get();
        
        const normalized = events.value.map(event => ({
          id: event.id,
          calendarId: calId,
          title: event.subject,
          start: event.start.dateTime,
          end: event.end.dateTime,
          isAllDay: event.isAllDay,
          location: event.location?.displayName,
          bodyPreview: event.bodyPreview,
          showAs: event.showAs,
          sensitivity: event.sensitivity
        }));
        
        allEvents.push(...normalized);
      } catch (err) {
        console.error(`Error fetching events for calendar ${calId}:`, err.message);
      }
    }
    
    res.json(allEvents);
  } catch (error) {
    console.error('Events error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
