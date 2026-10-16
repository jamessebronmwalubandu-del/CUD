import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
config({ path: ".env.local" });
config();

const sql = neon(process.env.DATABASE_URL);
const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
console.log("Tables in DB:", tables.map((t) => t.table_name));
