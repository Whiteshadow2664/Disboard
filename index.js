const { Client, GatewayIntentBits } = require('discord.js');
const cron = require('node-cron');  // To run tasks on a schedule
const express = require('express');  // Express to create a web server

// Create an express app
const app = express();
const port = 3000;

// Your Discord bot setup
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

const channelID = '1337115282761711721';  // The channel ID you specified
const targetUserID = '540129267728515072';  // Replace with actual Discord user ID if needed

// Bot login token from environment variable
const token = process.env.BOT_TOKEN; // Make sure to set the BOT_TOKEN environment variable in Render

if (!token) {
    console.error('Bot token not found in environment variables');
    process.exit(1);  // Exit the process if the token is not found
}

// When the bot is ready
client.once('ready', () => {
    console.log('Bot is online!');
    
    // Schedule a task to send the message every 5 minutes
    cron.schedule('*/2 * * * *', () => {
        sendBumpMessage();
    });
});

// Function to send bump message
function sendBumpMessage() {
    const channel = client.channels.cache.get(channelID);
    if (channel) {
        channel.send(`Thx for bumping our Server! We will remind you in 2 hours! <@${targetUserID}>`);
    } else {
        console.log('Channel not found!');
    }
}

// Set up a simple route to confirm server is up
app.get('/', (req, res) => {
    res.send('Bot is running!');
});

// Start the web server
app.listen(port, () => {
    console.log(`Web server listening at http://localhost:${port}`);
});

// Log in to Discord
client.login(token);