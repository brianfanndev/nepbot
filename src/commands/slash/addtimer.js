const { SlashCommandBuilder, ChannelType } = require("discord.js");
const Timer = require("../../handlers/timerhandler");
const redis = require("../../services/redis");

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

    const parentCategory = await redis.getTimerCategory(interaction.guild.id);

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

    await redis.setTimer(interaction.guild.id, timerObj.channelId, timerObj);

    await Timer.startTimer(timerObj, interaction);

    await interaction.reply(`Successfully created **${name}**.`);
  },
};
