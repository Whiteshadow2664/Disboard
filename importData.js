const { Pool } = require('pg');
require('dotenv').config();

// Connect to Supabase
const supabasePool = new Pool({
    connectionString: process.env.SUPABASE_DATABASE_URL, // Add to Render env vars
    ssl: { rejectUnauthorized: false }
});

// Paste JSON data from export logs here
const modRankData = [...]; // Replace with mod_rank JSON
const leaderboardData = [...]; // Replace with leaderboard JSON

async function importData() {
    try {
        const client = await supabasePool.connect();

        // Insert mod_rank data
        for (let row of modRankData) {
            await client.query(
                `INSERT INTO mod_rank (id, username, points) VALUES ($1, $2, $3)`,
                [row.id, row.username, row.points]
            );
        }

        // Insert leaderboard data
        for (let row of leaderboardData) {
            await client.query(
                `INSERT INTO leaderboard (id, username, language, level, quizzes, points) VALUES ($1, $2, $3, $4, $5, $6)`,
                [row.id, row.username, row.language, row.level, row.quizzes, row.points]
            );
        }

        console.log("Data imported successfully!");

        client.release();
    } catch (err) {
        console.error("Error importing data:", err);
    } finally {
        process.exit();
    }
}

importData();