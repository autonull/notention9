import { RobustWebSocket } from '../core/dist/index.js';
import assert from 'assert';
import { EventEmitter } from 'events';

console.log('🧪 Verifying RobustWebSocket...');

// Mock WebSocket
class MockWebSocket extends EventEmitter {
    readyState = 0; // CONNECTING
    constructor(url) {
        super();
        this.url = url;
        setTimeout(() => {
            this.readyState = 1; // OPEN
            this.emit('open');
        }, 10);
    }
    send(data) {
        this.emit('sent_data', data);
    }
    close() {
        this.readyState = 3; // CLOSED
        this.emit('close', { code: 1000, reason: 'Normal' });
    }
}

// Test Implementation
class TestClient extends RobustWebSocket {
    constructor() {
        super({ webSocketCtor: MockWebSocket });
    }
}

async function verify() {
    try {
        const client = new TestClient();

        // Test Connect
        await client.connect('ws://localhost:1234');

        await new Promise(r => setTimeout(r, 50)); // Wait for open

        assert.strictEqual(client.isConnected(), true, 'Should be connected');
        console.log('✅ Connection established');

        // Test Send
        let sent = null;
        client['ws'].on('sent_data', (data) => {
            sent = JSON.parse(data);
        });

        client.send({ type: 'test' });

        assert.ok(sent, 'Data should be sent');
        assert.strictEqual(sent.type, 'test', 'Data content correct');
        console.log('✅ Sending works');

        // Test Queueing (Offline)
        client['ws'].close();
        await new Promise(r => setTimeout(r, 50)); // Wait for close handling

        assert.strictEqual(client.isConnected(), false, 'Should be disconnected (online mode off)');

        client.send({ type: 'queued_msg' });
        const status = client.getStatus();
        assert.strictEqual(status.queueSize, 1, 'Should have 1 queued message');
        console.log('✅ Queueing works');

        console.log('🎉 RobustWebSocket Verified!');
    } catch (e) {
        console.error('❌ Verification Failed:', e);
        process.exit(1);
    }
}

verify();
