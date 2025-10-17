const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

let db;

function initDatabase() {
  const dbPath = path.join(__dirname, '..', 'data.sqlite');
  db = new Database(dbPath);

  db.prepare(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','ngo')),
    created_at TEXT NOT NULL
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    username TEXT,
    description TEXT,
    image_path TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('low','medium','high')),
    status TEXT NOT NULL CHECK(status IN ('new','in_progress','resolved')) DEFAULT 'new',
    created_at TEXT NOT NULL
  )`).run();

  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (count === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('seed-admin', 'admin', hash, 'admin', new Date().toISOString());
  }
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

module.exports = { initDatabase, getDb };
