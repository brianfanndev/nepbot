const RedisConstants = require("../constants/redis-constants");

const redisServiceFactory = async () => {
  const { createClient } = require("redis");
  client = await createClient({
    url: `redis://${process.env.REDIS_URL}:${process.env.REDIS_PORT}`,
  })
    .on("error", (err) => console.log("Redis Client Error", err))
    .connect();

  return {
    setTimerCategory: async (guildId, channelId) => {
      await client.HSET(guildId, RedisConstants.TIMER_CHANNEL_ID, channelId);
    },
    getTimerCategory: async (guildId) => {
      return await client.HGET(guildId, RedisConstants.TIMER_CHANNEL_ID);
    },
    getAllTimers: async (guildId) => {
      let timers = [];

      for await (const { field, value } of client.hScanIterator(guildId)) {
        if (field.indexOf(`${RedisConstants.TIMER}:`) !== -1) {
          timers.push(JSON.parse(value));
        }
      }

      return timers;
    },
    getTimer: async (guildId, channelId) => {
      const timersJSON = await client.hGet(
        guildId,
        `${RedisConstants.TIMER}:${channelId}`
      );
      return JSON.parse(timersJSON)?.data ?? [];
    },
    setTimer: async (guildId, channelId, timerObj) => {
      await client.hSet(
        guildId,
        `${RedisConstants.TIMER}:${channelId}`,
        JSON.stringify(timerObj)
      );
    },
    deleteTimer: async (guildId, channelId) => {
      await client.hDel(guildId, `${RedisConstants.TIMER}:${channelId}`);
    },
  };
};
const redisService = redisServiceFactory();
module.exports = redisService;
