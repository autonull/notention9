import { describe, it, expect } from 'vitest';
import { getTextFromHtml, prettyPrintHtml } from '@notention/core';

describe('parsing HTML utils', () => {
  describe('getTextFromHtml', () => {
    it('extracts text from simple HTML', () => {
      expect(getTextFromHtml('<p>Hello</p>')).toBe('Hello\n');
    });

    it('extracts text from nested HTML', () => {
      expect(getTextFromHtml('<div><p>Hello</p><span>World</span></div>')).toBe('Hello\nWorld\n');
    });

    it('handles empty input', () => {
      expect(getTextFromHtml('')).toBe('');
    });

    it('preserves plain text', () => {
      expect(getTextFromHtml('Just text')).toBe('Just text');
    });
  });

  describe('prettyPrintHtml', () => {
    it('formats HTML with newlines', () => {
      const input = '<p>Hello</p><ul><li>Item</li></ul>';
      expect(prettyPrintHtml(input)).toContain('<p>Hello</p>');
      expect(prettyPrintHtml(input)).toContain('\n<ul>');
      expect(prettyPrintHtml(input)).toContain('\n<li>');
    });
  });
});
