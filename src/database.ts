/** @format */

import fs from 'fs/promises';
import { compress, uncompress } from 'snappy';
import type { Metafile, Subscriber } from './types/channelType';
console.log('checking for data directory');
await fs.readdir('data').catch(async (e) => {
  console.log(
    "There wasnt a data dir so we're making it now. The original error: " + e
  );
  await fs.mkdir('data');
  console.log('Data directory has been made.');
});
console.log('checking for data/meta.json');
await fs.stat('data/meta.json').catch(async (e) => {
  console.log(
    "There wasnt a data/meta.json file so we're making it now. The original error: " +
      e
  );
  await fs.writeFile(
    'data/meta.json',
    JSON.stringify({
      youtube_channels: [],
      subscribes: [],
    })
  );
  console.log('data/meta.json file has been made.');
});

const metaFile = Bun.file('data/meta.json');
const metaFile2 = Bun.file('data/meta_uncompressed.json');
const { youtube_channels, subscribes }: Metafile = await metaFile.json().catch(console.error)??await metaFile2.json().catch(console.error);
function getYTChannel(id: string) {
  return youtube_channels.find((record) => record.channel_id == id);
}
function getYTChannelIndex(id: string) {
  return youtube_channels.findIndex((record) => record.channel_id == id);
}
function getYTChannelSubscribers(id: string) {
  const getChannel = getYTChannel(id);
  if (!getChannel) return null;
  return getChannel.subscriberIDs.map((id: string) => {
    const getRecord = getSubscriber(id);
    return getRecord;
  });
}
function getSubscriber(subscriberID: string) {
  return subscribes.find((record) => record.subscriberID == subscriberID);
}
function getSubscriberNoSubID(discord_channel: string, channel_ID: string) {
  return subscribes.find(
    (record: Subscriber) =>
      record.discord_channel == discord_channel &&
      record.channel_id == channel_ID
  );
}
function isSubscribed(channel_id: string, discord_channel: string) {
  const getSub = subscribes?.findIndex(
    (record) =>
      record?.discord_channel == discord_channel &&
      record?.channel_id == channel_id
  );
  return getSub != -1;
}
function subscribe(
  channel_ID: string,
  isGuild: boolean,
  discord_channel: string,
  user_id: string,
  guild_id?: string,
  user_apps?: boolean,
  user_app_messageID?: string
) {
  const isSub = isSubscribed(channel_ID, discord_channel);
  if (isSub == true) return false;
  const checkChannel = getYTChannelIndex(channel_ID);
  const generateSubscriberID = crypto.randomUUID();
  if (checkChannel == -1) {
    youtube_channels.push({
      channel_id: channel_ID,
      subscriberIDs: [generateSubscriberID],
    });
  } else {
    youtube_channels[checkChannel].subscriberIDs.push(generateSubscriberID);
  }
  subscribes.push({
    subscriberID: generateSubscriberID,
    channel_id: channel_ID,
    isGuild,
    discord_channel,
    user_id,
    when: new Date().toISOString(),
    guild_id: isGuild ? guild_id : undefined,
    user_apps: user_apps == true ? true : false,
    user_app_messageID: user_apps == true ? user_app_messageID : undefined,
  });
  return true;
}
function unsubscribe(channel_ID: string, discord_channel: string) {
  // dont check for channel because sometimes people try to untrack banned / terminated channels which the ytAPI doesnt show.
  if (isSubscribed(channel_ID, discord_channel) == false) return false;
  const checkChannel = getYTChannelIndex(channel_ID);
  if (checkChannel == -1) return false;
  const getSubscriberID = getSubscriberNoSubID(discord_channel, channel_ID);
  if (!getSubscriberID?.subscriberID) return false;
  const getSubIndex = youtube_channels[checkChannel].subscriberIDs.findIndex(
    (record) => record == getSubscriberID?.subscriberID
  );
  const getSubRecordIndex = subscribes.findIndex(
    (record) => record.subscriberID == getSubscriberID?.subscriberID
  );
  if (getSubIndex != -1)
    // remove the subscription
    youtube_channels[checkChannel].subscriberIDs.splice(getSubIndex, 1);
  if (getSubRecordIndex != -1) subscribes.splice(getSubRecordIndex, 1);
  return true;
}
function getTrackCount(_id: string, isGuild: boolean) {
  return subscribes.filter((rec) =>
    isGuild == true ? rec.guild_id == _id : rec.user_id == _id
  ).length;
}
function getTrackCountTextChannel(_id: string) {
  return subscribes.filter((rec) => rec.discord_channel == _id).length;
}
function getGlobalTrackCount() {
  return subscribes.length;
}
let updatePossible = true;
let lastSaveTime = 0;
async function refreshFile() {
  if (updatePossible == false) return;
  try {
    const start = performance.now();
    lastSaveTime = start;
    updatePossible = false;
    const jsonifiedData = JSON.stringify({ youtube_channels, subscribes });
    await Bun.write('data/meta_temporary.json', jsonifiedData).catch(
      console.error
    );
    const rd = await Bun.file('data/meta_temporary.json')
      .json()
      .catch(console.error);
    if (!rd)
      return console.log('For some reason, data/meta_temporary.json corrupted');
    await fs
      .copyFile('data/meta_temporary.json', 'data/meta.json')
      .catch(console.error); // so that it doesnt corrupt when power goes out or the app crashes
    const rd_v2 = await Bun.file('data/meta.json').json().catch(console.error); // read and parse to json to check if its actually valid json
    if (!rd_v2) {
      return console.log(
        "For some reason, data/meta.json corrupted. We hope that data/meta_temporary.json isn't corrupted, so use it to backup."
      );
    }
    // we're just gonna keep meta_temporary only for possible backups
  } catch (e) {
    console.error(e);
  } finally {
    updatePossible = true; // allow saving again
  }
}
setInterval(refreshFile, 10000); // save it every 10 seconds, it will not save if something is already saving it.
setInterval(() => {
  if (
    performance.now() - lastSaveTime > 60_000 * 10 &&
    updatePossible == false
  ) {
    updatePossible = true; // force save if it gets stuck
    console.error(
      'saving was locked for ' +
        Math.floor(performance.now() - lastSaveTime) +
        'ms, so we forced it to work again. this should rarely happen though...'
    );
  }
}, 10000);

export {
  getYTChannel,
  getYTChannelSubscribers,
  getSubscriber,
  getTrackCount,
  getTrackCountTextChannel,
  getGlobalTrackCount,
  isSubscribed,
  subscribe,
  unsubscribe,
  youtube_channels,
  subscribes,
};
