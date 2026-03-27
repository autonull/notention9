import { createOntologyQueryTool } from '../core/dist/index.js';
import assert from 'assert';

console.log('🧪 Verifying Ontology Tool...');

try {
    const mockOntology = [
        {
            id: 'node1',
            label: 'Test Node',
            description: 'A test node',
            attributes: {
                attr1: { description: 'Attribute 1' }
            },
            children: [
                { id: 'child1', label: 'Child Node' }
            ]
        }
    ];

    const tool = createOntologyQueryTool({
        getOntology: () => mockOntology
    });

    // Test 1: Node Search
    const result1 = await tool.execute({ query: 'test', type: 'node' });
    assert.strictEqual(result1.length, 1, 'Should find 1 node');
    assert.strictEqual(result1[0].id, 'node1', 'Should find node1');
    console.log('✅ Node search works');

    // Test 2: Attribute Search
    const result2 = await tool.execute({ query: 'attr1', type: 'attribute' });
    assert.strictEqual(result2.length, 1, 'Should find 1 attribute');
    assert.strictEqual(result2[0].id, 'node1.attr1', 'Should find correct attribute ID');
    console.log('✅ Attribute search works');

    // Test 3: Recursive Search
    const result3 = await tool.execute({ query: 'child', type: 'node' });
    assert.strictEqual(result3.length, 1, 'Should find child node');
    console.log('✅ Recursive search works');

    console.log('🎉 Ontology Tool Verified!');

} catch (e) {
    console.error('❌ Verification Failed:', e);
    process.exit(1);
}
