/** @format */
import type { Commands } from '../types/commands';
import { heapStats } from 'bun:jsc';
import client from '../client';
const commands: Commands = {
	ping: {
		data: {
			options: [],
			name: 'ping',
			description: 'Check the ping of the bot!',
			integration_types: [0, 1],
			contexts: [0, 1, 2],
		},
		execute: async (interaction) => {
			await interaction
				.reply({
					ephemeral: false,
					content: `Ping: ${interaction.client.ws.ping}ms`,
				})
				.catch(console.error);
		},
	},
	help: {
		data: {
			options: [],
			name: 'help',
			description: 'Get help on what each command does!',
			integration_types: [0, 1],
			contexts: [0, 1, 2],
		},
		execute: async (interaction) => {
			await client.application?.commands?.fetch().catch(console.error);
			const chat_commands = client.application?.commands.cache.map((a) => {
				return `</${a.name}:${a.id}>: ${a.description}`;
			});
			await interaction
				.reply({
					ephemeral: true,
					content: `Commands:\n${chat_commands?.join('\n')}`,
				})
				.catch(console.error);
		},
	},
	termsofservice: {
		data: {
			options: [],
			name: 'termsofservice',
			description: "Terms of Service. Read what you can and can't do.",
			integration_types: [0, 1],
			contexts: [0, 1, 2],
		},
		execute: async (interaction) => {
			await interaction
				.reply({
					ephemeral: true,
					content: `[Terms of Service](https://nia-statistics.com/discord-bot-tos.html)`,
				})
				.catch(console.error);
		},
	},
	privacypolicy: {
		data: {
			options: [],
			name: 'privacypolicy',
			description:
				'Privacy Policy. See what information is taken with this app.',
			integration_types: [0, 1],
			contexts: [0, 1, 2],
		},
		execute: async (interaction) => {
			await interaction
				.reply({
					ephemeral: true,
					content: `[Privacy Policy](https://nia-statistics.com/discord-bot-privacy-policy.html)`,
				})
				.catch(console.error);
		},
	},
	sourcecode: {
		data: {
			options: [],
			name: 'sourcecode',
			description: "Get the link of the app's source code.",
			integration_types: [0, 1],
			contexts: [0, 1, 2],
		},
		execute: async (interaction) => {
			await interaction
				.reply({
					ephemeral: true,
					content: `[Github repository](https://github.com/NiaAxern/discord-youtube-subscriber-count)`,
				})
				.catch(console.error);
		},
	},
	uptime: {
		data: {
			options: [],
			name: 'uptime',
			description: 'Check the uptime of the bot!',
			integration_types: [0, 1],
			contexts: [0, 1, 2],
		},
		execute: async (interaction) => {
			await interaction
				.reply({
					ephemeral: false,
					content: `Uptime: ${(performance.now() / (86400 * 1000)).toFixed(
						2,
					)} days`,
				})
				.catch(console.error);
		},
	},
	usage: {
		data: {
			options: [],
			name: 'usage',
			description: 'Check the heap size and disk usage of the bot!',
			integration_types: [0, 1],
			contexts: [0, 1, 2],
		},
		execute: async (interaction) => {
			const heap = heapStats();
			Bun.gc(false); // testing muahahah
			await interaction
				.reply({
					ephemeral: false,
					content: [
						`Heap size: ${(heap.heapSize / 1024 / 1024).toFixed(2)} MB / ${(
							heap.heapCapacity /
							1024 /
							1024
						).toFixed(2)} MB (${(heap.extraMemorySize / 1024 / 1024).toFixed(
							2,
						)} MB) (${heap.objectCount.toLocaleString(
							'en-US',
						)} objects, ${heap.protectedObjectCount.toLocaleString(
							'en-US',
						)} protected-objects)`,
					]
						.join('\n')
						.slice(0, 2000),
				})
				.catch(console.error);
		},
	},
};

export default commands;
