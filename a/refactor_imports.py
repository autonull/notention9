import os
import re

UI_DIR = 'ui'

MOVED_MODULES = [
    'nostr',
    'ontology.default',
    'ontologyHelpers',
    'properties',
    'parsing',
    'dateParsing',
    'notes'
]

def refactor_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    new_content = content

    # Replace types imports
    # Matches: from '.../types' or from '@/types'
    new_content = re.sub(r"from\s+['\"](.*\/types|@\/types)['\"]", "from '@notention/core'", new_content)

    # Replace utils imports
    for mod in MOVED_MODULES:
        # Matches: from '.../utils/mod' or from '@/utils/mod'
        pattern = r"from\s+['\"](.*\/utils\/" + re.escape(mod) + r"|@\/utils\/" + re.escape(mod) + r")['\"]"
        new_content = re.sub(pattern, "from '@notention/core'", new_content)

    if new_content != content:
        print(f"Refactoring {filepath}")
        with open(filepath, 'w') as f:
            f.write(new_content)

for root, dirs, files in os.walk(UI_DIR):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            refactor_file(os.path.join(root, file))
