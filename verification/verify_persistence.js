const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 3000;
const WS_URL = `ws://localhost:${PORT}/ws/agent`;

async function run() {
  console.log('Starting verification...');

  // Start Server
  console.log('Spawning agent server...');
  const serverProcess = spawn('npm', ['run', 'start', '--workspace=agent'], {
    stdio: 'pipe',
    detached: false,
    shell: true
  });

  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    // console.log(`Server: ${output}`);
    if (output.includes('running on http://localhost:3000')) {
        console.log('Server started detected.');
    }
  });

  serverProcess.stderr.on('data', (data) => {
     console.error(`Server Error: ${data}`);
  });

  console.log('Waiting for server to initialize...');
  await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s for server (build might take time)

  let ws;
  try {
    console.log(`Connecting to ${WS_URL}...`);
    ws = new WebSocket(WS_URL);

    await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', (err) => reject(new Error(`WebSocket error: ${err.message}`)));
    });
    console.log('Connected to WebSocket');

    // 1. Save Note
    const noteId = `test_note_${Date.now()}`;
    const testNote = {
        id: noteId,
        title: 'Verification Note',
        content: 'This is a test note for persistence.',
        updatedAt: new Date().toISOString(),
        tags: [],
        properties: []
    };

    console.log('Saving note...');
    ws.send(JSON.stringify({ type: 'save_note', payload: testNote, id: 'req_1' }));

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. Get Notes
    console.log('Fetching notes...');
    ws.send(JSON.stringify({ type: 'get_notes', id: 'req_2' }));

    const notes = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout fetching notes')), 5000);
        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data);
                if (msg.type === 'notes_list' && msg.id === 'req_2') {
                    clearTimeout(timeout);
                    resolve(msg.payload);
                }
            } catch (e) {}
        });
    });

    console.log(`Received ${notes.length} notes.`);
    const foundNote = notes.find(n => n.id === noteId);
    if (!foundNote) throw new Error('Note not found after save!');
    if (foundNote.title !== testNote.title) throw new Error('Note content mismatch!');
    console.log('Note verification passed!');

    // 3. Delete Note
    console.log('Deleting note...');
    ws.send(JSON.stringify({ type: 'delete_note', payload: { id: noteId }, id: 'req_3' }));

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. Verify Delete
    console.log('Verifying delete...');
    ws.send(JSON.stringify({ type: 'get_notes', id: 'req_4' }));

    const notesAfterDelete = await new Promise((resolve, reject) => {
         const timeout = setTimeout(() => reject(new Error('Timeout fetching notes after delete')), 5000);
         const handler = (data) => {
            try {
                const msg = JSON.parse(data);
                if (msg.type === 'notes_list' && msg.id === 'req_4') {
                    clearTimeout(timeout);
                    ws.removeListener('message', handler);
                    resolve(msg.payload);
                }
            } catch (e) {}
        };
        ws.on('message', handler);
    });

    if (notesAfterDelete.find(n => n.id === noteId)) {
        throw new Error('Note still exists after delete!');
    }
    console.log('Delete verification passed!');

    // 5. Robustness / Concurrent Inserts (Race Condition Check)
    console.log('Testing concurrent inserts (Race Condition Check)...');
    const iterations = 20;
    const concurrentNotes = [];

    for (let i = 0; i < iterations; i++) {
        concurrentNotes.push({
            id: `concurrent_note_${i}_${Date.now()}`,
            title: `Concurrent Note ${i}`,
            updatedAt: new Date().toISOString()
        });
    }

    const promises = concurrentNotes.map((note, i) => {
        return new Promise((resolve) => {
             ws.send(JSON.stringify({
                type: 'save_note',
                payload: note,
                id: `concurrent_${i}`
            }));
            // Rapid fire
            resolve();
        });
    });

    await Promise.all(promises);
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for mutex queue to drain

    // Verify all notes exist
    console.log('Fetching final concurrent notes...');
    ws.send(JSON.stringify({ type: 'get_notes', id: 'req_concurrent_final' }));

    const finalNotes = await new Promise((resolve, reject) => {
         const timeout = setTimeout(() => reject(new Error('Timeout fetching concurrent notes')), 5000);
         const handler = (data) => {
            try {
                const msg = JSON.parse(data);
                if (msg.type === 'notes_list' && msg.id === 'req_concurrent_final') {
                    clearTimeout(timeout);
                    ws.removeListener('message', handler);
                    resolve(msg.payload);
                }
            } catch (e) {}
        };
        ws.on('message', handler);
    });

    let missingCount = 0;
    for (const note of concurrentNotes) {
        if (!finalNotes.find(n => n.id === note.id)) {
            missingCount++;
            console.error(`Missing note: ${note.id}`);
        }
    }

    if (missingCount > 0) {
        throw new Error(`Race condition detected! ${missingCount} notes were lost.`);
    }

    console.log(`All ${iterations} concurrent notes verified!`);
    console.log('Robustness test passed!');

    ws.close();

  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  } finally {
    console.log('Stopping server...');
    if (serverProcess) {
        process.kill(serverProcess.pid); // Only kills the shell process
        // Try to find the actual node process and kill it if possible,
        // but typically in CI/sandbox, exiting the script handles it.
        // We'll rely on the sandbox to clean up orphan processes if necessary.
        // Or send SIGINT.
        try { serverProcess.kill('SIGINT'); } catch(e) {}
    }
    setTimeout(() => process.exit(0), 1000);
  }
}

run();
