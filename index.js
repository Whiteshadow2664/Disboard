require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// Store last bump time
const bumpCooldown = new Map();
const BUMP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// When bot is ready
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    // Register slash command
    const commands = [
        new SlashCommandBuilder().setName('bump').setDescription('Bump the server!')
    ].map(command => command.toJSON());

    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (guild) {
        await guild.commands.set(commands);
        console.log('Bump command registered!');
    }
});

// Handle /bump command
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'bump') {
        const now = Date.now();
        const lastBump = bumpCooldown.get(interaction.guildId) || 0;

        if (now - lastBump < BUMP_INTERVAL) {
            const remainingTime = Math.ceil((BUMP_INTERVAL - (now - lastBump)) / 1000);
            await interaction.reply(`⏳ You can bump again in ${remainingTime} seconds.`);
        } else {
            bumpCooldown.set(interaction.guildId, now);

            const embed = new EmbedBuilder()
                .setTitle("DISBOARD: The Public Server List")
                .setDescription(`Bump done! :thumbsup:\nCheck it out [on DISBOARD](${process.env.DISBOARD_LINK}).`)
                .setColor("#5865F2");

            await interaction.reply({ embeds: [embed] });
        }
    }
});

// Login bot
client.login(process.env.TOKEN);