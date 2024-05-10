const { CronJob } = require("cron");
const { DateTime } = require("luxon");

module.exports = {
  startTimer: async (timer, interaction) => {
    if (!this.redis) this.redis = await require("../services/redis");
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
};
