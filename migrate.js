require('dotenv').config();
const { Pool } = require('pg');

const neonPool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });
const supabasePool = new Pool({ connectionString: process.env.SUPABASE_DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrateTable(tableName, columns) {
    try {
        const createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`;
        await supabasePool.query(createTableQuery);
        console.log(`✅ Table '${tableName}' checked/created in Supabase.`);

        const { rows } = await neonPool.query(`SELECT * FROM ${tableName}`);
        console.log(`📥 Fetching data from '${tableName}'... Found ${rows.length} records.`);

        for (const row of rows) {
            const columns = Object.keys(row).join(', ');
            const values = Object.values(row);
            const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

            const insertQuery = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
            await supabasePool.query(insertQuery, values);
        }

        console.log(`✅ Data migrated successfully for '${tableName}'.`);
    } catch (err) {
        console.error(`❌ Error migrating '${tableName}':`, err);
    }
}

(async () => {
    console.log("🚀 Starting migration from NeonTech to Supabase...");

    await migrateTable('mod_rank', `
        user_id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        xp INTEGER NOT NULL,
        joined_at TIMESTAMP NOT NULL
    `);

    await migrateTable('leaderboard', `
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        language TEXT NOT NULL,
        level TEXT NOT NULL,
        quizzes INTEGER NOT NULL,
        points INTEGER NOT NULL
    `);

    console.log("🎉 Migration complete! Closing connections...");
    await neonPool.end();
    await supabasePool.end();
})();