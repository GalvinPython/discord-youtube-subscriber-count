/** @format */

import { Events } from 'discord.js';
import djs_client from '../client';

djs_client.on(Events.Warn, (warn) => {
	console.error(warn);
});
