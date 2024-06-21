const { SlashCommandBuilder, ChannelType } = require("discord.js");
const redis = require("../../services/redis");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("timercategory")
    .setDescription("Sets which category the bot will create timers in.")
    .addChannelOption((option) =>
      option
        .setName("category")
        .setDescription("The category to spawn channels in.")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true)
    ),
  async execute(interaction) {
    const channel = interaction.options.get("category").channel;
    await redis.setTimerCategory(interaction.guild.id, channel.id);
    await interaction.reply(
      `Successfully set the timer category to **${channel.name}**.`
    );
  },
};
