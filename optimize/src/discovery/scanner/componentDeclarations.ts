import type { Node, SourceFile } from 'ts-morph';
import { Node as N } from 'ts-morph';

export interface ComponentDeclaration {
    name: string;
    node: Node;
}

export function extractComponentDeclarations(sourceFile: SourceFile): ComponentDeclaration[] {
    const found: ComponentDeclaration[] = [];

    for (const fn of sourceFile.getFunctions()) {
        if (!fn.isExported() && !fn.isDefaultExport()) continue;
        const name = fn.getName() ?? sourceFile.getBaseNameWithoutExtension();
        found.push({ name, node: fn });
    }

    for (const cls of sourceFile.getClasses()) {
        if (!cls.isExported() && !cls.isDefaultExport()) continue;
        const name = cls.getName() ?? sourceFile.getBaseNameWithoutExtension();
        found.push({ name, node: cls });
    }

    for (const statement of sourceFile.getVariableStatements()) {
        if (!statement.isExported()) continue;
        for (const declaration of statement.getDeclarations()) {
            const name = declaration.getName();
            if (!/^[A-Z]/.test(name)) continue;
            found.push({ name, node: declaration });
        }
    }

    const capitalised = found.filter(d => /^[A-Z]/.test(d.name));
    return capitalised.length > 0 ? capitalised : found;
}