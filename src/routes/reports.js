const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', '..', (process.env.UPLOADS_DIR || 'uploads'));
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || '') || '.jpg';
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  }
});

const upload = multer({ storage });

function classifySeverity(description) {
  if (!description) return 'low';
  const text = description.toLowerCase();
  let score = 0;
  const weights = [
    ['sewage', 3],
    ['overflow', 3],
    ['toilet', 2],
    ['blocked', 2],
    ['garbage', 2],
    ['medical', 3],
    ['dead', 3],
    ['smell', 1],
    ['mosquito', 2],
    ['drain', 2],
    ['hazard', 3],
    ['urgent', 3],
  ];
  for (const [kw, w] of weights) if (text.includes(kw)) score += w;
  if (text.length > 300) score += 2;
  if (score >= 6) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

// Public submission
router.post('/', upload.single('image'), (req, res) => {
  const { username, description, latitude, longitude } = req.body || {};
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'invalid coordinates' });
  }
  const imagePath = req.file ? path.join('uploads', path.basename(req.file.path)) : null;
  const severity = classifySeverity(description);
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO reports (id, username, description, image_path, latitude, longitude, severity, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, username || null, description || null, imagePath, lat, lng, severity, 'new', new Date().toISOString());
  return res.json({ ok: true, id, severity, imagePath });
});

// Protected list
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM reports ORDER BY datetime(created_at) DESC').all();
  return res.json(rows);
});

// Protected update status
router.patch('/:id/status', requireAuth, (req, res) => {
  const id = req.params.id;
  const { status } = req.body || {};
  if (!['new', 'in_progress', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'invalid status' });
  }
  const db = getDb();
  const info = db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status, id);
  if (info.changes === 0) return res.status(404).json({ error: 'not found' });
  return res.json({ ok: true });
});

module.exports = router;
