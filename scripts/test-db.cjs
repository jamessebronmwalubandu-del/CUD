require('dotenv').config({ path: '.env.local' });
const { neon, Pool } = require('@neondatabase/serverless');

async function test() {
  const url = process.env.DATABASE_URL;
  console.log('URL prefix:', url ? url.slice(0, 50) + '...' : 'MISSING');

  // Test 1: neon() HTTP tagged-template
  try {
    const sql = neon(url);
    const rows = await sql`SELECT count(*) as c FROM "User"`;
    console.log('✅ neon() HTTP OK:', rows);
  } catch (e) {
    console.error('❌ neon() HTTP FAIL:', e.message);
  }

  // Test 2: Pool WebSocket
  try {
    const ws = require('ws');
    const pool = new Pool({ connectionString: url, webSocketConstructor: ws });
    const result = await pool.query('SELECT count(*) as c FROM "User"');
    console.log('✅ Pool WSS OK:', result.rows);
    await pool.end();
  } catch (e) {
    console.error('❌ Pool WSS FAIL:', e.message);
  }
}
test();
