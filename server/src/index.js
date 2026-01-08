import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDatabase, getEncryptionKey } from './db/index.js';
import { runMigrations } from './db/migrations.js';
import { startFeedRefreshScheduler } from './scheduler/feed-refresh.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import settingsRoutes from './routes/settings.js';
import calendarsRoutes from './routes/calendars.js';
import eventsRoutes from './routes/events.js';
import feedsRoutes from './routes/feeds.js';
import icalRoutes from './routes/ical.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = pino({ level: 'info' });
const app = express();
const PORT = 5600;

initDatabase();
runMigrations();
startFeedRefreshScheduler();

app.use(pinoHttp({ logger }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: getEncryptionKey() || 'dev-secret-fallback',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true if using HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/calendars', calendarsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/feeds', feedsRoutes);
app.use('/ical', icalRoutes);

// Serve static frontend files
const publicPath = join(__dirname, '../public');
app.use(express.static(publicPath));

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(join(publicPath, 'index.html'));
});

app.use((err, req, res, next) => {
  logger.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
});
