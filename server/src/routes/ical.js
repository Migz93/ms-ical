import express from 'express';
import ical from 'ical-generator';
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

router.get('/:token.ics', async (req, res) => {
  try {
    const { token } = req.params;
    const tokenWithoutExt = token.replace('.ics', '');
    
    const feed = db.prepare(`
      SELECT * FROM feeds 
      WHERE token = ? AND enabled = 1
    `).get(tokenWithoutExt);
    
    if (!feed) {
      return res.status(404).send('Feed not found');
    }
    
    const calendarIds = JSON.parse(feed.calendar_ids_json);
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - feed.include_past_days);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + feed.include_future_days);
    
    const client = await getGraphClient();
    const allEvents = [];
    
    for (const calId of calendarIds) {
      try {
        const events = await client
          .api(`/me/calendars/${calId}/calendarView`)
          .query({
            startDateTime: startDate.toISOString(),
            endDateTime: endDate.toISOString()
          })
          .top(500)
          .get();
        
        allEvents.push(...events.value);
      } catch (err) {
        console.error(`Error fetching events for calendar ${calId}:`, err.message);
      }
    }
    
    const calendar = ical({ name: feed.name });
    
    for (const event of allEvents) {
      const eventData = {
        id: event.id,
        start: new Date(event.start.dateTime + (event.start.timeZone ? '' : 'Z')),
        end: new Date(event.end.dateTime + (event.end.timeZone ? '' : 'Z')),
        summary: event.subject,
        description: event.bodyPreview || '',
        location: event.location?.displayName || ''
      };
      
      if (event.isAllDay) {
        eventData.allDay = true;
      }
      
      calendar.createEvent(eventData);
    }
    
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${feed.name}.ics"`);
    res.setHeader('Cache-Control', 'max-age=300');
    
    res.send(calendar.toString());
  } catch (error) {
    console.error('iCal generation error:', error);
    res.status(500).send('Error generating calendar feed');
  }
});

export default router;
