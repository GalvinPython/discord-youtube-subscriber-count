/** @format */
import { Events } from 'discord.js';
import djs_client from '../client';

import commands from '../commands';

import type { CommandType } from '../types/commands';

djs_client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) {
    const parseCommand = interaction.customId.split('$')[0];
    const getCommand: CommandType = commands.get(parseCommand);
    if (!getCommand)
      return console.log(
        `${interaction.user.displayName} tried to do /${parseCommand} (button) but it wasn't found.`
      );
    return getCommand.button != null ? getCommand.button(interaction) : null;
  }
});
