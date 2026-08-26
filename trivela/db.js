require('dotenv').config();
const { createClient } = require('@libsql/client');
const path = require('path');

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

// In Vercel / Production: Connects to Turso Cloud database
// In Local Dev: Connects to Turso Cloud (if credentials provided) or local SQLite file
const client = (TURSO_URL && TURSO_TOKEN)
  ? createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })
  : createClient({ url: `file:${path.join(__dirname, 'trivela.db')}` });

function flattenArgs(args) {
  if (args.length === 1 && typeof args[0] === 'object' && !Array.isArray(args[0]) && args[0] !== null) {
    return args[0]; // named params { id, name, ... }
  }
  if (args.length === 1 && Array.isArray(args[0])) {
    return args[0];
  }
  return args;
}

const db = {
  client,
  async all(sql, params = []) {
    const res = await client.execute({ sql, args: flattenArgs(Array.isArray(params) ? params : [params]) });
    return res.rows;
  },
  async get(sql, params = []) {
    const res = await client.execute({ sql, args: flattenArgs(Array.isArray(params) ? params : [params]) });
    return res.rows[0] || null;
  },
  async run(sql, params = []) {
    const res = await client.execute({ sql, args: flattenArgs(Array.isArray(params) ? params : [params]) });
    return {
      changes: Number(res.rowsAffected || 0),
      lastInsertRowid: res.lastInsertRowid !== undefined ? Number(res.lastInsertRowid) : null
    };
  },
  prepare(sql) {
    return {
      all: (...args) => db.all(sql, flattenArgs(args)),
      get: (...args) => db.get(sql, flattenArgs(args)),
      run: (...args) => db.run(sql, flattenArgs(args))
    };
  }
};

module.exports = {
  db,
  client
};
