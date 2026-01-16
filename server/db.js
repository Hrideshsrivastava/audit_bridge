/* server/db.js */
const { Pool } = require("pg");

// Construct the connection string from env vars if DATABASE_URL isn't set
const connectionString = process.env.DATABASE_URL || 
  `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Supabase/Render connections
  }
});

module.exports = pool;