/** @format */

import { z } from 'zod';

const envVariables = z.object({
	DISCORD_TOKEN: z.string().refine((str): str is string => str !== '<TOKEN>', {
		message: 'Real token must be specified',
	}),
	YT_API_KEY: z.string().nullable().optional(),
	SELF_HOSTED_YT_API: z.string().nullable().optional(),
});

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace NodeJS {
		// eslint-disable-next-line @typescript-eslint/no-empty-interface
		interface ProcessEnv extends z.infer<typeof envVariables> {}
	}
}


console.log('Validating environment variables...');

const parsed = envVariables.safeParse(process.env);
if (parsed.success === false) {
	console.error(
		'❌ Invalid environment variables:',
		parsed.error.flatten().fieldErrors,
	);
	throw new SyntaxError('Invalid environment variables');
}

console.log('Environment variables seem to be correct...');
