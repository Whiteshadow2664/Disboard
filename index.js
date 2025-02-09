const { Client, Intents } = require('discord.js');
const cron = require('node-cron');  // To run tasks on a schedule

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const channelID = '1337115282761711721';  // The channel ID you specified
const targetUserID = '540129267728515072';  // Replace with actual Discord user ID if needed

// Bot login token
const token = 'YOUR_BOT_TOKEN'; // Replace with your actual bot token

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