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
            userid TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            count INTEGER NOT NULL DEFAULT 0
        )
    `;

    try {
        // Create table in SQLite
        await new Promise((resolve, reject) => {
            sqliteDb.run(createTableSQL, (err) => {
                if (err) {
                    console.error(`❌ Error creating '${tableName}' table in SQLite:`, err.message);
                    reject(err);
                } else {
                    console.log(`✅ Table '${tableName}' checked/created in SQLite.`);
                    resolve();
                }
            });
        });

        // Fetch data from PostgreSQL (Make sure to use the correct column names)
        const { rows } = await pgPool.query(`SELECT userid, username, COALESCE(count, 0) AS count FROM ${tableName}`);
        console.log(`📥 Fetching data from '${tableName}'... Found ${rows.length} records.`);

        // Insert data into SQLite
        const insertQuery = `INSERT INTO bumps (userid, username, count) VALUES (?, ?, ?)`;

        sqliteDb.serialize(() => {
            const stmt = sqliteDb.prepare(insertQuery);
            for (const row of rows) {
                stmt.run(row.userid, row.username, row.count, (err) => {
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