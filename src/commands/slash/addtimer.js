const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { CronJob } = require("cron");
const { DateTime } = require("luxon");
const RedisConstants = require("../../constants/redis-constants");

const timestampRegex = /\d?\d:\d\d/g;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addtimer")
    .setDescription("Adds a new timer")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("The name of the timer")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("timestamps")
        .setDescription(
          "What timestamps should this timer track? e.g.: '1:00 12:00 17:00'"
        )
        .setRequired(true)
    ),

  async execute(interaction) {
    const name = interaction.options.getString("name");
    const timestampString = interaction.options.getString("timestamps");
    const timestampStringArr = timestampString
      .match(timestampRegex)
      ?.map((timeString) => timeString.padStart(5, "0"))
      .sort();

    if (!timestampStringArr) {
      await interaction.reply(
        `${timestampString} could not be parsed. Please use HH:mm format with spaces in between, e.g. "1:00 12:00 17:00".`
      );
      return;
    }

    timestampStringArr.forEach((timestamp) => {
      const [hoursString, minutesString] = timestamp.split(":");
      const hours = parseInt(hoursString);
      const minutes = parseInt(minutesString);

      if (hours > 23 || minutes > 59) {
        interaction.reply(
          `${timestampString} could not be parsed. Please use HH:mm format with spaces in between, e.g. "1:00 12:00 17:00".`
        );
        return;
      }
    });

    if (!this.redis) this.redis = await require("../../services/redis");

    const parentCategory = await this.redis.getTimerCategory(
      interaction.guild.id
    );

    const newChannel = await interaction.guild.channels.create({
      name: name,
      type: ChannelType.GuildVoice,
      parent: parentCategory,
    });

    let timerObj = {
      channelName: name,
      channelId: newChannel.id,
      timestamps: timestampStringArr,
    };

    await this.redis.setTimer(
      interaction.guild.id,
      `${RedisConstants.TIMER}:${timerObj.channelId}`,
      timerObj
    );

    const job = new CronJob(
      "* */10 * * * *",
      () => {},
      null,
      true,
      "America/Los_Angeles"
    );

    const updateTimer = async () => {
      const channel = await interaction.guild.channels.fetch(
        timerObj.channelId
      );

      if (!channel) {
        redis.hDel(
          interaction.guild.id,
          `${RedisConstants.TIMER}:${timerObj.channelId}`
        );
        job.stop();
      } else {
        const now = DateTime.now();

        const nextTimestamp = timerObj.timestamps
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

        channel.setName(`${timerObj.channelName} (${duration})`);
      }
    };

    job.addCallback(() => {
      updateTimer();
    });

    updateTimer();

    await interaction.reply(`Successfully created **${name}**.`);
  },
};
