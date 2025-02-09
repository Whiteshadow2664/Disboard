const { Client, EmbedBuilder } = require('discord.js');
const { Pool } = require('pg');

let pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    idleTimeoutMillis: 30000,  // Close idle connections after 30s
    connectionTimeoutMillis: 5000  // Ensures quick reconnection
});

// Step 1: Place this function just after the pool connection setup
async function createTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS mod_rank (
                user_id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                points INT DEFAULT 0,
                joined_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ mod_rank table checked/created.');
    } catch (error) {
        console.error('❌ Error creating mod_rank table:', error);
    }
}

// Step 2: Call the function right after the pool setup
createTable();  // Ensure table exists on startup

const BUMP_BOT_ID = '735147814878969968';
const BUMP_MESSAGE = 'Thx for bumping our Server! We will remind you in 2 hours!';

/**
 * Keeps the database connection alive by running a query every 5 minutes.
 */
function keepDBAlive() {
    setInterval(async () => {
        try {
            await pool.query('SELECT 1');  // Simple query to prevent Neon from terminating the connection
            
        } catch (error) {
            console.error('Error keeping DB alive:', error);
        }
    }, 5 * 60 * 1000); // Runs every 5 minutes
}
keepDBAlive(); // Start keep-alive function

/**
 * Handles unexpected database connection errors and reconnects.
 */
pool.on('error', async (err) => {
    console.error('Unexpected DB connection error:', err);
    await pool.end();  // Close the current pool
    pool = new Pool({ 
        connectionString: process.env.DATABASE_URL, 
        ssl: { rejectUnauthorized: false },
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
    });
    console.log('Reconnected to database.');
});

/**
 * Updates the moderator's rank when they send a message.
 */
async function updateModRank(userId, username, guild) {
    try {
        const moderatorRole = guild.roles.cache.find(role => role.name.toLowerCase() === 'moderator');
        const member = guild.members.cache.get(userId);

        if (!moderatorRole || !member || !member.roles.cache.has(moderatorRole.id)) return;

        const client = await pool.connect();
        try {
            await client.query(`
                INSERT INTO mod_rank (user_id, username, points, joined_at)
                VALUES ($1, $2, 1, NOW())
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    username = EXCLUDED.username,
                    points = mod_rank.points + 1
            `, [userId, username]);
        } finally {
            client.release(); // Release connection back to the pool
        }

    } catch (error) {
        console.error('Error updating mod rank:', error);
    }
}

/**
 * Tracks bump points when a bump message is detected.
 */
async function trackBumpingPoints(message) {
    if (message.author.id !== BUMP_BOT_ID || !message.content.startsWith(BUMP_MESSAGE)) return;

    const mentionedUser = message.mentions.users.first();
    if (!mentionedUser) return;

    try {
        const client = await pool.connect();
        try {
            await client.query(`
                INSERT INTO mod_rank (user_id, username, points, joined_at)
                VALUES ($1, $2, 3, NOW())
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    username = EXCLUDED.username,
                    points = mod_rank.points + 3
            `, [mentionedUser.id, mentionedUser.username]);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error tracking bump points:', error);
    }
}

/**
 * Displays the moderator leaderboard.
 */
async function execute(message) {
    try {
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT user_id, username, points, joined_at,
                    (DATE_PART('day', NOW() - joined_at) + 1) AS days_as_mod
                FROM mod_rank 
                WHERE points > 0 
                ORDER BY points DESC
            `);

            if (result.rows.length === 0) {
                return message.channel.send('No moderator activity recorded yet.');
            }

            let leaderboard = '**Moderator Leaderboard**\n';
            result.rows.forEach((row, index) => {
                const avgPoints = (row.points / row.days_as_mod).toFixed(2);
                leaderboard += `**#${index + 1}** | **${row.days_as_mod} Days** | **${row.username}** - **P:** ${row.points} | **AVG:** ${avgPoints}\n`;
            });

            const embed = new EmbedBuilder()
                .setColor('#acf508')
                .setTitle('Moderator Leaderboard')
                .setDescription(leaderboard)
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error fetching mod leaderboard:', error);
        message.channel.send('Error retrieving leaderboard.');
    }
}

module.exports = { updateModRank, trackBumpingPoints, execute };