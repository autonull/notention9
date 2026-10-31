import type { SourceFile } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';

export function extractHooks(sourceFile: SourceFile): string[] {
    const hooks = new Set<string>();
    for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
        const match = call.getExpression().getText().match(/(?:^|\.)(use[A-Z]\w*)$/);
        if (match) hooks.add(match[1]);
    }
    return [...hooks];
}