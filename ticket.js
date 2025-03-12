const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  name: 'ticket',
  description: 'Create a support ticket.',
  async execute(message) {
    try {
      // Find the category named "Channels"
      const category = message.guild.channels.cache.find(
        (c) => c.name === "Channels" && c.type === ChannelType.GuildCategory
      );

      if (!category) {
        return message.channel.send("Error: Category 'Channels' not found. Please create it.");
      }

      // Check if a ticket already exists for the user
      const existingTicket = message.guild.channels.cache.find(
        (channel) => channel.name === `ticket-${message.author.username.toLowerCase()}`
      );

      if (existingTicket) {
        return message.channel.send(`You already have an open ticket: ${existingTicket}.`);
      }

      // Create the ticket channel inside the "Channels" category
      const ticketChannel = await message.guild.channels.create({
        name: `ticket-${message.author.username.toLowerCase()}`,
        type: ChannelType.GuildText,
        parent: category.id, // Assign the parent category
        topic: `Support Ticket for ${message.author.username}`,
        permissionOverwrites: [
          {
            id: message.guild.id, // Deny @everyone
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: message.author.id, // Allow the user
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          {
            id: message.client.user.id, // Allow the bot
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ManageMessages,
              PermissionFlagsBits.AddReactions,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageChannels,
            ],
          },
        ],
      });

      // Get the Moderator role
      const modRole = message.guild.roles.cache.find(role => role.name === 'Moderator');
      if (!modRole) {
        return message.channel.send('Moderator role not found. Please ensure it exists.');
      }

      // Create the ticket embed
      const embed = new EmbedBuilder()
        .setTitle('Support Ticket Created')
        .setDescription(
          `Hello ${message.author.username}, how can we assist you today?\n\nReact with 🛑 to close this ticket.`
        )
        .setColor('#acf508');

      // Send the embed in the ticket channel
      const ticketMessage = await ticketChannel.send({ embeds: [embed] });

      // Add a reaction to the message
      await ticketMessage.react('🛑');

      // Notify the user
      message.channel.send(`Your ticket has been created: ${ticketChannel}. A staff member will assist you shortly!`);

      // Tag the Moderator role after 5 minutes
      setTimeout(async () => {
        try {
          const channel = message.guild.channels.cache.get(ticketChannel.id);
          if (channel) {
            await channel.send(`Hey <@&${modRole.id}>, please assist ${message.author.username} with their ticket.`);
          }
        } catch (timeoutError) {
          message.channel.send('Error tagging Moderator role.');
        }
      }, 5 * 60 * 1000); // 5 minutes

      // Set up the reaction collector for ticket closure
      const filter = (reaction, user) => {
        return reaction.emoji.name === '🛑' && user.id === message.author.id;
      };

      const collector = ticketMessage.createReactionCollector({
        filter,
        time: 86400000, // 24 hours
      });

      collector.on('collect', async (reaction, user) => {
        try {
          const channel = message.guild.channels.cache.get(ticketChannel.id);
          if (channel) {
            await channel.send(`Ticket is closing...`);
            await channel.delete();
            message.channel.send(`Ticket for ${message.author.username} has been closed.`);
          }
        } catch (closeError) {
          message.channel.send('There was an error closing your ticket.');
        }
      });

      collector.on('end', async (collected, reason) => {
        try {
          if (reason === 'time') {
            const channel = message.guild.channels.cache.get(ticketChannel.id);
            if (channel) {
              await channel.send(`Ticket expired and will be closed.`);
              await channel.delete();
              message.channel.send(`Ticket for ${message.author.username} expired and has been automatically closed.`);
            }
          }
        } catch (deleteError) {
          message.channel.send('Error during ticket expiration.');
        }
      });

    } catch (error) {
      message.channel.send(`There was an error creating your ticket: ${error.message}`);
    }
  },
};