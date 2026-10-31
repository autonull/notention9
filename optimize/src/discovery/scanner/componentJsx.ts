import type { Node, SourceFile } from 'ts-morph';
import { Node as N } from 'ts-morph';
import type { JSXElement } from './componentScanner.js';

export function extractJsx(sourceFile: SourceFile): JSXElement[] {
    return jsxInNode(sourceFile);
}

function jsxInNode(node: Node): JSXElement[] {
    const elements: JSXElement[] = [];
    for (const child of node.getChildren()) {
        if (N.isJsxElement(child)) {
            elements.push(fromJsxElement(child));
        } else if (N.isJsxSelfClosingElement(child)) {
            elements.push(fromSelfClosing(child));
        } else {
            elements.push(...jsxInNode(child));
        }
    }
    return elements;
}

function fromJsxElement(element: import('ts-morph').JsxElement): JSXElement {
    const opening = element.getOpeningElement();
    return {
        tag: opening.getTagNameNode().getText(),
        props: jsxAttributes(opening.getAttributes()),
        children: jsxInNode(element),
        location: location(element),
    };
}

function fromSelfClosing(element: import('ts-morph').JsxSelfClosingElement): JSXElement {
    return {
        tag: element.getTagNameNode().getText(),
        props: jsxAttributes(element.getAttributes()),
        children: [],
        location: location(element),
    };
}

function jsxAttributes(attributes: Node[]): Record<string, string> {
    const props: Record<string, string> = {};
    for (const attribute of attributes) {
        if (!N.isJsxAttribute(attribute)) continue;
        props[attribute.getNameNode().getText()] = attributeValue(attribute.getInitializer());
    }
    return props;
}

function attributeValue(initializer: Node | undefined): string {
    if (!initializer) return 'true';
    if (N.isStringLiteral(initializer)) return initializer.getLiteralText();
    if (N.isJsxExpression(initializer)) return initializer.getExpression()?.getText() ?? '';
    return initializer.getText();
}

function location(node: Node): { line: number; column: number } {
    const sourceFile = node.getSourceFile();
    const position = node.getStart();
    const { line, column } = sourceFile.getLineAndColumnAtPos(position);
    return { line, column };
}

export function traverseJsx(jsx: JSXElement, visitor: (node: JSXElement) => void): void {
    visitor(jsx);
    for (const child of jsx.children) {
        traverseJsx(child, visitor);
    }
}

export function traverseJsxWithContext<T>(jsx: JSXElement, context: T, visitor: (node: JSXElement, context: T) => void): void {
    visitor(jsx, context);
    for (const child of jsx.children) {
        traverseJsxWithContext(child, context, visitor);
    }
}