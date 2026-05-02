// Initializes the DB by applying schema.sql.
// Usage: npm run init-db
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { getDb } = require('./database');

const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');

const db = getDb();
db.exec(schema);

// Additive migrations: ALTER TABLE for columns added after the initial schema.
// Each is wrapped in try/catch because SQLite raises an error if the column
// already exists (no IF NOT EXISTS on ALTER TABLE ADD COLUMN in SQLite < 3.37).
const migrations = [
  "ALTER TABLE facturas ADD COLUMN summary TEXT",
];
for (const sql of migrations) {
  try {
    db.exec(sql);
  } catch (err) {
    if (!err.message.includes('duplicate column name')) throw err;
  }
}

console.log(`[init-db] schema applied to ${process.env.DATABASE_PATH || './data/invoice-insights.db'}`);
