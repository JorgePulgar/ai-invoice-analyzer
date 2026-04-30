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

console.log(`[init-db] schema applied to ${process.env.DATABASE_PATH || './data/invoice-insights.db'}`);
