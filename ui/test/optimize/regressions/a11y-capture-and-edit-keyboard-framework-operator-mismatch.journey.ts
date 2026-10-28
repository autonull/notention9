import { registerJourney } from '@notention/optimize/registry';
import type { JourneySpec } from '@notention/optimize/journey';
import { test } from '@playwright/test';

const journey: JourneySpec = {
    id: 'regression-a11y-capture-and-edit-keyboard-framework-operator-mismatch',
    version: 1,
    intent: 'Regression test for finding: Property operator mismatch: framework shows "is not" but index has "Next.js"',
    journeysTouched: ["regression","capture-and-edit-keyboard"],
    seed: {
    "notes": [
        {
            "id": "scene-editor-note",
            "title": "Scene Editor Note",
            "content": "Working on the scene editor with <span data-type=\"property\" data-name=\"skill\" data-operator=\"contains\" data-value=\"React, TypeScript\"></span>",
            "tags": [
                "development"
            ],
            "properties": [
                {
                    "key": "skill",
                    "operator": "contains",
                    "values": [
                        "React",
                        "TypeScript"
                    ]
                }
            ],
            "createdAt": "2026-10-28T18:38:42.833Z",
            "updatedAt": "2026-10-28T18:38:42.833Z",
            "source": {
                "type": "user",
                "identifier": "user-default",
                "timestamp": 1793212722833
            },
            "privacy": "private",
            "priority": 1
        }
    ],
    "settings": {
        "theme": "dark",
        "ontology": [],
        "developerMode": false,
        "aiEnabled": false,
        "aiProvider": "local",
        "aiModel": "",
        "googleGeminiApiKey": "",
        "nostr": {
            "privkey": null,
            "relays": []
        }
    }
},
    steps: [
    { kind: 'seed',
        notes: [{"id":"scene-editor-note","title":"Scene Editor Note","content":"Working on the scene editor with <span data-type=\"property\" data-name=\"skill\" data-operator=\"contains\" data-value=\"React, TypeScript\"></span>","tags":["development"],"properties":[{"key":"skill","operator":"contains","values":["React","TypeScript"]}],"createdAt":"2026-10-28T18:38:42.833Z","updatedAt":"2026-10-28T18:38:42.833Z","source":{"type":"user","identifier":"user-default","timestamp":1793212722833},"privacy":"private","priority":1}],
        settings: {"theme":"dark","ontology":[],"developerMode":false,"aiEnabled":false,"aiProvider":"local","aiModel":"","googleGeminiApiKey":"","nostr":{"privkey":null,"relays":[]}}
    },
    { kind: 'navigate',
        hash: "notes/scene-editor-note"
    },
    { kind: 'assertState',
        path: "note.id",
        equals: {"__expectAny":true}
    },
    { kind: 'assertState',
        path: "note.propertyIndex.framework",
        equals: ["Next.js"]
    },
    { kind: 'assertNoConsoleErrors',

    }
    ],
    status: 'ready',
};

registerJourney(journey);

test('optimize: regression-a11y-capture-and-edit-keyboard-framework-operator-mismatch', async ({ page }) => {
    page.on('console', msg => console.log('[BROWSER]', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('[BROWSER ERROR]', err.message));
    const { runJourneyTest } = await import('../support/journeyTest');
    await runJourneyTest('regression-a11y-capture-and-edit-keyboard-framework-operator-mismatch', page);
});
