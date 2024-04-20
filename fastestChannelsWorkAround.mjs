/** @format */
/* eslint-disable */
import { io } from 'socket.io-client';
const socket = io('wss://ws.nia-statistics.com/', {
	path: '/epicws/',
});

console.log(process?.isBun, "ISBUN")
console.log('connecting to fastest channels websocket');
const checkIsConnected = setInterval(() => {
	if (socket.connected == false) console.log('socket not connected.');
	else clearInterval(checkIsConnected);
}, 1000);
// client-side
socket.on('connect', () => {
	const engine = socket.io.engine;
	console.log(engine.transport.name);

	engine.once('upgrade', () => {
		// called when the transport is upgraded (i.e. from HTTP long-polling to WebSocket)
		console.log(engine.transport.name);
	});

	engine.on('close', (reason) => {
		// called when the underlying connection is closed
		console.log(reason);
	});
});

socket.on('disconnect', () => {
	console.log(socket.id);
});

socket.on('analytics_update', (data) => {
	console.log(JSON.stringify(data));
});

