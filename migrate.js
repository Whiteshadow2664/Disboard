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

async function migrateTable(tableName, createTableSQL) {
    try {
        // Create table in SQLite
        sqliteDb.run(createTableSQL, (err) => {
            if (err) {
                console.error(`❌ Error creating '${tableName}' table in SQLite:`, err.message);
                return;
            }
            console.log(`✅ Table '${tableName}' checked/created in SQLite.`);
        });

        // Fetch data from PostgreSQL
        const { rows } = await pgPool.query(`SELECT * FROM ${tableName}`);
        console.log(`📥 Fetching data from '${tableName}'... Found ${rows.length} records.`);

        for (const row of rows) {
            const columnNames = Object.keys(row).join(', ');
            const placeholders = Object.keys(row).map(() => '?').join(', ');
            const values = Object.values(row);

            const insertQuery = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;
            
            sqliteDb.run(insertQuery, values, (err) => {
                if (err) {
                    console.error(`❌ Error inserting into '${tableName}':`, err.message);
                }
            });
        }

        console.log(`✅ Data migrated successfully for '${tableName}'.`);
    } catch (err) {
        console.error(`❌ Error migrating '${tableName}':`, err.message);
    }
}

(async () => {
    console.log("🚀 Starting migration from NeonTech (PostgreSQL) to SQLite...");

    await migrateTable('mod_rank', `
        CREATE TABLE IF NOT EXISTS mod_rank (
            user_id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            xp INTEGER NOT NULL,
            joined_at TEXT NOT NULL
        )
    `);

    await migrateTable('leaderboard', `
        CREATE TABLE IF NOT EXISTS leaderboard (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            language TEXT NOT NULL,
            level TEXT NOT NULL,
            quizzes INTEGER NOT NULL,
            points INTEGER NOT NULL
        )
    `);

    console.log("🎉 Migration complete! Closing connections...");
    pgPool.end();
    sqliteDb.close();
})();