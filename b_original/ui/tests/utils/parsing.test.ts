import { describe, it, expect } from 'vitest';
import { parseProperties } from '@notention/core';

describe('parseProperties', () => {
  it('parses standard [key:op:value] format', () => {
    const text = 'Some text [client:is:Acme] and [price:is:100]';
    const props = parseProperties(text);
    expect(props).toHaveLength(2);
    expect(props[0]).toEqual({ key: 'client', operator: 'is', values: ['Acme'] });
    expect(props[1]).toEqual({ key: 'price', operator: 'is', values: ['100'] });
  });

  it('parses symbolic [key op value] format', () => {
    const text = 'Budget check [budget < 500] and [deadline > 2025-01-01]';
    const props = parseProperties(text);
    expect(props).toHaveLength(2);
    expect(props[0]).toEqual({ key: 'budget', operator: 'less than', values: ['500'] });
    expect(props[1]).toEqual({ key: 'deadline', operator: 'greater than', values: ['2025-01-01'] });
  });

  it('parses symbolic = as is', () => {
    const text = '[status = active]';
    const props = parseProperties(text);
    expect(props[0]).toEqual({ key: 'status', operator: 'is', values: ['active'] });
  });

  it('handles mixed formats', () => {
    const text = '[type:is:service] with [rate < 50]';
    const props = parseProperties(text);
    expect(props).toHaveLength(2);
    expect(props[0]).toEqual({ key: 'type', operator: 'is', values: ['service'] });
    expect(props[1]).toEqual({ key: 'rate', operator: 'less than', values: ['50'] });
  });

  it('ignores invalid brackets', () => {
    const text = 'This is [not a property] and [neither is this one]';
    // Unless we defined implicit 'is', these should be ignored or handled gracefully.
    // Our current regex for symbolic requires a known symbol.
    const props = parseProperties(text);
    expect(props).toHaveLength(0);
  });
});
