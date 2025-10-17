require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const { initDatabase } = require('./src/db');

const app = express();
const PORT = process.env.PORT || 4000;
const UPLOADS_DIR = process.env.UPLOADS_DIR || 'uploads';

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Static
app.use('/uploads', express.static(path.join(__dirname, UPLOADS_DIR)));
app.use('/', express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/reports', require('./src/routes/reports'));

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API 404 handler
app.use('/api', (req, res, next) => {
  return res.status(404).json({ error: 'not_found' });
});

// Error handler (ensure JSON for API)
app.use((err, req, res, next) => {
  const isApi = req.path && req.path.startsWith('/api');
  const status = err.status || 500;
  if (isApi) {
    return res.status(status).json({ error: err.message || 'server_error' });
  }
  return res.status(status).send('Internal Server Error');
});

// Boot
initDatabase();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
