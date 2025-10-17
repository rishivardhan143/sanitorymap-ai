const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

const router = express.Router();

router.post('/register', (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'username, password, role required' });
  }
  if (!['admin', 'ngo'].includes(role)) {
    return res.status(400).json({ error: 'invalid role' });
  }
  const db = getDb();
  try {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) return res.status(409).json({ error: 'username taken' });
    const passwordHash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), username, passwordHash, role, new Date().toISOString());
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'db_error' });
  }
});

router.post('/login', (req, res) => {
  let { username, password } = req.body || {};
  if (typeof username !== 'string') username = undefined;
  if (typeof password !== 'string') password = undefined;
  if (!username || !password) return res.status(400).json({ error: 'missing credentials' });
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });
  const token = jwt.sign({ sub: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token });
});

module.exports = router;
