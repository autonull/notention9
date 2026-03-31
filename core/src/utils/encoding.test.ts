import { describe, it, expect } from 'vitest';
import { hexToBytes } from './encoding';

describe('hexToBytes', () => {
  it('should convert valid hex string to Uint8Array', () => {
    const hex = 'deadbeef';
    const expected = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    expect(hexToBytes(hex)).toEqual(expected);
  });

  it('should throw error for invalid hex string length', () => {
    expect(() => hexToBytes('deadbee')).toThrow('Invalid hex string');
  });
});
