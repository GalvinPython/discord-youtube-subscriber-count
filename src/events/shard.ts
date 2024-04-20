/** @format */

import { Events } from 'discord.js';
import djs_client from '../client';

djs_client.on(Events.ShardDisconnect, (error) => {
	throw error;
});
djs_client.on(Events.ShardError, (error) => {
	console.error(error);
});
djs_client.on(Events.ShardReady, () => {
	console.log('Shard is ready');
});
djs_client.on(Events.ShardReconnecting, () => {
	console.log('Shard is reconnecting');
});
djs_client.on(Events.ShardResume, () => {
	console.log('Shard has resumed');
});
