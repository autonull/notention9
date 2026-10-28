export default {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow ambiguous re-exports that create duplicate exports',
            category: 'Best Practices',
            recommended: false,
        },
        fixable: null,
        schema: [],
        messages: {
            ambiguousReexport: 'Ambiguous re-export: "{{module}}" is re-exported from multiple barrel files. This can cause import ambiguity and break dependency scanning.',
        },
    },
    create(context) {
        const sourceToFiles = new Map();
        const currentFile = context.getFilename();

        function isBarrelFile(filename) {
            return filename.endsWith('index.ts') || filename.endsWith('index.tsx') ||
                   filename.endsWith('Primitives.tsx') || filename.endsWith('Primitives.ts');
        }

        return {
            ExportAllDeclaration(node) {
                if (!isBarrelFile(currentFile)) return;

                const source = node.source.value;
                if (!source.startsWith('.')) return;

                console.log(`[no-ambiguous-reexports] Found export * from '${source}' in ${currentFile}`);

                if (!sourceToFiles.has(source)) {
                    sourceToFiles.set(source, new Set());
                }
                sourceToFiles.get(source).add(currentFile);
            },
            'Program:exit'() {
                console.log(`[no-ambiguous-reexports] Checking ${sourceToFiles.size} sources`);
                for (const [source, files] of sourceToFiles.entries()) {
                    console.log(`[no-ambiguous-reexports] Source: ${source}, Files: ${Array.from(files).join(', ')}`);
                    if (files.size > 1) {
                        context.report({
                            loc: {line: 1, column: 0},
                            messageId: 'ambiguousReexport',
                            data: {module: source},
                        });
                    }
                }
            },
        };
    },
};