const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ port: 8080 });

const events = [];
const subs = new Map(); // subId -> ws

console.log('Relay running on ws://localhost:8080');

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const type = data[0];

      if (type === 'EVENT') {
        const event = data[1];
        console.log(`Received EVENT: ${event.id} kind=${event.kind}`);
        events.push(event);
        ws.send(JSON.stringify(['OK', event.id, true, '']));

        // Broadcast to matching subs
        wss.clients.forEach(client => {
            if (client.readyState === 1) {
                // Simplified: just broadcast everything to everyone for this test
                // In real relay, check filters
                client.send(JSON.stringify(['EVENT', 'subscription_id', event]));
            }
        });
      } else if (type === 'REQ') {
        const subId = data[1];
        console.log(`Received REQ: ${subId}`);
        // Send existing events
        events.forEach(event => {
            ws.send(JSON.stringify(['EVENT', subId, event]));
        });
        ws.send(JSON.stringify(['EOSE', subId]));
      } else if (type === 'CLOSE') {
          console.log(`Received CLOSE: ${data[1]}`);
      }
    } catch (e) {
      console.error('Error processing message:', e);
    }
  });
});
