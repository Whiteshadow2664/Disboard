const { Client, GatewayIntentBits } = require('discord.js');
const cron = require('node-cron');  // To run tasks on a schedule

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

client.once('ready', () => {
    console.log('Bot is online!');
    
    // Schedule a task to send the message every 5 minutes
    cron.schedule('*/5 * * * *', () => {
        sendBumpMessage();
    });
});

function sendBumpMessage() {
    const channel = client.channels.cache.get(channelID);
    if (channel) {
        channel.send(`Thx for bumping our Server! We will remind you in 2 hours! <@${targetUserID}>`);
    } else {
        console.log('Channel not found!');
    }
}

client.login(token);