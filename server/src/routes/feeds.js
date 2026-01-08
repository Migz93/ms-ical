import express from 'express';
import { z } from 'zod';
import db from '../db/index.js';
import { generateToken } from '../utils/crypto.js';

const router = express.Router();

function getBaseUrl() {
  const settings = db.prepare('SELECT base_url FROM settings WHERE id = 1').get();
  return settings?.base_url || 'http://localhost:5600';
}

const feedSchema = z.object({
  name: z.string().min(1),
  calendarIds: z.array(z.string()).min(1),
  includePastDays: z.number().int().min(0).optional(),
  includeFutureDays: z.number().int().min(1).optional(),
  timezone: z.string().optional(),
  refreshIntervalHours: z.number().int().min(1).optional()
});

router.get('/', (req, res) => {
  try {
    const feeds = db.prepare(`
      SELECT id, name, token, calendar_ids_json, include_past_days, 
             include_future_days, timezone, refresh_interval_hours, 
             last_refreshed_at, enabled, created_at, updated_at
      FROM feeds
      WHERE enabled = 1
      ORDER BY created_at DESC
    `).all();
    
    const baseUrl = getBaseUrl();
    
    const result = feeds.map(feed => ({
      id: feed.id,
      name: feed.name,
      calendarIds: JSON.parse(feed.calendar_ids_json),
      includePastDays: feed.include_past_days,
      includeFutureDays: feed.include_future_days,
      timezone: feed.timezone,
      refreshIntervalHours: feed.refresh_interval_hours,
      lastRefreshedAt: feed.last_refreshed_at,
      url: `${baseUrl}/ical/${feed.token}.ics`,
      createdAt: feed.created_at,
      updatedAt: feed.updated_at
    }));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const validated = feedSchema.parse(req.body);
    
    const token = generateToken(32);
    const calendarIdsJson = JSON.stringify(validated.calendarIds);
    
    const result = db.prepare(`
      INSERT INTO feeds (name, token, calendar_ids_json, include_past_days, 
                        include_future_days, timezone, refresh_interval_hours)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      validated.name,
      token,
      calendarIdsJson,
      validated.includePastDays || 30,
      validated.includeFutureDays || 365,
      validated.timezone || 'Europe/Jersey',
      validated.refreshIntervalHours || 6
    );
    
    const baseUrl = getBaseUrl();
    
    res.json({
      id: result.lastInsertRowid,
      name: validated.name,
      calendarIds: validated.calendarIds,
      url: `${baseUrl}/ical/${token}.ics`,
      token
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updateSchema = z.object({
      calendarIds: z.array(z.string()).min(1).optional(),
      refreshIntervalHours: z.number().int().min(1).optional()
    });
    
    const validated = updateSchema.parse(req.body);
    
    const updates = [];
    const params = [];
    
    if (validated.calendarIds) {
      updates.push('calendar_ids_json = ?');
      params.push(JSON.stringify(validated.calendarIds));
    }
    
    if (validated.refreshIntervalHours) {
      updates.push('refresh_interval_hours = ?');
      params.push(validated.refreshIntervalHours);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    
    db.prepare(`
      UPDATE feeds 
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...params);
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/regenerate-token', (req, res) => {
  try {
    const { id } = req.params;
    const newToken = generateToken(32);
    
    db.prepare(`
      UPDATE feeds 
      SET token = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(newToken, id);
    
    const baseUrl = getBaseUrl();
    
    res.json({
      success: true,
      url: `${baseUrl}/ical/${newToken}.ics`,
      token: newToken
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/refresh', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Update last_refreshed_at timestamp
    db.prepare(`
      UPDATE feeds 
      SET last_refreshed_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(id);
    
    res.json({ 
      success: true,
      lastRefreshedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    db.prepare(`
      UPDATE feeds 
      SET enabled = 0, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
