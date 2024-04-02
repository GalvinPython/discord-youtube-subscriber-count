/** @format */

import { Events } from 'discord.js';
import djs_client from '../client';
import logger from '../logging';

djs_client.on(Events.ShardDisconnect, (error) => {
	throw error;
});
djs_client.on(Events.ShardError, (error) => {
	logger.error(error);
});
djs_client.on(Events.ShardReady, () => {
	logger.notice('Shard is ready');
});
djs_client.on(Events.ShardReconnecting, () => {
	logger.notice('Shard is reconnecting');
});
djs_client.on(Events.ShardResume, () => {
	logger.notice('Shard has resumed');
});
