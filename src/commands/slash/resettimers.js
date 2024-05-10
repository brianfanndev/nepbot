const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { CronJob } = require("cron");
const { DateTime } = require("luxon");

const timestampRegex = /\d?\d:\d\d/g;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resettimer")
    .setDescription("Resets all timers. Use this in case the timers stop."),

  async startTimer(timer, interaction) {
    const job = new CronJob(
      "* */10 * * * *",
      () => {},
      null,
      true,
      "America/Los_Angeles"
    );

    const updateTimer = async () => {
      const channel = await interaction.guild.channels.fetch(timer.channelId);

      if (!channel) {
        redis.deleteTimer(interaction.guild.id, timer.channelId);
        job.stop();
      } else {
        const now = DateTime.now();

        const nextTimestamp = timer.timestamps
          .map((timestamp) => {
            let date = DateTime.now();
            const [hours, minutes] = timestamp.split(":");
            date = date.set({
              hour: parseInt(hours),
              minute: parseInt(minutes),
              second: 0,
              millisecond: 0,
            });

            if (date < now) date = date.plus({ days: 1 });

            return date;
          })
          .sort()[0];

        const diff = nextTimestamp.diff(now, ["hours", "minutes"]);

        const duration =
          diff.hours > 0
            ? `${diff.hours}h`
            : `${Math.ceil(diff.minutes / 10) * 10}m`;

        channel.setName(`${timer.channelName} (${duration})`);
      }
    };

    job.addCallback(() => {
      updateTimer();
    });

    updateTimer();
  },

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

    for (const timer of activeTimers) {
      this.startTimer(timer, interaction);
    }

    await interaction.reply(`Successfully restarted timers.`);
  },
};
