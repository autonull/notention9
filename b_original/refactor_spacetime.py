import os
import re

FILES = [
    'ui/hooks/useMapView.ts',
    'ui/hooks/useSortedFilteredNotes.ts',
    'ui/components/views/TimeView.tsx',
    'ui/components/editor/ContextPanel.tsx',
    'ui/services/MatchingService.ts'
]

for filepath in FILES:
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            content = f.read()

        new_content = re.sub(r"from\s+['\"].*utils/spacetime['\"]", "from '@notention/core'", content)

        if new_content != content:
            print(f"Refactoring {filepath}")
            with open(filepath, 'w') as f:
                f.write(new_content)
