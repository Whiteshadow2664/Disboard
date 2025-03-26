const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  setup: async (client) => {
    const channel = await client.channels.fetch('YOUR_CHANNEL_ID'); // Set ticket channel ID
    if (!channel) return console.error('Ticket setup channel not found!');

    const embed = new EmbedBuilder()
      .setTitle('🎫 Support Ticket System')
      .setDescription('Click the button below to create a support ticket.')
      .setColor('#acf508');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('create_ticket').setLabel('Create Ticket').setStyle(ButtonStyle.Primary)
    );

    await channel.send({ embeds: [embed], components: [row] });
  },

  createTicket: async (interaction) => {
    await interaction.deferReply({ ephemeral: true });

    const category = interaction.guild.channels.cache.find((c) => c.name === 'Channels' && c.type === ChannelType.GuildCategory);
    if (!category) return interaction.followUp({ content: 'Error: Category "Channels" not found.', ephemeral: true });

    if (interaction.guild.channels.cache.find((ch) => ch.name === `ticket-${interaction.user.username.toLowerCase()}`))
      return interaction.followUp({ content: 'You already have an open ticket.', ephemeral: true });

    const modRole = interaction.guild.roles.cache.find((r) => r.name === 'Moderator');
    if (!modRole) return interaction.followUp({ content: 'Moderator role not found.', ephemeral: true });

    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username.toLowerCase()}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageChannels] },
        { id: modRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      ],
    });

    const embed = new EmbedBuilder()
      .setTitle('🎟️ Support Ticket Created')
      .setDescription(`Hello ${interaction.user.username}, staff will assist you shortly.\n\nClick below to close.`)
      .setColor('#acf508');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ embeds: [embed], components: [row] });
    interaction.followUp({ content: `Your ticket has been created: ${ticketChannel}`, ephemeral: true });
  },

  closeTicket: async (interaction) => {
    if (!interaction.channel.name.startsWith('ticket-')) 
      return interaction.reply({ content: 'This is not a ticket channel!', ephemeral: true });

    await interaction.reply({ content: 'Closing ticket...', ephemeral: true });
    setTimeout(() => interaction.channel.delete(), 3000);
  },
};