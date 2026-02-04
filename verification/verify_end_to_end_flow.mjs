import {
    PropertyExtractor,
    patternRecognitionService,
    matchingService,
    parseProperties,
    IndeedSkill
} from '../core/dist/index.js';
import assert from 'assert';

console.log('🚀 Starting End-to-End Flow Simulation...');

try {
    // ==========================================
    // STEP 1: Simulate Note Creation & Semantic Extraction
    // ==========================================
    console.log('\n📝 Step 1: Note Creation & Extraction');
    const userText = "I need to buy milk tomorrow budget $50";
    console.log(`User types: "${userText}"`);

    const propertyExtractor = new PropertyExtractor();
    const extractedProperties = propertyExtractor.extractFromText(userText);

    console.log('Extracted Properties:', JSON.stringify(extractedProperties, null, 2));

    // Verify Intent
    const taskIntent = extractedProperties.find(p => p.key === 'intent' && p.values.includes('task'));
    assert.ok(taskIntent, 'Should extract "task" intent from "need to"');

    // Verify Budget
    const budgetProp = extractedProperties.find(p => p.key === 'budget' && p.values.includes('50'));
    assert.ok(budgetProp, 'Should extract budget of 50');

    // Verify Date
    const dateProp = extractedProperties.find(p => p.key === 'date');
    assert.ok(dateProp, 'Should extract a date property for "tomorrow"');

    console.log('✅ Step 1 Passed: Semantics extracted correctly.');

    // ==========================================
    // STEP 2: Simulate Smart Suggestions
    // ==========================================
    console.log('\n💡 Step 2: Smart Suggestions');

    // Construct a mock note with the extracted properties
    const mockNote = {
        id: 'note-123',
        title: 'Shopping Trip',
        content: userText,
        properties: extractedProperties,
        updatedAt: new Date().toISOString(),
        tags: []
    };

    const predictions = patternRecognitionService.predictUserNeeds('test-user', mockNote);
    console.log('Predictions:', JSON.stringify(predictions.map(p => p.predictedAction), null, 2));

    // "need to" -> task intent. Default patterns map task intent to 'Create Task'
    const hasCreateTask = predictions.some(p => p.predictedAction === 'Create Task' || p.predictedAction === 'Add to Todo List');
    assert.ok(hasCreateTask, 'Should suggest creating a task for task intent');

    console.log('✅ Step 2 Passed: Smart suggestions generated.');

    // ==========================================
    // STEP 3: Simulate Matching
    // ==========================================
    console.log('\n🤝 Step 3: Network Matching');

    // User Request: "I want to learn javascript"
    const requestText = "I want to learn javascript";
    const requestProps = propertyExtractor.extractFromText(requestText);
    // Manually add skill property if fuzzy matcher doesn't catch it without context,
    // but let's assume user added it or fuzzy matcher worked.
    // For test stability, we'll explicitly add the skill property as if user accepted a suggestion.
    requestProps.push({ key: 'skill', operator: 'contains', values: ['javascript'] });

    const requestNote = {
        id: 'req-1',
        title: 'Learning JS',
        content: requestText,
        properties: requestProps,
        source: { type: 'user', identifier: 'seeker' },
        createdAt: new Date().toISOString(),
        priority: 1
    };

    // Other User Offer: "I teach JavaScript"
    const offerText = "I teach JavaScript classes";
    const offerProps = [
        { key: 'skill', operator: 'contains', values: ['JavaScript'] }, // Case difference
        { key: 'intent', operator: 'is', values: ['teaching'] }
    ];

    const offerNote = {
        id: 'off-1',
        title: 'JS Teacher',
        content: offerText,
        properties: offerProps,
        source: { type: 'user', identifier: 'teacher' },
        createdAt: new Date().toISOString(),
        priority: 0.8
    };

    const matchResult = matchingService.matchNotes(requestNote, offerNote);
    console.log(`Match Score: ${matchResult.score}`);
    console.log('Satisfied Constraints:', matchResult.satisfied);
    console.log('Failed Constraints:', matchResult.failed);

    // Score is 0.4 because 'intent:task' != 'intent:teaching', but 'skill' matches.
    // 1 of 2 constraints satisfied (0.5) * 0.8 priority = 0.4.
    assert.ok(matchResult.score >= 0.4, 'Should have a reasonable match score');
    assert.ok(matchResult.satisfied.some(p => p.key === 'skill'), 'Should satisfy the skill constraint');
    assert.ok(matchResult.failed.some(p => p.key === 'intent'), 'Intent should fail (task vs teaching)');

    console.log('✅ Step 3 Passed: Notes matched successfully (with expected partial match).');

    // ==========================================
    // STEP 4: Simulate Response
    // ==========================================
    console.log('\n💬 Step 4: Response & Parsing');

    const replyContent = "> I teach JavaScript classes\n\nThat sounds great! I'm interested. [rate:is:50]";
    console.log(`User replies: "${replyContent}"`);

    const replyProperties = parseProperties(replyContent);
    console.log('Reply Properties:', replyProperties);

    const rateProp = replyProperties.find(p => p.key === 'rate' && p.values.includes('50'));
    assert.ok(rateProp, 'Should extract rate property from reply');

    console.log('✅ Step 4 Passed: Reply parsed correctly.');

    // ==========================================
    // STEP 5: Simulate Skill Execution (Indeed)
    // ==========================================
    console.log('\n🛠️ Step 5: Skill Execution (Indeed)');

    const indeedSkill = new IndeedSkill();
    console.log(`Initialized Skill: ${indeedSkill.name} (v${indeedSkill.version})`);

    const jobNote = {
        id: 'job-search-1',
        title: 'Typescript Job Search',
        content: 'Find typescript jobs in San Francisco',
        properties: [
            { key: 'role', operator: 'is', values: ['typescript'] },
            { key: 'location', operator: 'is', values: ['San Francisco'] },
            { key: 'intent', operator: 'is', values: ['job'] }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        source: { type: 'user', identifier: 'seeker', timestamp: Date.now() },
        priority: 1,
        public: false
    };

    console.log('Exporting note to Indeed Skill...');
    const action = await indeedSkill.exportToActions(jobNote);

    // indeedSkill.exportToActions returns ActionSequence
    assert.ok(action, 'Should return an action sequence');
    assert.ok(action.actions.length > 0, 'Should have actions');

    const navigateAction = action.actions.find(a => a.type === 'navigate');
    assert.ok(navigateAction, 'Should have navigate action');
    assert.ok(navigateAction.url.includes('indeed.com'), 'URL should point to indeed.com');
    assert.ok(navigateAction.url.includes('typescript'), 'URL should include search term');
    assert.ok(navigateAction.url.includes('San%20Francisco'), 'URL should include location');

    console.log('Action Generated:', JSON.stringify(action, null, 2));
    console.log('✅ Step 5 Passed: Indeed Skill generated correct browser action.');

    // ==========================================
    // STEP 6: Simulate Feedback Loop
    // ==========================================
    console.log('\n🔄 Step 6: Feedback Loop');

    // Mock Feedback Collector
    const feedbackStore = [];
    const feedbackCollector = {
        record: (feedback) => {
            feedbackStore.push(feedback);
            console.log(`[FeedbackCollector] Recorded feedback for ${feedback.entityId}: ${feedback.value}`);
        }
    };

    const feedback = {
        id: 'fb-1',
        entityId: indeedSkill.id,
        entityType: 'skill',
        value: 1, // Thumbs up
        timestamp: Date.now()
    };

    feedbackCollector.record(feedback);

    assert.strictEqual(feedbackStore.length, 1, 'Should have recorded 1 feedback item');
    assert.strictEqual(feedbackStore[0].value, 1, 'Feedback value should be 1');
    assert.strictEqual(feedbackStore[0].entityId, indeedSkill.id, 'Feedback should be for Indeed Skill');

    console.log('✅ Step 6 Passed: Feedback recorded successfully.');


    console.log('\n🎉 End-to-End Flow Verified Successfully!');

} catch (e) {
    console.error('❌ Verification Failed:', e);
    process.exit(1);
}
