require('dotenv').config();
const { Pool } = require('pg');

// PostgreSQL connection to OLD NeonTech database
const oldPgPool = new Pool({
    connectionString: process.env.OLD_NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// PostgreSQL connection to NEW NeonTech database
const newPgPool = new Pool({
    connectionString: process.env.NEW_NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrateTable() {
    const tableName = 'bumps';

    // Create table SQL (optional, if not already present in the new database)
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS bumps (
            userid TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            count INTEGER NOT NULL DEFAULT 0
        )
    `;

    try {
        console.log(`🚀 Starting migration for table '${tableName}'`);

        // Step 1: Ensure the table exists in the NEW database
        await newPgPool.query(createTableSQL);
        console.log(`✅ Table '${tableName}' checked/created in NEW NeonTech database.`);

        // Step 2: Fetch data from the OLD database
        const { rows } = await oldPgPool.query(`SELECT userid, username, COALESCE(count, 0) AS count FROM ${tableName}`);
        console.log(`📥 Retrieved ${rows.length} records from OLD NeonTech database.`);

        // Step 3: Insert data into the NEW database
        const insertQuery = `
            INSERT INTO bumps (userid, username, count)
            VALUES ($1, $2, $3)
            ON CONFLICT (userid)
            DO UPDATE SET
                username = EXCLUDED.username,
                count = EXCLUDED.count
        `;

        for (const row of rows) {
            try {
                await newPgPool.query(insertQuery, [row.userid, row.username, row.count]);
            } catch (insertErr) {
                console.error(`❌ Error inserting userID '${row.userid}' into NEW database:`, insertErr.message);
            }
        }

        console.log(`✅ Data migrated successfully for table '${tableName}'.`);
    } catch (err) {
        console.error(`❌ Error migrating table '${tableName}':`, err.message);
    }
}

(async () => {
    console.log("🚀 Starting full migration from OLD NeonTech DB to NEW NeonTech DB...");

    await migrateTable();

    console.log("🎉 Migration complete! Closing connections...");
    await oldPgPool.end();
    await newPgPool.end();
})();