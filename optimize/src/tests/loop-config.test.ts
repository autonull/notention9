import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import Ajv from 'ajv';

const loopDir = join(__dirname, '../../../loop');

const schema = JSON.parse(readFileSync(join(loopDir, 'schema.json'), 'utf-8'));
const taxonomy = JSON.parse(readFileSync(join(loopDir, 'taxonomy.json'), 'utf-8'));
const loopConfig = JSON.parse(readFileSync(join(loopDir, 'loop.config.json'), 'utf-8'));

const taxonomySchema = { ...schema.definitions.taxonomy, definitions: schema.definitions };
const loopConfigSchema = { ...schema.definitions.loopConfig, definitions: schema.definitions };

const ajv = new Ajv({ allErrors: true, strict: false });
const validateTaxonomy = ajv.compile(taxonomySchema);
const validateLoopConfig = ajv.compile(loopConfigSchema);

describe('Loop configuration', () => {
    it('taxonomy.json validates against schema', () => {
        const valid = validateTaxonomy(taxonomy);
        if (!valid) {
            console.error('Taxonomy validation errors:', validateTaxonomy.errors);
        }
        expect(valid).toBe(true);
    });

    it('loop.config.json validates against schema', () => {
        const valid = validateLoopConfig(loopConfig);
        if (!valid) {
            console.error('LoopConfig validation errors:', validateLoopConfig.errors);
        }
        expect(valid).toBe(true);
    });

    it('taxonomy has all required axes', () => {
        const axes = taxonomy.axes;
        expect(axes.socialForm).toBeDefined();
        expect(axes.topology).toBeDefined();
        expect(axes.exchange).toBeDefined();
        expect(axes.stakes).toBeDefined();
        expect(axes.temporality).toBeDefined();
        expect(axes.heterogeneity).toBeDefined();
    });

    it('taxonomy has all 6 modifiers', () => {
        const modifiers = taxonomy.modifiers;
        expect(modifiers.scale).toBeDefined();
        expect(modifiers.trust).toBeDefined();
        expect(modifiers.ostromGovernance).toBeDefined();
        expect(modifiers.powerAsymmetry).toBeDefined();
        expect(modifiers.formality).toBeDefined();
        expect(modifiers.dignityFaceHonour).toBeDefined();
    });

    it('taxonomy has 24 universals', () => {
        expect(taxonomy.universals).toHaveLength(24);
    });

    it('loop.config.json has all required sections', () => {
        expect(loopConfig.discovery).toBeDefined();
        expect(loopConfig.prioritization).toBeDefined();
        expect(loopConfig.synthesis).toBeDefined();
        expect(loopConfig.evaluation).toBeDefined();
        expect(loopConfig.adoption).toBeDefined();
        expect(loopConfig.reproducibility).toBeDefined();
        expect(loopConfig.privacy).toBeDefined();
        expect(loopConfig.artifacts).toBeDefined();
    });

    it('loop.config.json synthesis has all 4 tiers', () => {
        const tiers = loopConfig.synthesis.tiers;
        expect(tiers.T1).toBeDefined();
        expect(tiers.T2).toBeDefined();
        expect(tiers.T3).toBeDefined();
        expect(tiers.T4).toBeDefined();
    });

    it('loop.config.json evaluation has 6 tasks defined', () => {
        expect(loopConfig.evaluation.tasks).toHaveLength(6);
    });
});