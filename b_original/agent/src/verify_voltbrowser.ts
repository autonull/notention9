
import { executeAction } from './core/actionExecutor';

async function testVoltBrowser() {
    console.log('🧪 Testing VoltBrowser (Playwright)...');

    const action = {
        type: 'browser',
        url: 'https://example.com',
        interactions: [
            { type: 'wait', value: 1000 }
        ],
        extract: {
            title: 'h1',
            intro: 'p'
        },
        screenshot: 'full'
    };

    try {
        const results = await executeAction(action);
        console.log('✅ VoltBrowser Test Success!');
        console.log('Title:', results[0].title);
        console.log('Intro:', results[0].intro);
        console.log('Screenshot length:', results[0]._screenshot?.length);

        if (results[0].title === 'Example Domain' && results[0]._screenshot) {
            process.exit(0);
        } else {
            console.error('❌ Data mismatch');
            process.exit(1);
        }

    } catch (e) {
        console.error('❌ VoltBrowser Test Failed:', e);
        process.exit(1);
    }
}

testVoltBrowser();
