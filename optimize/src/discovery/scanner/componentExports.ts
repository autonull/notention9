import type { SourceFile } from 'ts-morph';

export function extractExports(sourceFile: SourceFile): string[] {
    const names = new Set<string>();

    for (const fn of sourceFile.getFunctions()) {
        if (fn.isExported()) names.add(fn.getName() ?? 'default');
    }
    for (const cls of sourceFile.getClasses()) {
        if (cls.isExported()) names.add(cls.getName() ?? 'default');
    }
    for (const statement of sourceFile.getVariableStatements()) {
        if (!statement.isExported()) continue;
        for (const declaration of statement.getDeclarations()) names.add(declaration.getName());
    }
    for (const declaration of sourceFile.getExportDeclarations()) {
        for (const named of declaration.getNamedExports()) names.add(named.getName());
        if (!declaration.getModuleSpecifierValue()) names.add('*');
    }
    if (sourceFile.getDefaultExportSymbol()) names.add('default');

    return [...names];
}