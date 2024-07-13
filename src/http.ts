import { init } from '@stricjs/app';

// Initialize and serve the application with a concise syntax
init({
  routes: ['./src/routes'],
  serve: {
    port: 47500,
  },
});

//export {};
