const { Pool } = require('pg');
require('dotenv').config();

// Connect to NeonTech
const neonPool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL, // Add to Render env vars
    ssl: { rejectUnauthorized: false }
});

async function exportData() {
    try {
        const client = await neonPool.connect();

        // Export mod_rank
        const modRankData = await client.query("SELECT * FROM mod_rank");
        console.log("mod_rank Data:", JSON.stringify(modRankData.rows, null, 2));

        // Export leaderboard
        const leaderboardData = await client.query("SELECT * FROM leaderboard");
        console.log("leaderboard Data:", JSON.stringify(leaderboardData.rows, null, 2));

        client.release();
    } catch (err) {
        console.error("Error exporting data:", err);
    } finally {
        process.exit();
    }
}

exportData();