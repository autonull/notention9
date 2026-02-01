import { describe, it, expect } from 'vitest';
import { ResonanceProtocol, PublicMatching } from '@notention/core';

describe('ResonanceProtocol', () => {
  it('should generate blinded hash for private matching', () => {
    const hash = ResonanceProtocol.generateIntentHash('test.ontology', [0.1, 0.2], 'nonce', true);
    expect(hash.isPrivate).toBe(true);
    expect(hash.vectorHash).toContain('blinded_hash');
  });

  it('should generate public vector for public matching', () => {
    const hash = ResonanceProtocol.generateIntentHash('test.ontology', [0.1, 0.2], 'nonce', false);
    expect(hash.isPrivate).toBe(false);
    expect(hash.vectorHash).toContain('public_vector');
  });

  it('should not match private with public', () => {
    const hashA = ResonanceProtocol.generateIntentHash('test.ontology', [0.1], 'nonce', true);
    const hashB = ResonanceProtocol.generateIntentHash('test.ontology', [0.1], 'nonce', false);
    expect(ResonanceProtocol.checkResonance(hashA, hashB)).toBe(false);
  });
});

describe('PublicMatching', () => {
    it('should generate match request', () => {
        const req = PublicMatching.generateMatchRequest('job.offer', { role: 'dev' });
        expect(req.ontology).toBe('job.offer');
        expect(req.properties.role).toBe('dev');
    });

    it('should match compatible requests', () => {
        const reqA = PublicMatching.generateMatchRequest('job.offer', { role: 'dev', salary: '100k' });
        const reqB = PublicMatching.generateMatchRequest('job.offer', { role: 'dev', location: 'remote' });
        expect(PublicMatching.checkMatch(reqA, reqB)).toBe(true);
    });

    it('should not match different ontologies', () => {
        const reqA = PublicMatching.generateMatchRequest('job.offer', { role: 'dev' });
        const reqB = PublicMatching.generateMatchRequest('job.seek', { role: 'dev' });
        expect(PublicMatching.checkMatch(reqA, reqB)).toBe(false);
    });
});
