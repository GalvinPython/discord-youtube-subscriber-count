import { routes } from '@stricjs/app';
import { text, json } from '@stricjs/app/send';

// Define and export your routes
export default routes()
    .get('/discord-callback', () => new Response('Hi'));