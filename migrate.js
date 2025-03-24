require('dotenv').config();
const { Pool } = require('pg');

// Old NeonTech database (source)
const oldNeonPool = new Pool({ 
    connectionString: process.env.OLD_NEON_DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

// New NeonTech database (destination)
const newNeonPool = new Pool({ 
    connectionString: process.env.NEW_NEON_DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

async function migrateTable(tableName, columns) {
    try {
        const createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`;
        await newNeonPool.query(createTableQuery);
        console.log(`✅ Table '${tableName}' checked/created in the new NeonTech database.`);

        const { rows } = await oldNeonPool.query(`SELECT * FROM ${tableName}`);
        console.log(`📥 Fetching data from '${tableName}'... Found ${rows.length} records.`);

        for (const row of rows) {
            const columnNames = Object.keys(row).join(', ');
            const values = Object.values(row);
            const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

            const insertQuery = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders}) ON CONFLICT (userId) DO NOTHING`;
            await newNeonPool.query(insertQuery, values);
        }

        console.log(`✅ Data migrated successfully for '${tableName}'.`);
    } catch (err) {
        console.error(`❌ Error migrating '${tableName}':`, err);
    }
}

(async () => {
    console.log("🚀 Starting migration from old NeonTech database to new NeonTech database...");

    await migrateTable('bumps', `
        userId TEXT PRIMARY KEY,
        username TEXT,
        count INTEGER DEFAULT 0
    `);

    console.log("🎉 Migration complete! Closing connections...");
    await oldNeonPool.end();
    await newNeonPool.end();
})();