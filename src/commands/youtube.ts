/** @format */

import type { Commands } from '../types/commands';

import { searchChannel } from '../innertube/functions';

import config from '../../config';
import { QuickMakeEmbed } from '../utilities';

import { cacheSystem } from '..';
import type { Channel } from '../types/channelType';
import {
  subscribe,
  subscribes,
  unsubscribe,
  youtube_channels,
} from '../database';
import { getChannels } from '../youtube-data-api-v3/functions';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type InteractionReplyOptions,
} from 'discord.js';
const commands: Commands = {
  track: {
    data: {
      options: [
        {
          autocomplete: true,
          type: 3,
          name: 'query',
          description: 'Query to search with.',
          required: true,
        },
        {
          channel_types: [5, 0, 11],
          name: 'text_channel',
          description: 'The channel to send the notifications to.',
          required: false,
          type: 7,
        },
      ],
      // cheatsheet:
      // integration_types = basically allows the command to be used in servers / users, 0 = servers, 1 = everywhere else (use both if want everywhere)
      // contexts =
      /*NAME	TYPE	DESCRIPTION
			  GUILD	0	Interaction can be used within servers
			  BOT_DM	1	Interaction can be used within DMs with the app's bot user
			  PRIVATE_CHANNEL	2
			*/
      integration_types: [0, 1],
      contexts: [0, 1],
      name: 'track',
      description:
        'Track a channel and their subscribers here or a different channel.',
    },
    execute: async (interaction) => {
      try {
        const isDM = interaction.inGuild() == false;
        const getChannel =
          interaction.options?.get('text_channel')?.channel?.id ??
          interaction.channelId;
        const getID: string =
          interaction.options?.get('query')?.value?.toString() ??
          "(You didn't enter any channelID's";
        if (getID.length != 24 || getID.startsWith('UC') == false)
          return await interaction
            .editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: 'Incorrect YouTube channel id!',
                    description: `The channel id \`${getID}\` is not a valid channel id.`,
                  },
                  interaction
                ),
              ],
            })
            .catch(console.error);
        if (isDM == true && (config.bot.privateMessages as boolean) == false)
          return await interaction
            .editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title:
                      'Tracking channels in direct messages has been disabled.',
                    description: `If you are the owner of the bot, enable it in the \`config.ts\` file.\n\n**Aren't the owner?** Host your own version of the bot!\nJust grab the code from our [Github](<https://github.com/NiaAxern/discord-youtube-subscriber-count>), set it up and run it!`,
                  },
                  interaction
                ),
              ],
            })
            .catch(console.error);
        else if (isDM == false) {
          const hasPermissions =
            interaction.memberPermissions?.has('Administrator') ||
            interaction.memberPermissions?.has('ManageGuild') ||
            interaction.memberPermissions?.has('ManageChannels') ||
            false;
          if (hasPermissions == false)
            return await interaction.editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: "You don't have permissions",
                    description: `Here are the permissions that you need to atleast one enabled:
									**Administrator**: ${interaction.memberPermissions?.has('Administrator')}
									**ManageGuild**: ${interaction.memberPermissions?.has('ManageGuild')}
									**ManageChannels**: ${interaction.memberPermissions?.has('ManageChannels')}`,
                  },
                  interaction
                ),
              ],
            });
          const botPermissions =
            (interaction.channel
              ?.permissionsFor(interaction.client.user)
              ?.has('SendMessages') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('EmbedLinks') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('AddReactions') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('AttachFiles') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('SendMessagesInThreads')) ||
            false;

          if (botPermissions == false)
            return await interaction.editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: "The bot doesn't have permissions",
                    description: `Here are the permissions that the bot has to have enabled:
										**SendMessages**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('SendMessages')}
										**EmbedLinks**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('EmbedLinks')}
										**AddReactions**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('AddReactions')}
										**AttachFiles**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('AttachFiles')}
										**SendMessagesInThreads**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('SendMessagesInThreads')}`,
                  },
                  interaction
                ),
              ],
            });
        }
        const checkCache = await cacheSystem.get(getID).catch(() => {
          return null;
        });
        let channel: Channel =
          checkCache != null ? await JSON.parse(checkCache) : null;
        if (!checkCache) {
          const getAPI = await getChannels(getID);
          channel = getAPI[0]; // Fixes topic channels ^^
        }
        if (!channel.channel_id)
          // we got this far so everything seems to be fine!
          return await interaction
            .editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: 'Channel was not found.',
                    description: `The channel \`${getID}\` was NOT found.`,
                  },
                  interaction
                ),
              ],
            })
            .catch(console.error);

        // after everything has been successfully been done we respond with the all done message!
        let getText = interaction.client.channels.cache.get(getChannel);
        if (!getText) {
          await interaction.client.channels
            .fetch(getChannel)
            .catch(console.error);
          getText = interaction.client.channels.cache.get(getChannel);
        }
        if (!getText)
          return await interaction
            .editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: 'Something went wrong.',
                    description: `We can't find the discord channel <#${getChannel}>.\nThis should rarely happen.`,
                  },
                  interaction
                ),
              ],
            })
            .catch(console.error);
        if ((config.bot?.disableLimits as boolean) != true) {
          const checkForLimitsGuild =
            interaction.guild?.id != null
              ? subscribes.filter((a) => a?.guild_id == interaction.guild?.id)
                  .length
              : null;
          const checkForLimitsChannel =
            interaction.channel?.id != null
              ? subscribes.filter(
                  (a) => a?.discord_channel == interaction.channel?.id
                ).length // eslint-disable-line
              : null;
          //FIXME: PRETTIER BREAKS THIS! thats why it has disable line rule!
          if (
            checkForLimitsGuild != null &&
            checkForLimitsGuild >= (config.bot?.guildMax ?? 100)
          )
            return await interaction
              .editReply({
                embeds: [
                  QuickMakeEmbed(
                    {
                      color: 'Red',
                      title:
                        'This guild has hit the ' +
                        (config.bot?.guildMax ?? 100) +
                        ' channel max tracking limit', // FIXME: english is hard
                      description: `If you are the owner of the bot, increase 'guildmax' value in the \`config.ts\` file.\n\n**Aren't the owner?** Host your own version of the bot!\nJust grab the code from our [Github](<https://github.com/NiaAxern/discord-youtube-subscriber-count>), set it up and run it!`,
                    },
                    interaction
                  ),
                ],
              })
              .catch(console.error);
          if (
            checkForLimitsChannel != null &&
            checkForLimitsChannel >= (config.bot?.textChannelMax ?? 50)
          )
            return await interaction
              .editReply({
                embeds: [
                  QuickMakeEmbed(
                    {
                      color: 'Red',
                      title:
                        'This text channel has hit the ' +
                        (config.bot?.textChannelMax ?? 50) +
                        ' channel max tracking limit', // FIXME: english isnt my city
                      description: `If you are the owner of the bot, increase 'textchannelmax' value in the \`config.ts\` file.\n\n**Aren't the owner?** Host your own version of the bot!\nJust grab the code from our [Github](<https://github.com/NiaAxern/discord-youtube-subscriber-count>), set it up and run it!`,
                    },
                    interaction
                  ),
                ],
              })
              .catch(console.error);
        }
        const subscribeToChannel = subscribe(
          getID,
          interaction.guild?.id != null,
          getChannel,
          interaction.user.id
        );
        if (subscribeToChannel == false)
          return await interaction
            .editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: 'This channel is most likely already tracked',
                    description: `in <#${getChannel}>.`,
                  },
                  interaction
                ),
              ],
            })
            .catch(console.error);
        const opt = {
          embeds: [
            QuickMakeEmbed(
              {
                color: 'Green',
                title: `Channel has been successfully added for tracking in <#${getChannel}>!`,
                description: `**${
                  channel.title
                }** with ${channel.subscribers?.toLocaleString(
                  'en-US'
                )} subscribers has been tracked by <@${
                  interaction.user.id
                }> to <#${getChannel}> ${
                  interaction.guild?.name != null
                    ? `in **${interaction.guild?.name}**`
                    : ''
                }`,
              },
              interaction
            )
              .setThumbnail(channel.avatar ?? null)
              .setURL('https://www.youtube.com/channel/' + getID),
          ],
        };
        if (getText.isTextBased() == true && getText.isDMBased() == false) {
          await getText.send(opt).catch(console.error);
        }
        return await interaction.editReply(opt).catch(console.error);
      } catch (e) {
        await interaction.followUp({
          ephemeral: true,
          content: 'An error happened!',
        });
        console.error(e);
      }
    },
    autoComplete: async (interaction) => {
      try {
        const isDM = interaction.inGuild() == false;
        if (isDM == true && (config.bot.privateMessages as boolean) == false)
          return await interaction.respond([]);
        else if (isDM == false) {
          const hasPermissions =
            interaction.memberPermissions?.has('Administrator') ||
            interaction.memberPermissions?.has('ManageGuild') ||
            interaction.memberPermissions?.has('ManageChannels') ||
            false;
          if (hasPermissions == false) return await interaction.respond([]);
          /*const botPermissions =
					(interaction.channel
						?.permissionsFor(interaction.client.user)
						?.has('SendMessages') &&
						interaction.channel
							?.permissionsFor(interaction.client.user)
							?.has('EmbedLinks') &&
						interaction.channel
							?.permissionsFor(interaction.client.user)
							?.has('AddReactions') &&
						interaction.channel
							?.permissionsFor(interaction.client.user)
							?.has('AttachFiles') &&
						interaction.channel
							?.permissionsFor(interaction.client.user)
							?.has('SendMessagesInThreads')) ||
					false;

				if (botPermissions == false) return await interaction.respond([]);*/
        }
        const userQuery = interaction.options?.getString('query');
        if (userQuery == '' || !userQuery) return await interaction.respond([]);
        if (userQuery.length == 24 && userQuery.startsWith('UC'))
          return await interaction.respond([
            {
              name: `${userQuery} (using channel id)`,
              value: userQuery,
            },
          ]);
        const queryYouTube = await searchChannel(userQuery);
        return await interaction.respond(
          queryYouTube.map((channel) => {
            return {
              // What is shown to the user
              name: `${channel.title} (${channel.handle}): ${
                !channel?.subscribers
                  ? 'No'
                  : channel.subscribers?.toLocaleString('en-US')
              } subscriber${channel.subscribers == 1 ? '' : 's'}`,
              // What is actually used as the option.
              value: channel.channel_id,
            };
          })
        );
      } catch (e) {
        console.error(e);
      }
    },
  },
  quicktrack: {
    data: {
      options: [
        {
          autocomplete: true,
          type: 3,
          name: 'query',
          description: 'Query to search with. For multiple, seperate by comma.',
          required: true,
        },
        {
          channel_types: [5, 0, 11],
          name: 'text_channel',
          description: 'The channel to send the notifications to.',
          required: false,
          type: 7,
        },
      ],
      // cheatsheet:
      // integration_types = basically allows the command to be used in servers / users, 0 = servers, 1 = everywhere else (use both if want everywhere)
      // contexts =
      /*NAME	TYPE	DESCRIPTION
			  GUILD	0	Interaction can be used within servers
			  BOT_DM	1	Interaction can be used within DMs with the app's bot user
			  PRIVATE_CHANNEL	2
			*/
      integration_types: [0, 1],
      contexts: [0, 1],
      name: 'quicktrack',
      description:
        'Quick track multiple channels and their subscribers here or a different channel.',
    },
    execute: async (interaction) => {
      try {
        const isDM = interaction.inGuild() == false;
        const getChannel =
          interaction.options?.get('text_channel')?.channel?.id ??
          interaction.channelId;
        const getIDs: string[] = (
          interaction.options?.get('query')?.value?.toString() ??
          "(You didn't enter any channelID's"
        ).split(',');
        if (isDM == true && (config.bot.privateMessages as boolean) == false)
          return await interaction
            .editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title:
                      'Tracking channels in direct messages has been disabled.',
                    description: `If you are the owner of the bot, enable it in the \`config.ts\` file.\n\n**Aren't the owner?** Host your own version of the bot!\nJust grab the code from our [Github](<https://github.com/NiaAxern/discord-youtube-subscriber-count>), set it up and run it!`,
                  },
                  interaction
                ),
              ],
            })
            .catch(console.error);
        else if (isDM == false) {
          const hasPermissions =
            interaction.memberPermissions?.has('Administrator') ||
            interaction.memberPermissions?.has('ManageGuild') ||
            interaction.memberPermissions?.has('ManageChannels') ||
            false;
          if (hasPermissions == false)
            return await interaction.editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: "You don't have permissions",
                    description: `Here are the permissions that you need to atleast one enabled:
									**Administrator**: ${interaction.memberPermissions?.has('Administrator')}
									**ManageGuild**: ${interaction.memberPermissions?.has('ManageGuild')}
									**ManageChannels**: ${interaction.memberPermissions?.has('ManageChannels')}`,
                  },
                  interaction
                ),
              ],
            });
          const botPermissions =
            (interaction.channel
              ?.permissionsFor(interaction.client.user)
              ?.has('SendMessages') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('EmbedLinks') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('AddReactions') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('AttachFiles') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('SendMessagesInThreads')) ||
            false;

          if (botPermissions == false)
            return await interaction.editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: "The bot doesn't have permissions",
                    description: `Here are the permissions that the bot has to have enabled:
										**SendMessages**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('SendMessages')}
										**EmbedLinks**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('EmbedLinks')}
										**AddReactions**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('AddReactions')}
										**AttachFiles**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('AttachFiles')}
										**SendMessagesInThreads**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('SendMessagesInThreads')}.
											*so, enable permissions that are FALSE*`,
                  },
                  interaction
                ),
              ],
            });
        }
        for (let query of getIDs.slice(0, 50)) {
          let getID: string = query;
          if (getID.length != 24 || getID.startsWith('UC') == false) {
            const resp = (await searchChannel(getID))?.[0]?.channel_id;
            if (resp.length == 24 || resp.startsWith('UC') == true) {
              getID = resp;
            } else continue;
          }
          const checkCache = await cacheSystem.get(getID).catch(() => {
            return null;
          });
          let channel: Channel =
            checkCache != null ? await JSON.parse(checkCache) : null;
          if (!checkCache) {
            const getAPI = await getChannels(getID);
            channel = getAPI[0]; // Fixes topic channels ^^
          }
          if (!channel.channel_id)
            // we got this far so everything seems to be fine!
            return await interaction
              .editReply({
                embeds: [
                  QuickMakeEmbed(
                    {
                      color: 'Red',
                      title: 'Channel was not found.',
                      description: `The channel \`${getID}\` was NOT found.`,
                    },
                    interaction
                  ),
                ],
              })
              .catch(console.error);

          // after everything has been successfully been done we respond with the all done message!
          let getText = interaction.client.channels.cache.get(getChannel);
          if (!getText) {
            await interaction.client.channels
              .fetch(getChannel)
              .catch(console.error);
            getText = interaction.client.channels.cache.get(getChannel);
          }
          if (!getText)
            return await interaction
              .editReply({
                embeds: [
                  QuickMakeEmbed(
                    {
                      color: 'Red',
                      title: 'Something went wrong.',
                      description: `We can't find the discord channel <#${getChannel}>.\nThis should rarely happen.`,
                    },
                    interaction
                  ),
                ],
              })
              .catch(console.error);
          if ((config.bot?.disableLimits as boolean) != true) {
            const checkForLimitsGuild =
              interaction.guild?.id != null
                ? subscribes.filter((a) => a?.guild_id == interaction.guild?.id)
                    .length
                : null;
            const checkForLimitsChannel =
              interaction.channel?.id != null
                ? subscribes.filter(
                    (a) => a?.discord_channel == interaction.channel?.id
                  ).length // eslint-disable-line
                : null;
            //FIXME: PRETTIER BREAKS THIS! thats why it has disable line rule!
            if (
              checkForLimitsGuild != null &&
              checkForLimitsGuild >= (config.bot?.guildMax ?? 100)
            ) {
              await interaction
                .editReply({
                  embeds: [
                    QuickMakeEmbed(
                      {
                        color: 'Red',
                        title:
                          'This guild has hit the ' +
                          (config.bot?.guildMax ?? 100) +
                          ' channel max tracking limit', // FIXME: english is hard
                        description: `If you are the owner of the bot, increase 'guildmax' value in the \`config.ts\` file.\n\n**Aren't the owner?** Host your own version of the bot!\nJust grab the code from our [Github](<https://github.com/NiaAxern/discord-youtube-subscriber-count>), set it up and run it!`,
                      },
                      interaction
                    ),
                  ],
                })
                .catch(console.error);
              break;
            }
            if (
              checkForLimitsChannel != null &&
              checkForLimitsChannel >= (config.bot?.textChannelMax ?? 50)
            ) {
              await interaction
                .editReply({
                  embeds: [
                    QuickMakeEmbed(
                      {
                        color: 'Red',
                        title:
                          'This text channel has hit the ' +
                          (config.bot?.textChannelMax ?? 50) +
                          ' channel max tracking limit', // FIXME: english isnt my city
                        description: `If you are the owner of the bot, increase 'textchannelmax' value in the \`config.ts\` file.\n\n**Aren't the owner?** Host your own version of the bot!\nJust grab the code from our [Github](<https://github.com/NiaAxern/discord-youtube-subscriber-count>), set it up and run it!`,
                      },
                      interaction
                    ),
                  ],
                })
                .catch(console.error);
              break;
            }
          }
          const subscribeToChannel = subscribe(
            getID,
            interaction.guild?.id != null,
            getChannel,
            interaction.user.id
          );
          if (subscribeToChannel == false)
            return await interaction
              .editReply({
                embeds: [
                  QuickMakeEmbed(
                    {
                      color: 'Red',
                      title: 'This channel is most likely already tracked',
                      description: `in <#${getChannel}>.`,
                    },
                    interaction
                  ),
                ],
              })
              .catch(console.error);
          const opt = {
            embeds: [
              QuickMakeEmbed(
                {
                  color: 'Green',
                  title: `Channel has been successfully added for tracking in <#${getChannel}>!`,
                  description: `**${
                    channel.title
                  }** with ${channel.subscribers?.toLocaleString(
                    'en-US'
                  )} subscribers has been tracked by <@${
                    interaction.user.id
                  }> to <#${getChannel}> ${
                    interaction.guild?.name != null
                      ? `in **${interaction.guild?.name}**`
                      : ''
                  }`,
                },
                interaction
              )
                .setThumbnail(channel.avatar ?? null)
                .setURL('https://www.youtube.com/channel/' + getID),
            ],
          };
          if (getText.isTextBased() == true && getText.isDMBased() == false) {
            await getText.send(opt).catch(console.error);
          }
          await interaction
            .followUp({ ephemeral: true, ...opt })
            .catch(console.error);
        }
        await interaction.editReply('all done!').catch(console.error);
      } catch (e) {
        await interaction.followUp({
          ephemeral: true,
          content: 'An error happened!',
        });
        console.error(e);
      }
    },
  },
  untrack: {
    data: {
      options: [
        {
          autocomplete: true,
          type: 3,
          name: 'query',
          description: 'Query to search with.',
          required: true,
        },
        {
          channel_types: [5, 0, 11],
          name: 'text_channel',
          description: 'The channel to untrack the channel from.',
          required: false,
          type: 7,
        },
      ],
      integration_types: [0],
      contexts: [0, 1],
      name: 'untrack',
      description:
        'Untrack an already tracked channel from here or from a different text-channel.',
    },
    execute: async (interaction) => {
      await interaction.deferReply({ ephemeral: true }).catch(console.error);
      try {
        const isDM = interaction.inGuild() == false;
        const getChannel =
          interaction.options?.get('text_channel')?.channel?.id ??
          interaction.channelId;
        const getID: string =
          interaction.options?.get('query')?.value?.toString() ??
          "(You didn't enter any channelID's";
        if (getID.length != 24 || getID.startsWith('UC') == false)
          return await interaction
            .editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: 'Incorrect YouTube channel id!',
                    description: `The channel id \`${getID}\` is not a valid channel id.`,
                  },
                  interaction
                ),
              ],
            })
            .catch(console.error);
        if (isDM == false) {
          const hasPermissions =
            interaction.memberPermissions?.has('Administrator') ||
            interaction.memberPermissions?.has('ManageGuild') ||
            interaction.memberPermissions?.has('ManageChannels') ||
            false;
          if (hasPermissions == false)
            return await interaction
              .editReply({
                embeds: [
                  QuickMakeEmbed(
                    {
                      color: 'Red',
                      title: "You don't have permissions",
                      description: `Here are the permissions that you need to atleast one enabled:
									**Administrator**: ${interaction.memberPermissions?.has('Administrator')}
									**ManageGuild**: ${interaction.memberPermissions?.has('ManageGuild')}
									**ManageChannels**: ${interaction.memberPermissions?.has('ManageChannels')}`,
                    },
                    interaction
                  ),
                ],
              })
              .catch(console.error);
          const botPermissions =
            (interaction.channel
              ?.permissionsFor(interaction.client.user)
              ?.has('SendMessages') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('EmbedLinks') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('AddReactions') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('AttachFiles') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('SendMessagesInThreads')) ||
            false;

          if (botPermissions == false)
            return await interaction
              .editReply({
                embeds: [
                  QuickMakeEmbed(
                    {
                      color: 'Red',
                      title: "The bot doesn't have permissions",
                      description: `Here are the permissions that the bot has to have enabled:
										**SendMessages**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('SendMessages')}
										**EmbedLinks**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('EmbedLinks')}
										**AddReactions**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('AddReactions')}
										**AttachFiles**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('AttachFiles')}
										**SendMessagesInThreads**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('SendMessagesInThreads')}`,
                    },
                    interaction
                  ),
                ],
              })
              .catch(console.error);
        }
        const checkCache = await cacheSystem.get(getID).catch(() => {
          return null;
        });
        let channel: Channel =
          checkCache != null ? await JSON.parse(checkCache) : null;
        if (!checkCache) {
          const getAPI = await getChannels(getID);
          channel = getAPI[0]; // Fixes topic channels ^^
        }

        // after everything has been successfully been done we respond with the all done message!
        let getText = interaction.client.channels.cache.get(getChannel);
        if (!getText) {
          await interaction.client.channels
            .fetch(getChannel)
            .catch(console.error);
          getText = interaction.client.channels.cache.get(getChannel);
        }
        if (!getText)
          return await interaction
            .editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: 'Something went wrong.',
                    description: `We can't find the discord channel <#${getChannel}>.\nThis should rarely happen.`,
                  },
                  interaction
                ),
              ],
            })
            .catch(console.error);
        const subscribeToChannel = unsubscribe(getID, getChannel);
        if (subscribeToChannel == false)
          return await interaction
            .editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: 'This channel is most likely not even tracked.',
                    description: `in <#${getChannel}>.`,
                  },
                  interaction
                ),
              ],
            })
            .catch(console.error);
        const opt = {
          embeds: [
            QuickMakeEmbed(
              {
                color: 'Green',
                title: `Channel has been successfully untracked in <#${getChannel}>!`,
                description: `**${
                  channel.title
                }** with ${channel.subscribers?.toLocaleString(
                  'en-US'
                )} subscribers has been untracked by <@${
                  interaction.user.id
                }> from <#${getChannel}> ${
                  interaction.guild?.name != null
                    ? `in **${interaction.guild?.name}**`
                    : ''
                }`,
              },
              interaction
            )
              .setThumbnail(channel.avatar ?? null)
              .setURL('https://www.youtube.com/channel/' + getID),
          ],
        };
        if (getText.isTextBased() == true && getText.isDMBased() == false) {
          await getText.send(opt).catch(console.error);
        }
        return await interaction.editReply(opt).catch(console.error);
      } catch (e) {
        await interaction.followUp({
          ephemeral: true,
          content: 'An error happened!',
        });
        console.error(e);
      }
    },
    autoComplete: async (interaction) => {
      try {
        const isDM = interaction.inGuild() == false;
        if (isDM == true && (config.bot.privateMessages as boolean) == false)
          return await interaction.respond([]).catch(console.error);
        else if (isDM == false) {
          const hasPermissions =
            interaction.memberPermissions?.has('Administrator') ||
            interaction.memberPermissions?.has('ManageGuild') ||
            interaction.memberPermissions?.has('ManageChannels') ||
            false;
          if (hasPermissions == false)
            return await interaction.respond([]).catch(console.error);
          /*const botPermissions =
					(interaction.channel
						?.permissionsFor(interaction.client.user)
						?.has('SendMessages') &&
						interaction.channel
							?.permissionsFor(interaction.client.user)
							?.has('EmbedLinks') &&
						interaction.channel
							?.permissionsFor(interaction.client.user)
							?.has('AddReactions') &&
						interaction.channel
							?.permissionsFor(interaction.client.user)
							?.has('AttachFiles') &&
						interaction.channel
							?.permissionsFor(interaction.client.user)
							?.has('SendMessagesInThreads')) ||
					false;

				if (botPermissions == false) return await interaction.respond([]);*/
        }
        const userQuery = interaction.options?.getString('query');
        if (userQuery == '' || !userQuery)
          return await interaction.respond([]).catch(console.error);
        if (userQuery.length == 24 && userQuery.startsWith('UC'))
          return await interaction
            .respond([
              {
                name: `${userQuery} (using channel id)`,
                value: userQuery,
              },
            ])
            .catch(console.error);
        const queryYouTube = await searchChannel(userQuery);
        return await interaction
          .respond(
            queryYouTube.map((channel) => {
              return {
                // What is shown to the user
                name: `${channel.title} (${channel.handle}): ${
                  !channel?.subscribers
                    ? 'No'
                    : channel.subscribers?.toLocaleString('en-US')
                } subscriber${channel.subscribers == 1 ? '' : 's'}`,
                // What is actually used as the option.
                value: channel.channel_id,
              };
            })
          )
          .catch(console.error);
      } catch (e) {
        console.error(e);
      }
    },
  },
  channel: {
    data: {
      options: [
        {
          autocomplete: true,
          type: 3,
          name: 'query',
          description: 'Query to search with.',
          required: true,
        },
      ],
      // cheatsheet:
      // integration_types = basically allows the command to be used in servers / users, 0 = servers, 1 = everywhere else (use both if want everywhere)
      // contexts =
      /*NAME	TYPE	DESCRIPTION
			  GUILD	0	Interaction can be used within servers
			  BOT_DM	1	Interaction can be used within DMs with the app's bot user
			  PRIVATE_CHANNEL	2
			*/
      integration_types: [0, 1],
      contexts: [0, 1, 2],
      name: 'channel',
      description: "Show a certain channel's statistics!",
    },
    execute: async (interaction) => {
      try {
        await interaction.deferReply({ ephemeral: false }).catch(console.error);
        const getID: string =
          interaction.options?.get('query')?.value?.toString() ??
          "(You didn't enter any channelID's";
        if (getID.length != 24 || getID.startsWith('UC') == false)
          return await interaction
            .editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: 'Incorrect YouTube channel id!',
                    description: `The channel id \`${getID}\` is not a valid channel id.`,
                  },
                  interaction
                ),
              ],
            })
            .catch(console.error);
        const checkCache = await cacheSystem.get(getID).catch(() => {
          return null;
        });
        let channel: Channel =
          checkCache != null ? await JSON.parse(checkCache) : null;
        if (!checkCache) {
          const getAPI = await getChannels(getID);
          channel = getAPI[0]; // Fixes topic channels ^^
        }
        if (!channel.channel_id)
          // we got this far so everything seems to be fine!
          return await interaction
            .editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: 'Channel was not found.',
                    description: `The channel \`${getID}\` was NOT found.`,
                  },
                  interaction
                ),
              ],
            })
            .catch(console.error);

        const getLatestAPIUpdate = youtube_channels.find(
          (record_channel) => record_channel.channel_id == channel.channel_id
        );
        const checkForLimitsGuild = subscribes
          .filter((a) => a?.channel_id == channel.channel_id)
          .filter(
            (_, _idx, _arr) =>
              _arr.findIndex(
                (_rec) =>
                  _rec.guild_id == _.guild_id && _.channel_id == _rec.channel_id
              ) == _idx
          ).length;
        const checkForLimitsChannel = subscribes
          .filter((a) => a?.channel_id == channel.channel_id)
          .filter(
            (_, _idx, _arr) =>
              _arr.findIndex(
                (_rec) => _rec.discord_channel == _.discord_channel
              ) == _idx
          ).length;
        const lastSubscribers =
          getLatestAPIUpdate?.lastUpdate?.subscribers?.toLocaleString(
            'en-US'
          ) ?? 'No';
        const currentSubscribers =
          getLatestAPIUpdate?.currentUpdate?.subscribers?.toLocaleString(
            'en-US'
          ) ?? 'No';
        const lastSubrate =
          Math.floor(
            (getLatestAPIUpdate?.lastUpdate?.sub_rate ?? 0) * 86400 * 1000
          )?.toLocaleString('en-US') ?? 'No';
        const currentSubrate =
          Math.floor(
            (getLatestAPIUpdate?.currentUpdate?.sub_rate ?? 0) * 86400 * 1000
          )?.toLocaleString('en-US') ?? 'No';
        const apiText =
          getLatestAPIUpdate != null
            ? `From ${lastSubscribers} (${lastSubrate} / day) to ${currentSubscribers} (${currentSubrate} / day)`
            : '**Not tracked**';
        const opt = {
          embeds: [
            QuickMakeEmbed(
              {
                color: 'Green',
                title: `${channel.title}`,
                description: `**${
                  channel.handle ?? channel.title
                }** has **${channel.subscribers?.toLocaleString(
                  'en-US'
                )} subscribers**, **${channel.views?.toLocaleString(
                  'en-US'
                )} total video views** and **${channel.videos?.toLocaleString(
                  'en-US'
                )} uploaded videos**!\n\nThey are being tracked in **${checkForLimitsGuild?.toLocaleString(
                  'en-US'
                )} servers** and **${checkForLimitsChannel?.toLocaleString(
                  'en-US'
                )} text channels**.
								\n\nLast API update: ${apiText}`,
              },
              interaction
            )
              .setThumbnail(channel.avatar ?? null)
              .setURL('https://www.youtube.com/channel/' + getID),
          ],
        };
        return await interaction.editReply(opt).catch(console.error);
      } catch (e) {
        await interaction.followUp({
          ephemeral: true,
          content: 'An error happened!',
        });
        console.error(e);
      }
    },
    autoComplete: async (interaction) => {
      try {
        const userQuery = interaction.options?.getString('query');
        if (userQuery == '' || !userQuery) return await interaction.respond([]);
        if (userQuery.length == 24 && userQuery.startsWith('UC'))
          return await interaction.respond([
            {
              name: `${userQuery} (using channel id)`,
              value: userQuery,
            },
          ]);
        const queryYouTube = await searchChannel(userQuery);
        return await interaction.respond(
          queryYouTube.map((channel) => {
            return {
              // What is shown to the user
              name: `${channel.title} (${channel.handle}): ${
                !channel?.subscribers
                  ? 'No'
                  : channel.subscribers?.toLocaleString('en-US')
              } subscriber${channel.subscribers == 1 ? '' : 's'}`,
              // What is actually used as the option.
              value: channel.channel_id,
            };
          })
        );
      } catch (e) {
        console.error(e);
      }
    },
  },
  channels: {
    data: {
      options: [
        {
          channel_types: [5, 0, 11],
          name: 'text_channel',
          description: 'The channel to untrack the channel from.',
          required: false,
          type: 7,
        },
      ],
      // cheatsheet:
      // integration_types = basically allows the command to be used in servers / users, 0 = servers, 1 = everywhere else (use both if want everywhere)
      // contexts =
      /*NAME	TYPE	DESCRIPTION
			  GUILD	0	Interaction can be used within servers
			  BOT_DM	1	Interaction can be used within DMs with the app's bot user
			  PRIVATE_CHANNEL	2
			*/
      integration_types: [0, 1],
      contexts: [0, 1],
      name: 'channels',
      description: 'See tracked channels in a channel!',
    },
    execute: async (interaction) => {
      try {
        await interaction.deferReply({ ephemeral: true }).catch(console.error);
        await interaction
          .editReply('If you have a lot of channels, you might get spammed.')
          .catch(console.error);
        const subs = subscribes.filter(
          (a) => a.discord_channel == interaction.channelId
        );

        let resps = [];
        let act_row = new ActionRowBuilder();

        for await (let [idx, subscriber] of subs.entries()) {
          const checkCache = await cacheSystem
            .get(subscriber.channel_id)
            .catch(() => {
              return null;
            });
          let channel: Channel =
            checkCache != null ? await JSON.parse(checkCache) : null;
          if (!checkCache) {
            const getAPI = await getChannels(subscriber.channel_id);
            channel = getAPI?.[0]??{channel_id: subscriber.channel_id}; // Fixes topic channels ^^
          }
          const opt = {
            content: `**${channel.handle ?? channel.channel_id}**: ${(
              channel?.subscribers ?? 0
            )?.toLocaleString('en-US')} subscribers`,
          } as InteractionReplyOptions;
          resps.push(opt.content);

          const confirm = new ButtonBuilder()
            .setCustomId('confirm')
            .setLabel('Confirm Ban')
            .setStyle(ButtonStyle.Danger);
          act_row.addComponents(confirm);
          if (resps.length > 10 || idx == subs.length - 1) {
            await interaction
              .followUp({
                ephemeral: true,
                content: resps.join('\n'),
                components: [act_row as ActionRowBuilder<ButtonBuilder>],
              })
              .catch(console.error);
            resps = [];
            act_row = new ActionRowBuilder();
          }
        }
      } catch (e) {
        await interaction.followUp({
          ephemeral: true,
          content: 'An error happened!',
        });
        console.error(e);
      }
    },
  },
  enable_fastestchannels: {
    data: {
      options: [
        {
          channel_types: [5, 0, 11],
          name: 'text_channel',
          description:
            'The channel to send the fastest channels notifications to.',
          required: false,
          type: 7,
        },
      ],
      // cheatsheet:
      // integration_types = basically allows the command to be used in servers / users, 0 = servers, 1 = everywhere else (use both if want everywhere)
      // contexts =
      /*NAME	TYPE	DESCRIPTION
			  GUILD	0	Interaction can be used within servers
			  BOT_DM	1	Interaction can be used within DMs with the app's bot user
			  PRIVATE_CHANNEL	2
			*/
      integration_types: [0],
      contexts: [0, 1],
      name: 'enable_fastestchannels',
      description:
        'Automatically sends fastest channel notifications (currently min. 100K/day avg.)',
    },
    execute: async (interaction) => {
      try {
        await interaction.deferReply({ ephemeral: true }).catch(console.error);
        const isDM = interaction.inGuild() == false;
        const getChannel =
          interaction.options?.get('text_channel')?.channel?.id ??
          interaction.channelId;
        if (isDM == true && (config.bot.privateMessages as boolean) == false)
          return await interaction
            .editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title:
                      'Tracking channels in direct messages has been disabled.',
                    description: `If you are the owner of the bot, enable it in the \`config.ts\` file.\n\n**Aren't the owner?** Host your own version of the bot!\nJust grab the code from our [Github](<https://github.com/NiaAxern/discord-youtube-subscriber-count>), set it up and run it!`,
                  },
                  interaction
                ),
              ],
            })
            .catch(console.error);
        else if (isDM == false) {
          const hasPermissions =
            interaction.memberPermissions?.has('Administrator') ||
            interaction.memberPermissions?.has('ManageGuild') ||
            interaction.memberPermissions?.has('ManageChannels') ||
            false;
          if (hasPermissions == false)
            return await interaction.editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: "You don't have permissions",
                    description: `Here are the permissions that you need to atleast one enabled:
									**Administrator**: ${interaction.memberPermissions?.has('Administrator')}
									**ManageGuild**: ${interaction.memberPermissions?.has('ManageGuild')}
									**ManageChannels**: ${interaction.memberPermissions?.has('ManageChannels')}`,
                  },
                  interaction
                ),
              ],
            });
          const botPermissions =
            (interaction.channel
              ?.permissionsFor(interaction.client.user)
              ?.has('SendMessages') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('EmbedLinks') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('AddReactions') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('AttachFiles') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('SendMessagesInThreads')) ||
            false;

          if (botPermissions == false)
            return await interaction.editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: "The bot doesn't have permissions",
                    description: `Here are the permissions that the bot has to have enabled:
										**SendMessages**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('SendMessages')}
										**EmbedLinks**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('EmbedLinks')}
										**AddReactions**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('AddReactions')}
										**AttachFiles**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('AttachFiles')}
										**SendMessagesInThreads**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('SendMessagesInThreads')}`,
                  },
                  interaction
                ),
              ],
            });
        }
        // after everything has been successfully been done we respond with the all done message!
        let getText = interaction.client.channels.cache.get(getChannel);
        if (!getText) {
          await interaction.client.channels
            .fetch(getChannel)
            .catch(console.error);
          getText = interaction.client.channels.cache.get(getChannel);
        }
        if (!getText)
          return await interaction
            .editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: 'Something went wrong.',
                    description: `We can't find the discord channel <#${getChannel}>.\nThis should rarely happen.`,
                  },
                  interaction
                ),
              ],
            })
            .catch(console.error);
        if ((config.bot?.disableLimits as boolean) != true) {
          const checkForLimitsGuild =
            interaction.guild?.id != null
              ? subscribes.filter((a) => a?.guild_id == interaction.guild?.id)
                  .length
              : null;
          const checkForLimitsChannel =
            interaction.channel?.id != null
              ? subscribes.filter(
                  (a) => a?.discord_channel == interaction.channel?.id
                ).length // eslint-disable-line
              : null;
          //FIXME: PRETTIER BREAKS THIS! thats why it has disable line rule!
          if (
            checkForLimitsGuild != null &&
            checkForLimitsGuild >= (config.bot?.guildMax ?? 100)
          )
            return await interaction
              .editReply({
                embeds: [
                  QuickMakeEmbed(
                    {
                      color: 'Red',
                      title:
                        'This guild has hit the ' +
                        (config.bot?.guildMax ?? 100) +
                        ' channel max tracking limit', // FIXME: english is hard
                      description: `If you are the owner of the bot, increase 'guildmax' value in the \`config.ts\` file.\n\n**Aren't the owner?** Host your own version of the bot!\nJust grab the code from our [Github](<https://github.com/NiaAxern/discord-youtube-subscriber-count>), set it up and run it!`,
                    },
                    interaction
                  ),
                ],
              })
              .catch(console.error);
          if (
            checkForLimitsChannel != null &&
            checkForLimitsChannel >= (config.bot?.textChannelMax ?? 50)
          )
            return await interaction
              .editReply({
                embeds: [
                  QuickMakeEmbed(
                    {
                      color: 'Red',
                      title:
                        'This text channel has hit the ' +
                        (config.bot?.textChannelMax ?? 50) +
                        ' channel max tracking limit', // FIXME: english isnt my city
                      description: `If you are the owner of the bot, increase 'textchannelmax' value in the \`config.ts\` file.\n\n**Aren't the owner?** Host your own version of the bot!\nJust grab the code from our [Github](<https://github.com/NiaAxern/discord-youtube-subscriber-count>), set it up and run it!`,
                    },
                    interaction
                  ),
                ],
              })
              .catch(console.error);
        }
        const subscribeToChannel = subscribe(
          'fastestchannels',
          interaction.guild?.id != null,
          getChannel,
          interaction.user.id
        );
        if (subscribeToChannel == false)
          return await interaction
            .editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: 'This channel is most likely already tracked',
                    description: `in <#${getChannel}>.`,
                  },
                  interaction
                ),
              ],
            })
            .catch(console.error);
        const opt = {
          embeds: [
            QuickMakeEmbed(
              {
                color: 'Green',
                title: `Automatic fastest channels has been successfully added to <#${getChannel}>!`,
                description: `***The channel will start receiving notifications soon.***`,
              },
              interaction
            ),
          ],
        };
        if (getText.isTextBased() == true && getText.isDMBased() == false) {
          await getText.send(opt).catch(console.error);
        }
        return await interaction.editReply(opt).catch(console.error);
      } catch (e) {
        await interaction.followUp({
          ephemeral: true,
          content: 'An error happened!',
        });
        console.error(e);
      }
    },
  },
  disable_fastestchannels: {
    data: {
      options: [
        {
          channel_types: [5, 0, 11],
          name: 'text_channel',
          description: 'The channel to untrack the channel from.',
          required: false,
          type: 7,
        },
      ],
      integration_types: [0],
      contexts: [0, 1],
      name: 'disable_fastestchannels',
      description: 'Disable fastest channel tracking.',
    },
    execute: async (interaction) => {
      await interaction.deferReply({ ephemeral: true }).catch(console.error);
      try {
        const isDM = interaction.inGuild() == false;
        const getChannel =
          interaction.options?.get('text_channel')?.channel?.id ??
          interaction.channelId;
        if (isDM == false) {
          const hasPermissions =
            interaction.memberPermissions?.has('Administrator') ||
            interaction.memberPermissions?.has('ManageGuild') ||
            interaction.memberPermissions?.has('ManageChannels') ||
            false;
          if (hasPermissions == false)
            return await interaction
              .editReply({
                embeds: [
                  QuickMakeEmbed(
                    {
                      color: 'Red',
                      title: "You don't have permissions",
                      description: `Here are the permissions that you need to atleast one enabled:
									**Administrator**: ${interaction.memberPermissions?.has('Administrator')}
									**ManageGuild**: ${interaction.memberPermissions?.has('ManageGuild')}
									**ManageChannels**: ${interaction.memberPermissions?.has('ManageChannels')}`,
                    },
                    interaction
                  ),
                ],
              })
              .catch(console.error);
          const botPermissions =
            (interaction.channel
              ?.permissionsFor(interaction.client.user)
              ?.has('SendMessages') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('EmbedLinks') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('AddReactions') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('AttachFiles') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('SendMessagesInThreads')) ||
            false;

          if (botPermissions == false)
            return await interaction
              .editReply({
                embeds: [
                  QuickMakeEmbed(
                    {
                      color: 'Red',
                      title: "The bot doesn't have permissions",
                      description: `Here are the permissions that the bot has to have enabled:
										**SendMessages**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('SendMessages')}
										**EmbedLinks**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('EmbedLinks')}
										**AddReactions**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('AddReactions')}
										**AttachFiles**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('AttachFiles')}
										**SendMessagesInThreads**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('SendMessagesInThreads')}`,
                    },
                    interaction
                  ),
                ],
              })
              .catch(console.error);
        }

        // after everything has been successfully been done we respond with the all done message!
        let getText = interaction.client.channels.cache.get(getChannel);
        if (!getText) {
          await interaction.client.channels
            .fetch(getChannel)
            .catch(console.error);
          getText = interaction.client.channels.cache.get(getChannel);
        }
        if (!getText)
          return await interaction
            .editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: 'Something went wrong.',
                    description: `We can't find the discord channel <#${getChannel}>.\nThis should rarely happen.`,
                  },
                  interaction
                ),
              ],
            })
            .catch(console.error);
        const subscribeToChannel = unsubscribe('fastestchannels', getChannel);
        if (subscribeToChannel == false)
          return await interaction
            .editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: 'This channel is most likely not even tracked.',
                    description: `in <#${getChannel}>.`,
                  },
                  interaction
                ),
              ],
            })
            .catch(console.error);
        const opt = {
          embeds: [
            QuickMakeEmbed(
              {
                color: 'Green',
                title: `Fastest channels has been disabled in <#${getChannel}>!`,
                description: `**Channel should stop receiving notifications soon.**`,
              },
              interaction
            ),
          ],
        };
        if (getText.isTextBased() == true && getText.isDMBased() == false) {
          await getText.send(opt).catch(console.error);
        }
        return await interaction.editReply(opt).catch(console.error);
      } catch (e) {
        await interaction.followUp({
          ephemeral: true,
          content: 'An error happened!',
        });
        console.error(e);
      }
    },
  },
  enable_milestones: {
    data: {
      options: [
        {
          channel_types: [5, 0, 11],
          name: 'text_channel',
          description: 'The channel to send the milestone notifications to.',
          required: false,
          type: 7,
        },
      ],
      // cheatsheet:
      // integration_types = basically allows the command to be used in servers / users, 0 = servers, 1 = everywhere else (use both if want everywhere)
      // contexts =
      /*NAME	TYPE	DESCRIPTION
			  GUILD	0	Interaction can be used within servers
			  BOT_DM	1	Interaction can be used within DMs with the app's bot user
			  PRIVATE_CHANNEL	2
			*/
      integration_types: [0],
      contexts: [0, 1],
      name: 'enable_milestones',
      description:
        'Automatically sends milestone notifications. This MAY send a lot of messages so be aware!',
    },
    execute: async (interaction) => {
      try {
        await interaction.deferReply({ ephemeral: true }).catch(console.error);
        const isDM = interaction.inGuild() == false;
        const getChannel =
          interaction.options?.get('text_channel')?.channel?.id ??
          interaction.channelId;
        if (isDM == true && (config.bot.privateMessages as boolean) == false)
          return await interaction
            .editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title:
                      'Tracking channels in direct messages has been disabled.',
                    description: `If you are the owner of the bot, enable it in the \`config.ts\` file.\n\n**Aren't the owner?** Host your own version of the bot!\nJust grab the code from our [Github](<https://github.com/NiaAxern/discord-youtube-subscriber-count>), set it up and run it!`,
                  },
                  interaction
                ),
              ],
            })
            .catch(console.error);
        else if (isDM == false) {
          const hasPermissions =
            interaction.memberPermissions?.has('Administrator') ||
            interaction.memberPermissions?.has('ManageGuild') ||
            interaction.memberPermissions?.has('ManageChannels') ||
            false;
          if (hasPermissions == false)
            return await interaction.editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: "You don't have permissions",
                    description: `Here are the permissions that you need to atleast one enabled:
									**Administrator**: ${interaction.memberPermissions?.has('Administrator')}
									**ManageGuild**: ${interaction.memberPermissions?.has('ManageGuild')}
									**ManageChannels**: ${interaction.memberPermissions?.has('ManageChannels')}`,
                  },
                  interaction
                ),
              ],
            });
          const botPermissions =
            (interaction.channel
              ?.permissionsFor(interaction.client.user)
              ?.has('SendMessages') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('EmbedLinks') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('AddReactions') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('AttachFiles') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('SendMessagesInThreads')) ||
            false;

          if (botPermissions == false)
            return await interaction.editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: "The bot doesn't have permissions",
                    description: `Here are the permissions that the bot has to have enabled:
										**SendMessages**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('SendMessages')}
										**EmbedLinks**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('EmbedLinks')}
										**AddReactions**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('AddReactions')}
										**AttachFiles**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('AttachFiles')}
										**SendMessagesInThreads**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('SendMessagesInThreads')}`,
                  },
                  interaction
                ),
              ],
            });
        }
        // after everything has been successfully been done we respond with the all done message!
        let getText = interaction.client.channels.cache.get(getChannel);
        if (!getText) {
          await interaction.client.channels
            .fetch(getChannel)
            .catch(console.error);
          getText = interaction.client.channels.cache.get(getChannel);
        }
        if (!getText)
          return await interaction
            .editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: 'Something went wrong.',
                    description: `We can't find the discord channel <#${getChannel}>.\nThis should rarely happen.`,
                  },
                  interaction
                ),
              ],
            })
            .catch(console.error);
        if ((config.bot?.disableLimits as boolean) != true) {
          const checkForLimitsGuild =
            interaction.guild?.id != null
              ? subscribes.filter((a) => a?.guild_id == interaction.guild?.id)
                  .length
              : null;
          const checkForLimitsChannel =
            interaction.channel?.id != null
              ? subscribes.filter(
                  (a) => a?.discord_channel == interaction.channel?.id
                ).length // eslint-disable-line
              : null;
          //FIXME: PRETTIER BREAKS THIS! thats why it has disable line rule!
          if (
            checkForLimitsGuild != null &&
            checkForLimitsGuild >= (config.bot?.guildMax ?? 100)
          )
            return await interaction
              .editReply({
                embeds: [
                  QuickMakeEmbed(
                    {
                      color: 'Red',
                      title:
                        'This guild has hit the ' +
                        (config.bot?.guildMax ?? 100) +
                        ' channel max tracking limit', // FIXME: english is hard
                      description: `If you are the owner of the bot, increase 'guildmax' value in the \`config.ts\` file.\n\n**Aren't the owner?** Host your own version of the bot!\nJust grab the code from our [Github](<https://github.com/NiaAxern/discord-youtube-subscriber-count>), set it up and run it!`,
                    },
                    interaction
                  ),
                ],
              })
              .catch(console.error);
          if (
            checkForLimitsChannel != null &&
            checkForLimitsChannel >= (config.bot?.textChannelMax ?? 50)
          )
            return await interaction
              .editReply({
                embeds: [
                  QuickMakeEmbed(
                    {
                      color: 'Red',
                      title:
                        'This text channel has hit the ' +
                        (config.bot?.textChannelMax ?? 50) +
                        ' channel max tracking limit', // FIXME: english isnt my city
                      description: `If you are the owner of the bot, increase 'textchannelmax' value in the \`config.ts\` file.\n\n**Aren't the owner?** Host your own version of the bot!\nJust grab the code from our [Github](<https://github.com/NiaAxern/discord-youtube-subscriber-count>), set it up and run it!`,
                    },
                    interaction
                  ),
                ],
              })
              .catch(console.error);
        }
        const subscribeToChannel = subscribe(
          'milestones',
          interaction.guild?.id != null,
          getChannel,
          interaction.user.id
        );
        if (subscribeToChannel == false)
          return await interaction
            .editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: 'This channel is most likely already tracked',
                    description: `in <#${getChannel}>.`,
                  },
                  interaction
                ),
              ],
            })
            .catch(console.error);
        const opt = {
          embeds: [
            QuickMakeEmbed(
              {
                color: 'Green',
                title: `Automatic milestones has been successfully added to <#${getChannel}>!`,
                description: `***The channel will start receiving notifications soon.***`,
              },
              interaction
            ),
          ],
        };
        if (getText.isTextBased() == true && getText.isDMBased() == false) {
          await getText.send(opt).catch(console.error);
        }
        return await interaction.editReply(opt).catch(console.error);
      } catch (e) {
        await interaction.followUp({
          ephemeral: true,
          content: 'An error happened!',
        });
        console.error(e);
      }
    },
  },
  disable_milestones: {
    data: {
      options: [
        {
          channel_types: [5, 0, 11],
          name: 'text_channel',
          description: 'The channel to untrack the channel from.',
          required: false,
          type: 7,
        },
      ],
      integration_types: [0],
      contexts: [0, 1],
      name: 'disable_milestones',
      description: 'Disable milestone messages.',
    },
    execute: async (interaction) => {
      await interaction.deferReply({ ephemeral: true }).catch(console.error);
      try {
        const isDM = interaction.inGuild() == false;
        const getChannel =
          interaction.options?.get('text_channel')?.channel?.id ??
          interaction.channelId;
        if (isDM == false) {
          const hasPermissions =
            interaction.memberPermissions?.has('Administrator') ||
            interaction.memberPermissions?.has('ManageGuild') ||
            interaction.memberPermissions?.has('ManageChannels') ||
            false;
          if (hasPermissions == false)
            return await interaction
              .editReply({
                embeds: [
                  QuickMakeEmbed(
                    {
                      color: 'Red',
                      title: "You don't have permissions",
                      description: `Here are the permissions that you need to atleast one enabled:
									**Administrator**: ${interaction.memberPermissions?.has('Administrator')}
									**ManageGuild**: ${interaction.memberPermissions?.has('ManageGuild')}
									**ManageChannels**: ${interaction.memberPermissions?.has('ManageChannels')}`,
                    },
                    interaction
                  ),
                ],
              })
              .catch(console.error);
          const botPermissions =
            (interaction.channel
              ?.permissionsFor(interaction.client.user)
              ?.has('SendMessages') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('EmbedLinks') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('AddReactions') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('AttachFiles') &&
              interaction.channel
                ?.permissionsFor(interaction.client.user)
                ?.has('SendMessagesInThreads')) ||
            false;

          if (botPermissions == false)
            return await interaction
              .editReply({
                embeds: [
                  QuickMakeEmbed(
                    {
                      color: 'Red',
                      title: "The bot doesn't have permissions",
                      description: `Here are the permissions that the bot has to have enabled:
										**SendMessages**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('SendMessages')}
										**EmbedLinks**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('EmbedLinks')}
										**AddReactions**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('AddReactions')}
										**AttachFiles**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('AttachFiles')}
										**SendMessagesInThreads**: ${interaction.channel
                      ?.permissionsFor(interaction.client.user)
                      ?.has('SendMessagesInThreads')}`,
                    },
                    interaction
                  ),
                ],
              })
              .catch(console.error);
        }

        // after everything has been successfully been done we respond with the all done message!
        let getText = interaction.client.channels.cache.get(getChannel);
        if (!getText) {
          await interaction.client.channels
            .fetch(getChannel)
            .catch(console.error);
          getText = interaction.client.channels.cache.get(getChannel);
        }
        if (!getText)
          return await interaction
            .editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: 'Something went wrong.',
                    description: `We can't find the discord channel <#${getChannel}>.\nThis should rarely happen.`,
                  },
                  interaction
                ),
              ],
            })
            .catch(console.error);
        const subscribeToChannel = unsubscribe('milestones', getChannel);
        if (subscribeToChannel == false)
          return await interaction
            .editReply({
              embeds: [
                QuickMakeEmbed(
                  {
                    color: 'Red',
                    title: 'This channel is most likely not even tracked.',
                    description: `in <#${getChannel}>.`,
                  },
                  interaction
                ),
              ],
            })
            .catch(console.error);
        const opt = {
          embeds: [
            QuickMakeEmbed(
              {
                color: 'Green',
                title: `Milestones have been disabled in <#${getChannel}>!`,
                description: `**Channel should stop receiving notifications soon.**`,
              },
              interaction
            ),
          ],
        };
        if (getText.isTextBased() == true && getText.isDMBased() == false) {
          await getText.send(opt).catch(console.error);
        }
        return await interaction.editReply(opt).catch(console.error);
      } catch (e) {
        await interaction.followUp({
          ephemeral: true,
          content: 'An error happened!',
        });
        console.error(e);
      }
    },
  },
};

export default commands;
