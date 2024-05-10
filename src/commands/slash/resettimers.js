const { SlashCommandBuilder } = require("discord.js");
const Timer = require("../../handlers/timerhandler");

const timestampRegex = /\d?\d:\d\d/g;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resettimer")
    .setDescription("Resets all timers. Use this in case the timers stop."),

  async execute(interaction) {
    if (!this.redis) this.redis = await require("../../services/redis");

    const guild = interaction.guild;
    const timers = await this.redis.getAllTimers(guild.id);
    const channels = await interaction.guild.channels.fetch();
    const channelIds = channels.map((channel) => channel.id);

    let activeTimers = [];
    let inactiveTimers = [];

    timers.forEach((timer) => {
      if (channelIds.includes(timer.channelId)) activeTimers.push(timer);
      else inactiveTimers.push(timer);
    });

    for await (const timer of inactiveTimers) {
      await this.redis.deleteTimer(guild.id, timer.channelId);
    }

    for await (const timer of activeTimers) {
      await Timer.startTimer(timer, interaction);
    }

    await interaction.reply(`Successfully restarted timers.`);
  },
};
