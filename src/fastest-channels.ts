/** @format */

import djs_client from './client';
import { subscribes } from './database';
import { getChannels } from './youtube-data-api-v3/functions';
import { QuickMakeEmbed, howLong } from './utilities';
function getCurrentMilestone(input: number) {
  const count = input.toString();
  const first3 = count.slice(0, 2);
  const last = count.slice(2);
  const abbr = new Array(last.length).fill(0).join('');
  return parseFloat(first3 + abbr);
}
function getCurrentMilestoneSmaller(input: number) {
  const count = input.toString();
  const first3 = count.slice(0, 1);
  const last = count.slice(1);
  const abbr = new Array(last.length).fill(0).join('');
  return parseFloat(first3 + abbr);
}
function nextAbbreviation(input: number) {
  const count = input.toString();
  let first3 = count.slice(0, 2);
  first3 = (parseInt(first3) + 1).toString();
  const last = count.slice(2);
  const abbr = new Array(last.length).fill(0).join('');
  return parseFloat(first3 + abbr);
}
function nextAbbreviationSmaller(input: number) {
  const count = input.toString();
  let first3 = count.slice(0, 1);
  first3 = (parseInt(first3) + 1).toString();
  const last = count.slice(1);
  const abbr = new Array(last.length).fill(0).join('');
  return parseFloat(first3 + abbr);
} // I FORGOT IT SPAMS <100K LMAO
function nextAbbreviationStep(input: number) {
  const count = input.toString();
  let first3 = count.slice(0, 3);
  first3 = (parseInt(first3) + 1).toString();
  const last = count.slice(3);
  const abbr = new Array(last.length).fill(0).join('');
  return parseFloat(first3 + abbr);
}
function connect() {
  const ws = new WebSocket(`${process.env.FASTEST_CHANNELS_WS}`);

  // Subscribe to some channels or send an initial message
  ws.onopen = () => {
    // ok it works
    console.log('Socket has been opened.');
  };

  // Handle incoming messages
  ws.onmessage = async (e) => {
    try {
      const data = await JSON.parse(`${e.data}`);
      const currentAPICount = parseInt(data.new.subscribers);
      const currentMilestone =
        currentAPICount < 10_000_000
          ? getCurrentMilestoneSmaller(currentAPICount)
          : getCurrentMilestone(currentAPICount);
      const nextAPICount = nextAbbreviationStep(currentAPICount);
      const milestoneAPICount =
        currentAPICount < 10_000_000
          ? nextAbbreviationSmaller(currentAPICount)
          : nextAbbreviation(currentAPICount);
      const isMilestone =
        (nextAPICount == milestoneAPICount && data.new.sub_rate > 0) ||
        (currentMilestone == currentAPICount && data.new.sub_rate > 0);
      if (isMilestone && data.new.subscribers >= 100_000) {
        const typeOfMilestone =
          nextAPICount == milestoneAPICount && data.new.sub_rate > 0;
        // if typeOfMilestone == true then its upcoming and if false then was just hit
        const [channel] = await getChannels(data.new.channel_id);
        const currentDate = new Date(data.new.subscriber_hit);
        const lastDate = new Date(data.old.subscriber_hit ?? 0);
        const timeTook = currentDate.getTime() - lastDate.getTime();
        const quickie = QuickMakeEmbed(
          {
            color: typeOfMilestone ? 'Blurple' : 'Green',
            title: `${
              typeOfMilestone ? '👀 Upcoming milestone' : '🏆 Milestone'
            } (${
              typeOfMilestone
                ? nextAPICount.toLocaleString('en-US')
                : currentMilestone.toLocaleString('en-US')
            }) for ${channel.title}`.slice(0, 255),
            description: `You can disable these with **/disable_milestones**`,
          },
          undefined,
          djs_client
        )
          .addFields({
            name: 'Last Subscriber Count',
            value: `${
              data.old.subscribers?.toLocaleString('en-US') ?? 'None'
            } _ _`,
            inline: true,
          })
          .addFields({
            name: 'Current Subscriber Count',
            value: `${
              data.new.subscribers?.toLocaleString('en-US') ?? 'None'
            } _ _`,
            inline: true,
          })
          .addFields({
            name: 'Average subs / day',
            value: `${
              Math.floor(data.new.sub_rate || 0).toLocaleString('en-US') ??
              'None'
            } (${
              (data.new.sub_rate ?? 0) - (data.old.sub_rate ?? 0) >= 0
                ? '+'
                : ''
            }${
              Math.floor(
                (data.new.sub_rate ?? 0) - (data.old.sub_rate ?? 0) || 0
              ).toLocaleString('en-US') ?? 'None'
            }) _ _`,
            inline: true,
          })
          .addFields({
            name: `${data.old.subscribers?.toLocaleString('en-US') ?? 'None'}`,
            value: `<t:${Math.floor(
              lastDate.getTime() / 1000
            )}:R> <t:${Math.floor(lastDate.getTime() / 1000)}:T> _ _`,
            inline: true,
          })
          .addFields({
            name: `${data.new.subscribers?.toLocaleString('en-US')}`,
            value: `<t:${Math.floor(
              currentDate.getTime() / 1000
            )}:R> <t:${Math.floor(currentDate.getTime() / 1000)}:T> _ _`,
            inline: true,
          })
          .addFields({
            name: 'How long',
            value: `${howLong(timeTook)} _ _`,
            inline: true,
          })
          .setURL('https://www.youtube.com/channel/' + channel.channel_id)
          .setAuthor({
            iconURL:
              channel?.avatar ||
              'https://cdn.discordapp.com/embed/avatars/0.png',
            name: `${
              channel?.handle ?? channel.title ?? channel.channel_id
            }`.slice(0, 50),
          });
        const timeTillCool = Math.floor(
          Date.now() / 1000 +
            (milestoneAPICount - currentAPICount) /
              (parseInt(data.new.sub_rate) / 86400)
        );
        if (typeOfMilestone)
          quickie.addFields({
            name:
              'Expected time to hit ' +
              milestoneAPICount.toLocaleString('en-US'),
            value: `<t:${timeTillCool}:R> <t:${timeTillCool}:T> _ _`,
            inline: true,
          });

        for (const i of subscribes.filter(
          (a) => a.channel_id == 'milestones'
        )) {
          if (!djs_client.channels.cache?.get(i.discord_channel))
            await djs_client.channels
              .fetch(i.discord_channel)
              .catch(console.error);
          const DiscordChannel = djs_client.channels.cache?.get(
            i.discord_channel
          );
          if (DiscordChannel?.isTextBased())
            DiscordChannel.send({
              embeds: [quickie],
            }).catch(console.error);
        }
      } else if (data?.new?.sub_rate > 100_000) {
        console.log(data.new.sub_rate, 'new subrate update!');
        // will make possible to change from 50K to higher or a bit lower. Not now, we are still testing this.
        const [channel] = await getChannels(data.new.channel_id);
        const currentDate = new Date(data.new.subscriber_hit);
        const lastDate = new Date(data.old.subscriber_hit ?? 0);
        const timeTook = currentDate.getTime() - lastDate.getTime();
        const quickie = QuickMakeEmbed(
          {
            color: data?.old?.sub_rate < 100_000 ? 'Green' : 'Blurple',
            title:
              `🔥 Fast channel sub count update for ${channel.title}`.slice(
                0,
                255
              ),
            description: `You can disable these with **/disable_fastestchannels**`,
          },
          undefined,
          djs_client
        )
          .addFields({
            name: 'Old Subscriber Count',
            value: `${
              data.old.subscribers?.toLocaleString('en-US') || 'None'
            } _ _`,
            inline: true,
          })
          .addFields({
            name: 'New Subscriber Count',
            value: `${
              data.new.subscribers?.toLocaleString('en-US') ?? 'None'
            } _ _`,
            inline: true,
          })
          .addFields({
            name: 'Average subs / day',
            value: `${
              Math.floor(data.new.sub_rate || 0).toLocaleString('en-US') ??
              'None'
            } (${
              (data.new.sub_rate ?? 0) - (data.old.sub_rate ?? 0) >= 0
                ? '+'
                : ''
            }${
              Math.floor(
                (data.new.sub_rate ?? 0) - (data.old.sub_rate ?? 0) || 0
              ).toLocaleString('en-US') ?? 'None'
            }) _ _`,
            inline: true,
          })
          .addFields({
            name: `${data.old.subscribers?.toLocaleString('en-US') ?? 'None'}`,
            value: `<t:${Math.floor(
              lastDate.getTime() / 1000
            )}:R> <t:${Math.floor(lastDate.getTime() / 1000)}:T> _ _`,
            inline: true,
          })
          .addFields({
            name: `${data.new.subscribers?.toLocaleString('en-US')}`,
            value: `<t:${Math.floor(
              currentDate.getTime() / 1000
            )}:R> <t:${Math.floor(currentDate.getTime() / 1000)}:T> _ _`,
            inline: true,
          })
          .addFields({
            name: 'How long',
            value: `${howLong(timeTook)} _ _`,
            inline: true,
          })
          .setURL('https://www.youtube.com/channel/' + channel.channel_id)
          .setAuthor({
            iconURL:
              channel?.avatar ||
              'https://cdn.discordapp.com/embed/avatars/0.png',
            name: `${
              channel?.handle ?? channel.title ?? channel.channel_id
            }`.slice(0, 50),
          });

        for (const i of subscribes.filter(
          (a) => a.channel_id == 'fastestchannels'
        )) {
          if (!djs_client.channels.cache?.get(i.discord_channel))
            await djs_client.channels
              .fetch(i.discord_channel)
              .catch(console.error);
          const DiscordChannel = djs_client.channels.cache?.get(
            i.discord_channel
          );
          if (DiscordChannel?.isTextBased())
            DiscordChannel.send({
              embeds: [quickie],
            }).catch(console.error);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle connection closure
  ws.onclose = (e) => {
    console.log(
      'Socket is closed. Reconnect will be attempted in 1 second.',
      e.reason
    );
    setTimeout(() => {
      connect(); // Reconnect after 1 second
    }, 1000);
  };

  // Handle errors
  ws.onerror = (err) => {
    console.error(
      'Socket encountered an error:',
      err.message,
      'Closing socket'
    );
    ws.close();
  };
}
if (process?.env?.FASTEST_CHANNELS_WS) {
  // Start the initial connection
  console.log('waiting 5s');
  setTimeout(() => connect(), 5000);
}
