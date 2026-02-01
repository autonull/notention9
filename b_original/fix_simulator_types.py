import os

FIXES = [
    {
        'file': 'ui/hooks/simulator/useSimulationAgents.ts',
        'old': "from '@notention/core'",
        'new': "from './types'"
    },
    {
        'file': 'ui/components/views/ChatView.tsx',
        'old': "from '@notention/core'",
        'new': "from '../../hooks/simulator/types'"
    },
    {
        'file': 'ui/components/simulator/AgentSettingsModal.tsx',
        'old': "from '@notention/core'",
        'new': "from '../../hooks/simulator/types'"
    },
    {
        'file': 'ui/components/chat/ChatWindow.tsx',
        'old': "from '@notention/core'",
        'new': "from '../../hooks/simulator/types'"
    }
]

for fix in FIXES:
    filepath = fix['file']
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            content = f.read()

        # Check if import contains SELF_AGENT_ID or INITIAL_AGENTS
        if 'SELF_AGENT_ID' in content or 'INITIAL_AGENTS' in content:
            new_content = content.replace(fix['old'], fix['new'])
            if new_content != content:
                print(f"Fixing {filepath}")
                with open(filepath, 'w') as f:
                    f.write(new_content)
