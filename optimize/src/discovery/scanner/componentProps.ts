import type { Node, PropertySignature, SourceFile } from 'ts-morph';
import { Node as N } from 'ts-morph';
import type { PropInfo } from './componentScanner.js';
import type { ComponentDeclaration } from './componentDeclarations.js';

export function extractProps(sourceFile: SourceFile, declarations: ComponentDeclaration[]): PropInfo[] {
    const referenced = getReferencedPropsTypeName(declarations);
    if (referenced) {
        const props = propsFromNamedType(sourceFile, referenced, new Set());
        if (props.length > 0) return props;
    }

    for (const candidate of getPropsCandidateNames(sourceFile)) {
        const props = propsFromNamedType(sourceFile, candidate, new Set());
        if (props.length > 0) return props;
    }

    return [];
}

function getReferencedPropsTypeName(declarations: ComponentDeclaration[]): string | null {
    for (const declaration of declarations) {
        const parameter = getFirstParameter(declaration.node);
        const typeNode = parameter?.getTypeNode();
        if (!typeNode) continue;
        const name = getTypeReferenceName(typeNode);
        if (name) return name;
    }
    return null;
}

function getFirstParameter(node: Node) {
    if (N.isFunctionDeclaration(node) || N.isArrowFunction(node) || N.isFunctionExpression(node) || N.isMethodDeclaration(node)) {
        return node.getParameters()[0];
    }
    if (N.isVariableDeclaration(node)) {
        const initializer = node.getInitializer();
        if (initializer && (N.isArrowFunction(initializer) || N.isFunctionExpression(initializer))) {
            return initializer.getParameters()[0];
        }
    }
    return undefined;
}

function getTypeReferenceName(typeNode: Node): string | null {
    if (N.isTypeReference(typeNode)) {
        const typeArguments = typeNode.getTypeArguments();
        if (typeArguments.length > 0) return getTypeReferenceName(typeArguments[0]);
        const name = typeNode.getTypeName().getText();
        return name.includes('.') ? name.split('.').pop() ?? null : name;
    }
    if (N.isParenthesizedTypeNode(typeNode)) {
        return getTypeReferenceName(typeNode.getTypeNode());
    }
    return null;
}

function getPropsCandidateNames(sourceFile: SourceFile): string[] {
    return [
        ...sourceFile.getInterfaces().map(declaration => declaration.getName()),
        ...sourceFile.getTypeAliases().map(declaration => declaration.getName()),
    ].filter(name => name === 'Props' || name.endsWith('Props'));
}

function propsFromNamedType(sourceFile: SourceFile, name: string, seen: Set<string>): PropInfo[] {
    if (seen.has(name)) return [];
    seen.add(name);

    const iface = sourceFile.getInterface(name);
    if (iface) {
        const props = iface.getProperties().map(property => toPropInfo(property));
        for (const extension of iface.getExtends()) {
            const base = getTypeReferenceName(extension) ?? extension.getText();
            props.push(...propsFromNamedType(sourceFile, base, seen));
        }
        return props;
    }

    const alias = sourceFile.getTypeAlias(name);
    const typeNode = alias?.getTypeNode();
    if (!typeNode) return [];

    if (N.isTypeLiteral(typeNode)) {
        return typeLiteralProps(typeNode);
    }
    if (N.isIntersectionTypeNode(typeNode)) {
        return typeNode.getTypeNodes().flatMap(member => (N.isTypeLiteral(member) ? typeLiteralProps(member) : []));
    }
    return [];
}

function typeLiteralProps(typeNode: Node): PropInfo[] {
    if (!N.isTypeLiteral(typeNode)) return [];
    return typeNode
        .getMembers()
        .filter(N.isPropertySignature)
        .map(member => toPropInfo(member));
}

function toPropInfo(property: PropertySignature): PropInfo {
    return {
        name: property.getName(),
        type: property.getTypeNode()?.getText() ?? 'unknown',
        optional: property.hasQuestionToken(),
    };
}

// Re-export ComponentDeclaration for internal use
export type { ComponentDeclaration } from './componentDeclarations.js';