const RedisConstants = require("../constants/redis-constants");
const { createClient } = require("redis");

const redisServiceFactory = () => {
  client = createClient({
    url: `redis://${process.env.REDIS_URL}:${process.env.REDIS_PORT}`,
  }).on("error", (err) => console.log("Redis Client Error", err));

  getTimerKey = (channelId) => `${RedisConstants.TIMER}:${channelId}`;

  connect = async () => {
    if (!client.isOpen || !client.isReady) await client.connect();
  };

  return {
    setTimerCategory: async (guildId, channelId) => {
      await connect();
      await client.HSET(guildId, RedisConstants.TIMER_CHANNEL_ID, channelId);
    },
    getTimerCategory: async (guildId) => {
      await connect();
      return await client.HGET(guildId, RedisConstants.TIMER_CHANNEL_ID);
    },
    getAllTimers: async (guildId) => {
      await connect();
      let timers = [];

      for await (const { field, value } of client.hScanIterator(guildId)) {
        if (field.indexOf(`${RedisConstants.TIMER}:`) !== -1) {
          timers.push(JSON.parse(value));
        }
      }

      return timers;
    },
    getTimer: async (guildId, channelId) => {
      await connect();
      const timersJSON = await client.hGet(guildId, getTimerKey(channelId));
      return JSON.parse(timersJSON);
    },
    setTimer: async (guildId, channelId, timerObj) => {
      await connect();
      await client.hSet(
        guildId,
        getTimerKey(channelId),
        JSON.stringify(timerObj)
      );
    },
    deleteTimer: async (guildId, channelId) => {
      await connect();
      await client.hDel(guildId, getTimerKey(channelId));
    },
  };
};

module.exports = redisServiceFactory();
