require('dotenv').config();
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();

// PostgreSQL (NeonTech) database connection
const pgPool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// SQLite database connection
const sqliteDb = new sqlite3.Database('database.sqlite', (err) => {
    if (err) {
        console.error('❌ Error opening SQLite database:', err.message);
    } else {
        console.log('✅ Connected to SQLite database.');
    }
});

async function migrateTable() {
    const tableName = 'bumps';
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS bumps (
            user_id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            bumps INTEGER NOT NULL DEFAULT 0,
            last_bump TEXT NOT NULL
        )
    `;

    try {
        // Create table in SQLite
        sqliteDb.run(createTableSQL, (err) => {
            if (err) {
                console.error(`❌ Error creating '${tableName}' table in SQLite:`, err.message);
                return;
            }
            console.log(`✅ Table '${tableName}' checked/created in SQLite.`);
        });

        // Fetch data from PostgreSQL and replace NULL bumps with 0
        const { rows } = await pgPool.query(`SELECT user_id, username, COALESCE(bumps, 0) AS bumps, last_bump FROM ${tableName}`);
        console.log(`📥 Fetching data from '${tableName}'... Found ${rows.length} records.`);

        // Insert data into SQLite
        const insertQuery = `INSERT INTO bumps (user_id, username, bumps, last_bump) VALUES (?, ?, ?, ?)`;

        sqliteDb.serialize(() => {
            const stmt = sqliteDb.prepare(insertQuery);
            for (const row of rows) {
                stmt.run(row.user_id, row.username, row.bumps, row.last_bump || '1970-01-01 00:00:00', (err) => {
                    if (err) {
                        console.error(`❌ Error inserting into '${tableName}':`, err.message);
                    }
                });
            }
            stmt.finalize();
        });

        console.log(`✅ Data migrated successfully for '${tableName}'.`);
    } catch (err) {
        console.error(`❌ Error migrating '${tableName}':`, err.message);
    }
}

(async () => {
    console.log("🚀 Starting migration from NeonTech (PostgreSQL) to SQLite...");

    await migrateTable();

    console.log("🎉 Migration complete! Closing connections...");
    pgPool.end();
    sqliteDb.close();
})();