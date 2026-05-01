const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

let db = null;

function getDb() {
  if (db) return db;

  const dbPath = process.env.DATABASE_PATH || './data/invoice-insights.db';
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Additive column migrations — safe to run on every open because they are
  // wrapped in try/catch. SQLite < 3.37 has no IF NOT EXISTS on ADD COLUMN.
  const additiveMigrations = [
    'ALTER TABLE facturas ADD COLUMN summary TEXT',
  ];
  for (const sql of additiveMigrations) {
    try { db.exec(sql); } catch (e) {
      if (!e.message.includes('duplicate column name') &&
          !e.message.includes('no such table')) throw e;
    }
  }

  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb };
