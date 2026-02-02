import { publishNoteToNostr } from '../core/dist/nostr.js';
import { NetworkGate } from '../core/dist/networkGate.js';

// Mock Note
const createNote = (publicFlag) => ({
  id: 'test-note-id',
  title: 'Test Note',
  content: 'Test Content',
  tags: [],
  properties: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  public: publicFlag,
  priority: 0.5
});

// Mock window.nostr
global.window = {
  nostr: {
    signEvent: async (event) => {
      console.log('Mock window.nostr.signEvent called');
      return { ...event, id: 'signed-event-id', sig: 'signature' };
    }
  }
};

// Mock Console to suppress warnings about failed relays
const originalWarn = console.warn;
console.warn = (...args) => {
    if (args[0] && args[0].includes('Failed to publish')) return;
    originalWarn(...args);
};

const runVerification = async () => {
  console.log('Verifying Sharing Logic...');

  // Test 1: Private Note, No Prompt Callback -> Should Throw
  console.log('Test 1: Private Note, No Prompt Callback');
  const privateNote1 = createNote(false);
  try {
    await publishNoteToNostr(privateNote1, undefined, [], undefined);
    console.error('❌ Should have thrown PrivacyError');
    process.exit(1);
  } catch (e) {
    if (e.message.includes('private')) {
      console.log('✅ Threw PrivacyError as expected.');
    } else {
      console.error('❌ Threw unexpected error:', e);
      process.exit(1);
    }
  }

  // Test 2: Private Note, Prompt Callback (Decline) -> Should Throw
  console.log('Test 2: Private Note, Prompt (Decline)');
  const privateNote2 = createNote(false);
  const promptDecline = async () => false;
  try {
    await publishNoteToNostr(privateNote2, undefined, [], promptDecline);
    console.error('❌ Should have thrown PrivacyError');
    process.exit(1);
  } catch (e) {
    if (e.message.includes('cancelled')) {
      console.log('✅ Threw Cancelled Error as expected.');
    } else {
      console.error('❌ Threw unexpected error:', e);
      process.exit(1);
    }
  }

  // Test 3: Private Note, Prompt (Confirm) -> Should Proceed
  console.log('Test 3: Private Note, Prompt (Confirm)');
  const privateNote3 = createNote(false);
  const promptConfirm = async () => true;
  try {
    await publishNoteToNostr(privateNote3, undefined, [], promptConfirm);
    console.log('✅ Published successfully (mocked).');
    if (privateNote3.public === true) {
         console.log('✅ Note marked as public.');
    } else {
         console.error('❌ Note NOT marked as public.');
         process.exit(1);
    }
  } catch (e) {
    // It might throw due to pool.publish failing (no relays provided), but that's after privacy check.
    // If it throws "No promises" (from promiseAny with empty relay list), that means it PASSED privacy check and tried to publish.
    if (e.message.includes('No promises') || e.message.includes('Failed to publish')) {
         console.log('✅ Passed privacy check (publishing failed as expected with no relays).');
    } else {
        console.error('❌ Failed with unexpected error:', e);
        process.exit(1);
    }
  }

  // Test 4: Public Note -> Should Proceed without Prompt
  console.log('Test 4: Public Note');
  const publicNote = createNote(true);
  let promptCalled = false;
  const promptSpy = async () => { promptCalled = true; return true; };
  try {
    await publishNoteToNostr(publicNote, undefined, [], promptSpy);
    console.log('✅ Published successfully (mocked).');
    if (promptCalled) {
        console.error('❌ Prompt was called for public note!');
        process.exit(1);
    } else {
        console.log('✅ Prompt was NOT called.');
    }
  } catch (e) {
     if (e.message.includes('No promises') || e.message.includes('Failed to publish')) {
         console.log('✅ Passed privacy check (publishing failed as expected).');
    } else {
        console.error('❌ Failed with unexpected error:', e);
        process.exit(1);
    }
  }

  console.log('All Sharing verification tests passed!');
};

runVerification().catch(e => {
  console.error('Verification failed:', e);
  process.exit(1);
});
